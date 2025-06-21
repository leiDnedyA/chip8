// const fileInput = document.getElementById('fileInput');
const TOTAL_BYTES = 4096

const memory = new Uint8Array(TOTAL_BYTES);
const stack = new Uint16Array(16);
const registers = new Uint8Array(16);
let iRegister = 0;
let delayRegister = 0;
let audioRegister = 0;
let programCounter = 0x200;
let stackPointer = 0;

const keysDown = {
  0x0: false,
  0x1: false,
  0x2: false,
  0x3: false,
  0x4: false,
  0x5: false,
  0x6: false,
  0x7: false,
  0x8: false,
  0x9: false,
  0xA: false,
  0xB: false,
  0xC: false,
  0xD: false,
  0xE: false,
  0xF: false,
};

let killed = false;

/*
 * Output comparable to `hexdump -C <file>.c8`
 * */
function hexDump() {
  for (let i = 0; i < TOTAL_BYTES; i++) {
    let n = 0;
    const byte = memory[i];
    for (let j = 0; j < 8; j++) {
      n |= byte[j] << j;
    }
    console.log(n.toString(16));
  }
}

function loadRomIntoMemory(dataView) {
  const byteLength = dataView.byteLength;
  for (let i = 0; i < byteLength; i++) {
    const instruction = dataView.getUint8(i);
    memory[i + 0x200] = instruction;
  }
  // hexDump();
}

function setIRegisterValue(byte) {
  iRegister = byte;
}

function getIRegisterValueInt() {
  return iRegister;
}

function setDelayTimer(byte) {
  delayRegister = byte;
}

function getDelayTimerValue() {
  return delayRegister;
}

function setMemoryValue(addr, byte) {
  memory[addr] = byte;
}

function getMemoryValue(addr) {
  return memory[addr];
}

function setStackValue(addr, value) {
  stack[addr] = value;
}

function getStackValue(addr) {
  return stack[addr];
}

function getRegisterValue(x) {
  return registers[x]
}

function setRegisterValue(x, byte) {
  registers[x] = byte;
}

function loadHexDigitSprites() {
  const fontSprites = [
    // 0
    0xF0, 0x90, 0x90, 0x90, 0xF0,
    // 1
    0x20, 0x60, 0x20, 0x20, 0x70,
    // 2
    0xF0, 0x10, 0xF0, 0x80, 0xF0,
    // 3
    0xF0, 0x10, 0xF0, 0x10, 0xF0,
    // 4
    0x90, 0x90, 0xF0, 0x10, 0x10,
    // 5
    0xF0, 0x80, 0xF0, 0x10, 0xF0,
    // 6
    0xF0, 0x80, 0xF0, 0x90, 0xF0,
    // 7
    0xF0, 0x10, 0x20, 0x40, 0x40,
    // 8
    0xF0, 0x90, 0xF0, 0x90, 0xF0,
    // 9
    0xF0, 0x90, 0xF0, 0x10, 0xF0,
    // A
    0xF0, 0x90, 0xF0, 0x90, 0x90,
    // B
    0xE0, 0x90, 0xE0, 0x90, 0xE0,
    // C
    0xF0, 0x80, 0x80, 0x80, 0xF0,
    // D
    0xE0, 0x90, 0x90, 0x90, 0xE0,
    // E
    0xF0, 0x80, 0xF0, 0x80, 0xF0,
    // F
    0xF0, 0x80, 0xF0, 0x80, 0x80,
  ];

  // Write each byte into memory starting at address 0x000
  for (let i = 0; i < fontSprites.length; i++) {
    setMemoryValue(i, fontSprites[i]);
  }
}

const keyboardToHardwareKeys = {
  '1': 0x1,
  '2': 0x2,
  '3': 0x3,
  '4': 0xC,
  'q': 0x4,
  'w': 0x5,
  'e': 0x6,
  'r': 0xD,
  'a': 0x7,
  's': 0x8,
  'd': 0x9,
  'f': 0xE,
  'z': 0xA,
  'x': 0x0,
  'c': 0xB,
  'v': 0xF
}

function keyDownCallback(e) {
  keysDown[keyboardToHardwareKeys[e.key.toLowerCase()]] = true;
}

function keyUpCallback(e) {
  keysDown[keyboardToHardwareKeys[e.key.toLowerCase()]] = false;
}

async function boot() {
  loadHexDigitSprites();

  const delayTimerInterval = setInterval(() => {
    if (delayRegister > 0) {
      delayRegister -= 1;
    }
  }, 1000 / 60); // 60 hz

  window.addEventListener('keydown', keyDownCallback);
  window.addEventListener('keyup', keyUpCallback);

  while (!killed) {
    const opcode = (getMemoryValue(programCounter) << 8) | getMemoryValue(programCounter + 1);

    // Nibbles
    const n1 = (opcode & 0xF000) >> 12;
    const n2 = (opcode & 0x0F00) >> 8;
    const n3 = (opcode & 0x00F0) >> 4;
    const n4 = (opcode & 0x000F);

    // console.log(n1.toString(16), n2.toString(16), n3.toString(16), n4.toString(16))

    let autoIncrement = true;

    switch (n1) {
      case 0x0: {
        const fullInstruction = n1 << 12 | n2 << 8 | n3 << 4 | n4;
        if (fullInstruction === 0x00E0) {
          clearScreen();
          break;
        } else if (fullInstruction === 0x00EE) {
          programCounter = getStackValue(stackPointer);
          stackPointer -= 1;
          autoIncrement = false;
          break;
        }
        console.log('UNHANDLED CASE');
        break;
      }
      case 0x1: {
        programCounter = n2 << 8 | n3 << 4 | n4;
        autoIncrement = false;
        break;
      }
      case 0x2: {
        stackPointer += 1;
        setStackValue(stackPointer, programCounter + 2);
        programCounter = n2 << 8 | n3 << 4 | n4;
        autoIncrement = false;
        break;
      }
      case 0x3: {
        const x = n2;
        const kk = n3 << 4 | n4;
        const Vx = getRegisterValue(x);
        if (kk === Vx) {
          programCounter += 2;
        }
        break;
      }
      case 0x4: {
        const x = n2;
        const kk = n3 << 4 | n4;
        const Vx = getRegisterValue(x);
        if (Vx !== kk) {
          programCounter += 2;
        }
        break;
      }
      case 0x6: {
        const x = n2;
        const kk = n3 << 4 | n4;
        setRegisterValue(x, kk);
        break;
      }
      case 0x5: {
        if (n4 !== 0x0) {
          console.log('INVALID INSTRUCTION!');
          break;
        }
        const x = n2;
        const y = n3;
        const Vx = getRegisterValue(x);
        const Vy = getRegisterValue(y);
        if (Vx === Vy) {
          programCounter += 2;
        }
        break;
      }
      case 0x7: {
        const x = n2;
        const kk = n3 << 4 | n4;
        const Vx = getRegisterValue(x);
        setRegisterValue(x, (Vx + kk) & 0xFF);
        break;
      }
      case 0x8: {
        const x = n2;
        const y = n3;
        const Vx = getRegisterValue(x);
        const Vy = getRegisterValue(y);
        if (n4 === 0x0) {
          setRegisterValue(x, Vy);
          break;
        } else if (n4 === 0x1) {
          setRegisterValue(x, Vx | Vy);
          break;
        } else if (n4 === 0x2) {
          setRegisterValue(x, (Vx & Vy) & 0xFF);
          break;
        } else if (n4 === 0x3) {
          setRegisterValue(x, (Vx ^ Vy) & 0xFF);
          break;
        } else if (n4 === 0x4) {
          setRegisterValue(x, ((Vx + Vy) % 256) & 0xFF);
          setRegisterValue(0xF, Vx + Vy > 255 ? 1 : 0);
          break;
        } else if (n4 === 0x5) {
          setRegisterValue(x, ((Vx - Vy) % 256) & 0xFF);
          setRegisterValue(0xF, Vx > Vy ? 1 : 0);
          break;
        } else if (n4 === 0x6) {
          setRegisterValue(0xF, Vx & 1);
          setRegisterValue(x, Math.floor(Vx / 2));
          break;
        } else if (n4 === 0x7) {
          setRegisterValue(x, ((Vy - Vx) % 256) & 0xFF);
          setRegisterValue(0xF, Vy > Vx ? 1 : 0);
          break;
        } else if (n4 === 0xE) {
          setRegisterValue(x, (Vx << 1) % 256);
          if ((Vx >> 7) & 1) {
            setRegisterValue(0xF, 1);
          }
          break;
        }
        console.log('UNHANDLED CASE');
        break;
      }
      case 0x9: {
        if (n4 === 0x0) {
          const x = n2;
          const y = n3;
          const Vx = getRegisterValue(x);
          const Vy = getRegisterValue(y);
          if (Vx !== Vy) {
            programCounter += 2;
          }
          break;
        }
        console.log('UNHANDLED CASE');
        break;
      }
      case 0xA: {
        const nnn = n2 << 8 | n3 << 4 | n4;
        setIRegisterValue(nnn);
        break;
      }
      case 0xC: {
        const x = n2;
        const kk = n3 << 4 | n4;
        const rand = Math.floor(Math.random() * 256);
        setRegisterValue(x, kk & rand);
        break;
      }
      case 0xD: {
        const x = n2;
        const y = n3;
        const n = n4;
        const iRegisterValue = getIRegisterValueInt();
        const spriteBytes = memory.slice(iRegisterValue, iRegisterValue + n);
        renderSprite(spriteBytes, getRegisterValue(x), getRegisterValue(y));
        break;
      }
      case 0xE: {
        const n23 = n3 << 4 | n4;
        if (n23 === 0xA1) {
          const x = n2;
          const Vx = getRegisterValue(x);
          if (!keysDown[Vx]) {
            programCounter += 2;
          }
          break;
        }
        console.log('UNHANDLED CASE');
        break;
      }
      case 0xF: {
        const n34 = n3 << 4 | n4;
        const x = n2;
        const Vx = getRegisterValue(x);
        if (n34 === 0x18) {
          audioRegister = Vx;
          break;
        } else if (n34 === 0x1E) {
          setIRegisterValue(Vx + getIRegisterValueInt());
          break;
        } else if (n34 === 0x33) {
          const ones = Vx % 10;
          const tens = Math.floor(Vx / 10) % 10;
          const hundreds = Math.floor(Vx / 100) % 10;
          const iVal = getIRegisterValueInt();
          setMemoryValue(iVal, hundreds);
          setMemoryValue(iVal + 1, tens);
          setMemoryValue(iVal + 2, ones);
          break;
        } else if (n34 === 0x55) {
          for (let i = 0; i <= x; i++) {
            setMemoryValue(
              getIRegisterValueInt() + i,
              getRegisterValue(i)
            );
          }
          break;
        } else if (n34 === 0x65) {
          const x = n2;
          const iValue = getIRegisterValueInt();
          for (let i = 0; i <= x; i++) {
            const memValue = getMemoryValue(iValue + i);
            setRegisterValue(i, memValue);
          }
          break;
        } else if (n34 === 0x29) {
          setIRegisterValue(Vx * 5);
          break;
        } else if (n34 === 0x15) {
          setDelayTimer(Vx);
          break;
        } else if (n34 === 0x07) {
          setRegisterValue(n2, getDelayTimerValue());
          break;
        }
        console.log('UNHANDLED CASE');
        break;
      }
      default: {
        console.log('UNHANDLED INSTRUCTION');
      }
    }

    if (autoIncrement) {
      programCounter += 2;
    }

    render();
    await new Promise(res => { setTimeout(() => { res() }, 1); });
  }

  clearInterval(delayTimerInterval);

  window.removeEventListener('keydown', keyDownCallback);
  window.removeEventListener('keyup', keyUpCallback);
}

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
let previousPixelGrid = [];

function clearScreen() {
  pixelGrid = Array.from({
    length: WIDTH
  }, () => Array(HEIGHT).fill(0));
  previousPixelGrid = Array.from({
    length: WIDTH
  }, () => Array(HEIGHT).fill(0));
}
clearScreen();

function getNthBit(byte, n) {
  return 1 & (byte >> n);
}

function renderSprite(spriteBytes, x, y) {
  let isCollision = 0;
  for (let i = 0; i < spriteBytes.length; i++) {
    for (let j = 0; j < 8; j++) {
      isCollision |= setPixelState(x + j, y + i, getNthBit(spriteBytes[i], 7 - j));
    }
  }
  setRegisterValue(0xF, isCollision ? 1 : 0);
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

function setPixelState(unwrappedX, unwrappedY, color) {
  const x = unwrappedX % WIDTH;
  const y = unwrappedY % HEIGHT;

  const currPixelValue = pixelGrid?.[x]?.[y];
  const newPixelValue = currPixelValue ^ color;

  const isCollision = (currPixelValue & color);
  pixelGrid[x][y] = newPixelValue;
  return isCollision ? 1 : 0;
}

/*
fileInput.addEventListener('change', (event) => {
const file = event.target.files[0];
const reader = new FileReader();
reader.onload = (e) => {
const arrayBuffer = e.target.result;
const dataView = new DataView(arrayBuffer);
loadRomIntoMemory(dataView);
boot();
};
reader.readAsArrayBuffer(file);
});
*/

window.onload = async () => {
  const killButton = document.getElementById('killButton');
  killButton.addEventListener('click', () => { killed = true; })

  const response = await fetch('./pong.ch8')
  const blob = await response.blob();
  const dataView = new DataView(await blob.arrayBuffer());
  loadRomIntoMemory(dataView);
  boot();
}
