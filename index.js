function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compiling shader", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Error linking program", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function main() {
    // Make body take up full screen
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    // Create dragging canvas
    const draggingCanvas = document.createElement("canvas");
    draggingCanvas.width = 512;
    draggingCanvas.height = 512;
    document.body.appendChild(draggingCanvas);

    const draggingCanvasContext = draggingCanvas.getContext("2d");

    // Create image
    const image = new Image();
    image.style.userSelect = "none";
    image.draggable = false;
    

    // Add 2d sliders to image
    const sliders = [];

    for (let i = 0; i < 7; i++) {
        const slider = document.createElement("div");
        slider.style.position = "absolute";
        slider.style.background = "#99999999";
        slider.style.borderRadius = "50%";
        slider.style.width = "10px";
        slider.style.height = "10px";
        slider.style.left = "30px";
        document.body.appendChild(slider);
        slider.lines = [];

        slider.onmousedown = (e) => {
            dragging = slider;
        };

        sliders.push(slider);
    }

    let dragging = null;

    document.body.onmousemove = (e) => {
        if (dragging) {
            const clientCenterX = e.clientX;
            const clientCenterY = e.clientY;

            const imageTopLeftX = image.offsetLeft;
            const imageTopLeftY = image.offsetTop;

            const posInImageX = clientCenterX - imageTopLeftX;
            const posInImageY = clientCenterY - imageTopLeftY;

            dragging.posInImageXPercent = posInImageX / image.width;
            dragging.posInImageYPercent = posInImageY / image.height;

            const clampedClientCenterX = Math.max(imageTopLeftX, Math.min(imageTopLeftX + image.width, clientCenterX));
            const clampedClientCenterY = Math.max(imageTopLeftY, Math.min(imageTopLeftY + image.height, clientCenterY));

            dragging.style.left = clampedClientCenterX - 5 + "px";
            dragging.style.top = clampedClientCenterY - 5 + "px";

            render();
        }
    };

    document.body.onmouseup = (e) => {
        dragging = null;
    };

    // Create canvas
    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = 512;
    renderCanvas.height = 512;
    document.body.appendChild(renderCanvas);

    // Create upload button
    const uploadButton = document.createElement("input");
    uploadButton.type = "file";
    uploadButton.accept = "image/*";
    uploadButton.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
    document.body.appendChild(uploadButton);

    // Setup WebGL
    const gl = renderCanvas.getContext("webgl");

    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    // Setup shaders
    const vertexShaderSource = `
    attribute vec4 aPos;
    attribute vec2 aTexCoord;

    uniform mat4 uModelMat;
    uniform mat4 uProjMat;

    varying vec2 vTexCoord;

    void main(void) {
      gl_Position = uProjMat * uModelMat * aPos;
      vTexCoord = aTexCoord;
    }
    `;

    const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D uSampler;

    varying vec2 vTexCoord;

    void main(void) {
        gl_FragColor = texture2D(uSampler, vTexCoord);
    }
    `;

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);

    const programInfo = {
        attribLocations: {
            aPos: gl.getAttribLocation(program, "aPos"),
            aTexCoord: gl.getAttribLocation(program, "aTexCoord"),
        },
        uniformLocations: {
            uModelMat: gl.getUniformLocation(program, "uModelMat"),
            uProjMat: gl.getUniformLocation(program, "uProjMat"),
            uSampler: gl.getUniformLocation(program, "uSampler"),
        },
    };

    // Setup buffers
    /* Cube is as follows:
     *           5
     *       #       # 
     *   2       y+      6(y+)/7(x+)
     *   #   #       #   #
     *   #       3       #
     *   #   z+  #   x+  #
     *   0       #       4
     *       #   #   # 
     *           1
     * 
     * which unrolled is:
     *   
     *  *--> x
     *  |
     *  y   5---6
     *      |   |
     *      2---3---7
     *      |   |   |
     *      0---1---4
     */

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0, 1.0, // 0
        1.0, -1.0, 1.0, // 1
        -1.0, 1.0, 1.0, // 2
        1.0, 1.0, 1.0, // 3
        1.0, -1.0, -1.0, // 4
        -1.0, 1.0, -1.0, // 5
        1.0, 1.0, -1.0, // 6
        1.0, 1.0, -1.0, // 7
    ]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0, // 0
        0.5, 1.0, // 1
        0.0, 0.5, // 2
        0.5, 0.5, // 3
        1.0, 1.0, // 4
        0.0, 0.0, // 5
        0.5, 0.0, // 6
        1.0, 0.5, // 7
    ]), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
        0, 2, 3, 0, 3, 1, // x+
        2, 5, 6, 2, 6, 3, // y+
        1, 3, 7, 1, 7, 4, // z+
    ]), gl.STATIC_DRAW);

    // Load texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Upload the image into the texture.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel
    );

    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        render();
    };
    image.src = "placeholder.png";

    // Create projection matrix
    const fieldOfView = (5 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projMat = mat4.create();
    mat4.perspective(projMat, fieldOfView, aspect, zNear, zFar);

    // Create model matrix
    const modelMat = mat4.create();
    mat4.translate(modelMat, modelMat, [0.0, 0.0, -50.0]);
    mat4.rotate(modelMat, modelMat, (45 * Math.PI) / 180, [1.0, 0.0, 0.0]);
    mat4.rotate(modelMat, modelMat, (-45 * Math.PI) / 180, [0.0, 1.0, 0.0]);

    // Draw the scene
    function render() {
        // Draw dragging canvas
        draggingCanvasContext.clearRect(0, 0, draggingCanvas.width, draggingCanvas.height);
        draggingCanvasContext.drawImage(image, 0, 0, draggingCanvas.width, draggingCanvas.height);

        // Draw line between sliders
        const sliderLinePairs = [
            [0, 1],
        ];

        for (const [index1, index2] of sliderLinePairs) {
            const slider1 = sliders[index1];
            const slider2 = sliders[index2];

            const x1 = slider1.posInImageXPercent * draggingCanvas.width;
            const y1 = slider1.posInImageYPercent * draggingCanvas.height;

            const x2 = slider2.posInImageXPercent * draggingCanvas.width;
            const y2 = slider2.posInImageYPercent * draggingCanvas.height;

            draggingCanvasContext.beginPath();
            draggingCanvasContext.moveTo(x1, y1);
            draggingCanvasContext.lineTo(x2, y2);
            draggingCanvasContext.strokeStyle = "#99999999";
            draggingCanvasContext.lineWidth = 2;
            draggingCanvasContext.stroke();
        }

        // Render cube
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.aPos);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.aTexCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMat, false, modelMat);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjMat, false, projMat);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
    }

    render();
}

main();