/* eslint no-console:0 consistent-return:0 */
"use strict";

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  //console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function main() {
  // Get A WebGL context
  var canvas = document.querySelector("#c");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  const canvasToDisplaySizeMap = new Map([[canvas, [900, 450]]]);

  function onResize(entries) {
    for (const entry of entries) {
      let width;
      let height;
      let dpr = window.devicePixelRatio;
      if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other 2 paths are an imperfect fallback
        // for browsers that don't provide anyway to do this
        console.log("resized by compositor");
        width = entry.devicePixelContentBoxSize[0].inlineSize;
        height = entry.devicePixelContentBoxSize[0].blockSize;
        dpr = 1; // it's already in width and height
      } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
          width = entry.contentBoxSize[0].inlineSize;
          height = entry.contentBoxSize[0].blockSize;
        } else {
          // legacy
          width = entry.contentBoxSize.inlineSize;
          height = entry.contentBoxSize.blockSize;
        }
      } else {
        // legacy
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }
      const displayWidth = Math.round(width * dpr);
      const displayHeight = Math.round(height * dpr);
      canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
      //console.log("canvas size set to", displayWidth, displayHeight);
    }
  }

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas, {box: 'content-box'});

  function resizeCanvasToDisplaySize(canvas) {
    // Get the size the browser is displaying the canvas in device pixels.
    const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);

    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;

    if (needResize) {
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }

    return needResize;
  }

  // Get the strings for our GLSL shaders
  var vertexShaderSource = document.querySelector("#vertex-shader-2d").text;
  var fragmentShaderSource = document.querySelector("#fragment-shader-2d").text;

  // create GLSL shaders, upload the GLSL source, compile the shaders
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  // Link the two shaders into a program
  var program = createProgram(gl, vertexShader, fragmentShader);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // Create a buffer and put three 2d clip space points in it
  var positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // draw a rectangle that covers the entire screen (window)
  var positions = [
      -1,-1,
       1, 1,
       1,-1,

      -1,-1,
      -1, 1,
       1, 1
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  var iTimeLocation = gl.getUniformLocation(program, "iTime");
  var iResolutionLocation = gl.getUniformLocation(program, "iResolution");

  // code above this line is initialization code.
  // code below this line is rendering code.

  requestAnimationFrame(drawScene);

  function drawScene(now)
  {
    //webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    if (resizeCanvasToDisplaySize(gl.canvas)) {
      //console.log("resize time:", now * 0.001, "   resized to:", canvas.width, canvas.height);
    };

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // give current time to shader
    gl.uniform1f(iTimeLocation, now * 0.001);

    // give current resolution to shader
    gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);

    // draw
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);

    requestAnimationFrame(drawScene);
  }
}

main();

