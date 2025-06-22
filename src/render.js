
const PIXEL_SIDE_LENGTH = 18;
const WIDTH = 64;
const HEIGHT = 32;

const canvas = document.querySelector('#canvas');
canvas.width = WIDTH * PIXEL_SIDE_LENGTH;
canvas.height = HEIGHT * PIXEL_SIDE_LENGTH;

/*--------------------- <webgl stuff> ----------------------*/
const gl = canvas.getContext('webgl', {
  alpha: false,
  premultipliedAlpha: false
});

if (gl === null) {
  alert('Unable to initialize WebGL. Your browser or machine may not support it.');
}

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
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

const vertexShaderSource = `
attribute vec3 a_position;
uniform float u_pointSize;

varying vec4 clipPosition;

// from https://www.shadertoy.com/view/XtlSD7
vec2 CRTCurveUV(vec2 uv){
    uv = uv * 2.0;
    vec2 offset = abs( uv.yx ) / vec2( 6.0, 4.0 );
    uv = uv - uv * offset * offset * offset;
    uv = uv * 0.5;
    return uv;
}

void main() {
  float offset = a_position.z;
  gl_Position = vec4(
    (a_position.x / (${WIDTH}.0) - 0.5) * 2.0 + offset / 100.0,
    ((${HEIGHT}.0 - 1.0 - a_position.y) / ${HEIGHT}.0 - 0.5) * 2.0 + offset / 100.0,
    0.0, 1.0);
  gl_Position = vec4(CRTCurveUV(gl_Position.xy), gl_Position.z, gl_Position.w);
  gl_PointSize = u_pointSize;
  clipPosition = gl_Position;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec4 clipPosition;

float rand(vec2 co){
    return sin(dot(co, vec2(12.9898, 78.233))) / 8.0;
}

// from https://www.shadertoy.com/view/XtlSD7
vec2 CRTCurveUV(vec2 uv){
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs( uv.yx ) / vec2( 6.0, 4.0 );
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

void main() {

  vec2 uv = clipPosition.xy / vec2(${WIDTH}.0, ${HEIGHT}.0);

  float rand = rand(gl_PointCoord);
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  float alpha = smoothstep(0.5, 0.0, dist);
  float green = smoothstep(0.5, 0.0, rand);

  gl_FragColor = vec4((alpha + rand / 2.0) / rand, 0.5 * alpha, green, alpha);
}
`

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = createProgram(gl, vertexShader, fragmentShader);
const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const pointSizeLocation = gl.getUniformLocation(program, "u_pointSize");
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

gl.useProgram(program);
gl.enableVertexAttribArray(positionAttributeLocation);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

/*--------------------- </webgl stuff> ----------------------*/

let pixelGrid = [];

function setPixelState(unwrappedX, unwrappedY, color) {
  const x = unwrappedX % WIDTH;
  const y = unwrappedY % HEIGHT;

  const currPixelValue = pixelGrid?.[x]?.[y];
  const newPixelValue = currPixelValue ^ color;

  const isCollision = (currPixelValue & color);
  pixelGrid[x][y] = newPixelValue;
  return isCollision ? 1 : 0;
}

function clearScreen() {
  pixelGrid = Array.from({
    length: WIDTH
  }, () => Array(HEIGHT).fill(0));
}
clearScreen();

function getNthBit(byte, n) {
  return 1 & (byte >> n);
}

function renderSprite(spriteBytes, x, y, isCollisionCallback) {
  let isCollision = 0;
  for (let i = 0; i < spriteBytes.length; i++) {
    for (let j = 0; j < 8; j++) {
      isCollision |= setPixelState(x + j, y + i, getNthBit(spriteBytes[i], 7 - j));
    }
  }
  isCollisionCallback(isCollision)
}

function render() {
  const arr = [];
  for (let i = 0; i < WIDTH; i++) {
    for (let j = 0; j < HEIGHT; j++) {
      if (pixelGrid[i][j]) {
        arr.push(i);
        arr.push(j);
        arr.push(Math.random());
      }
    }
  }
  const buffer = new Float32Array(arr);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
  gl.uniform1f(pointSizeLocation, 80.0);
  var size = 3;
  var type = gl.FLOAT;
  var normalize = false;
  var stride = 0;
  var offset = 0;
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
  var primitiveType = gl.POINTS;
  var offset = 0;
  gl.drawArrays(primitiveType, offset, arr.length / size);
}

export {
  clearScreen,
  renderSprite,
  render
}
