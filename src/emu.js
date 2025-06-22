import { clearScreen, renderSprite, render } from './render.js';

const TOTAL_BYTES = 4096

let memory = new Uint8Array(TOTAL_BYTES);
let stack = new Uint16Array(16);
let registers = new Uint8Array(16);
let iRegister = 0;
let delayRegister = 0;
let audioRegister = 0;
let programCounter = 0x200;
let stackPointer = 0;

let keysDown = {
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
let triggerKill = false;

async function kill() {
  triggerKill = true;
}

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

async function boot(romDataView) {
  killed = false;
  console.log('booting...')
  clearScreen();
  for (let key of Object.keys(keysDown)) {
    keysDown[key] = false;
  }
  memory = new Uint8Array(TOTAL_BYTES);
  stack = new Uint16Array(16);
  registers = new Uint8Array(16);
  iRegister = 0;
  delayRegister = 0;
  audioRegister = 0;
  programCounter = 0x200;
  stackPointer = 0;
  loadHexDigitSprites();
  loadRomIntoMemory(romDataView);

  const delayTimerInterval = setInterval(() => {
    if (delayRegister > 0) {
      delayRegister -= 1;
    }
  }, 1000 / 60); // 60 hz

  window.addEventListener('keydown', keyDownCallback);
  window.addEventListener('keyup', keyUpCallback);

  let i = 0;
  while (!triggerKill) {
    i++;
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
        renderSprite(spriteBytes, getRegisterValue(x), getRegisterValue(y),
          function(isCollision) {
            setRegisterValue(0xF, isCollision ? 1 : 0);
          }
        );
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
    if (i % 3 === 0) {
      await new Promise(res => setTimeout(() => res(), 1));
    }
  }
  triggerKill = false;
  killed = true;

  clearInterval(delayTimerInterval);

  window.removeEventListener('keydown', keyDownCallback);
  window.removeEventListener('keyup', keyUpCallback);
}

export { boot, kill, killed }
