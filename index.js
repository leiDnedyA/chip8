const fileInput = document.getElementById('fileInput');
const TOTAL_BYTES = 4096

const memory = Array.from(
  { length: TOTAL_BYTES },
  () => Array(8).fill(0)
);
const stack = Array.from(
  { length: 16 },
  () => Array(16).fill(0)
);
const registers = Array.from(
  { length: 16 },
  () => Array(8).fill(0)
);
const iRegister = Array(16).fill(0);
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
    for (let j = 0; j < 8; j++) {
      memory[i + 0x200][j] = 1 & (instruction >> j);
    }
  }
  // hexDump();
}

function setIRegisterValue(byte) {
  for (let i = 0; i < 16; i++) {
    iRegister[i] = 1 & (byte >> i);
  }
}

function getIRegisterValueInt() {
  let n = 0;
  // console.log(iRegister)
  for (let i = 0; i < 16; i++) {
    // console.log(iRegister[i])
    n |= (iRegister[i] << i);
  }
  // console.log(n.toString(2))
  return n;
}

function setDelayTimer(byte) {
  delayRegister = byte;
}

function getDelayTimerValue() {
  return delayRegister;
}

function setMemoryValue(addr, byte) {
  for (let i = 0; i < 8; i++) {
    memory[addr][i] = 1 & (byte >> (i));
  }
}

function getMemoryValue(addr) {
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n |= (memory[addr][i] << i);
  }
  return n;
}

function setStackValue(addr, value) {
  for (let i = 0; i < 16; i++) {
    stack[addr][i] = 1 & (value >> (i));
  }
}

function getStackValue(addr) {
  let n = 0;
  for (let i = 0; i < 16; i++) {
    n |= (stack[addr][i] << i);
  }
  return n;
}

function getRegisterValue(Vx) {
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n |= (registers[Vx][i] << i);
  }
  return n;
}

function setRegisterValue(Vx, byte) {
  for (let i = 0; i < 8; i++) {
    registers[Vx][i] = 1 & (byte << i);
  }
  // console.log(registers[Vx], byte.toString(2));
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
    const b1 = memory[programCounter];
    const b2 = memory[programCounter + 1];

    // Nibbles
    const n1 = b1[4] | (b1[5] << 1) | (b1[6] << 2) | (b1[7] << 3);
    const n2 = b1[0] | (b1[1] << 1) | (b1[2] << 2) | (b1[3] << 3);
    const n3 = b2[4] | (b2[5] << 1) | (b2[6] << 2) | (b2[7] << 3);
    const n4 = b2[0] | (b2[1] << 1) | (b2[2] << 2) | (b2[3] << 3);

    console.log(n1.toString(16), n2.toString(16), n3.toString(16), n4.toString(16))

    let autoIncrement = true;

    switch (n1) {
      case 0x0: {
        const fullInstruction = n1 << 12 | n2 << 8 | n3 << 4 | n4;
        if (fullInstruction === 0x00EE) {
          programCounter = getStackValue(stackPointer);
          stackPointer -= 1;
          autoIncrement = false;
          break;
        }
      }
      case 0x1: {
        programCounter = n3 << 8 | n2 << 4 | n1;
        break;
      }
      case 0x2: {
        programCounter += 2;
        setStackValue(stackPointer, programCounter);
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
        kk = n3 << 4 | n4;
        setRegisterValue(x, kk);
        break;
      }
      case 0x7: {
        const Vx = n2;
        const kk = n3 << 4 | n4;
        const currVxValue = getRegisterValue(Vx);
        setRegisterValue(Vx, currVxValue + kk);
        break;
      }
      case 0x8: {
        if (n4 === 0x2) {
          const x = n2;
          const y = n3;
          const Vx = getRegisterValue(x);
          const Vy = getRegisterValue(y);
          setRegisterValue(x, Vx & Vy);
          break;
        }
      }
      case 0x9: {
        if (n4 === 0x0) {
          const x = n2;
          const y = n2;
          const Vx = getRegisterValue(x);
          const Vy = getRegisterValue(y);
          if (Vx != Vy) {
            programCounter += 2;
          }
          break;
        }
      }
      case 0xA: {
        const nnn = n2 << 8 | n3 << 4 | n4;
        setIRegisterValue(nnn);
        break;
      }
      case 0xC: {
        const x = n2;
        const kk = n3 << 4 | n4;
        const rand = Math.round(Math.random() * Math.pow(2, 8));
        setRegisterValue(x, kk & rand);
        break;
      }
      case 0xD: {
        console.log('writing to screen')
        const iRegisterValue = getIRegisterValueInt();
        console.log(iRegisterValue.toString(16));
        const spriteBytes = memory.slice(iRegisterValue, iRegisterValue + n4);
        console.log(spriteBytes);
        renderSprite(spriteBytes, n2, n3);
        break;
      }
      case 0xE: {
        const n23 = n3 << 4 | n4;
        if (n23 === 0xA1) {
          const x = n2;
          if (!keysDown[x]) {
            programCounter += 2;
          }
          break;
        }
      }
      case 0xF: {
        const n34 = n3 << 4 | n4;
        if (n34 === 0x33) {
          const ones = n2 & 1;
          const tens = Math.floor(n2 / 10) % 10;
          const hundreds = Math.floor(n2 / 100) % 100;
          const iVal = getIRegisterValueInt();
          setMemoryValue(iVal, ones);
          setMemoryValue(iVal + 1, tens);
          setMemoryValue(iVal + 2, hundreds);
          break;
        } else if (n34 === 0x65) {
          const Vx = n2;
          const iValue = getIRegisterValueInt();
          for (let i = 0; i <= Vx; i++) {
            const memValue = getMemoryValue(iValue + i);
            setRegisterValue(i, memValue);
          }
          break;
        } else if (n34 === 0x29) {
          const Vx = n2;
          setIRegisterValue(Vx * 5);
          break;
        } else if (n34 === 0x15) {
          setDelayTimer(n2);
          break;
        } else if (n34 === 0x07) {
          setRegisterValue(n2, getDelayTimerValue);
          break;
        }
      }
      default: {
        console.log('UNHANDLED INSTRUCTION');
      }
    }

    if (autoIncrement) {
      programCounter += 2;
    }

    await new Promise(res => { setTimeout(() => { res() }, 100); });
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
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'black';
ctx.fillRect(0, 0, WIDTH * PIXEL_SIDE_LENGTH, HEIGHT * PIXEL_SIDE_LENGTH);

function renderSprite(spriteBytes, x, y) {
  for (let i = 0; i < spriteBytes.length; i++) {
    for (let j = 0; j < 8; j++) {
      setPixelState(x + i, y + j, spriteBytes[i][j]);
    }
  }
}

function setPixelState(x, y, color) {
  ctx.fillStyle = color ? 'white' : 'black';
  ctx.fillRect(x * PIXEL_SIDE_LENGTH, y * PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH);
}

// For testing: identity matrix
// for (let i = 0; i < 20; i++) {
//   setPixelState(i, i, 0);
// }


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

window.onload = () => {
  const killButton = document.getElementById('killButton');
  killButton.addEventListener('click', () => { killed = true; })
}
