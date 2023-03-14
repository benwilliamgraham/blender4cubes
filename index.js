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
    const renderCanvas = document.querySelector("#render");

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
        gl_FragColor = texture2D(uSampler, vTexCoord) + vec4(1.0, 0.0, 0.0, 1.0);
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
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        // Front face
        -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
    ]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        // Front face
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0,

        // Back face
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

        // Top face
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,

        // Bottom face
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,

        // Right face
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

        // Left face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    ]), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
        0,
        1,
        2,
        0,
        2,
        3, // front
        4,
        5,
        6,
        4,
        6,
        7, // back
        8,
        9,
        10,
        8,
        10,
        11, // top
        12,
        13,
        14,
        12,
        14,
        15, // bottom
        16,
        17,
        18,
        16,
        18,
        19, // right
        20,
        21,
        22,
        20,
        22,
        23, // left
    ]), gl.STATIC_DRAW);

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
    mat4.rotate(modelMat, modelMat, (45 * Math.PI) / 180, [0.0, 1.0, 0.0]);

    // Draw the scene
    function render() {
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
        // gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    render();
}

main();