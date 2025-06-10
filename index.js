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
const delayRegister = Array(8).fill(0);
const audioRegister = Array(8).fill(0);

let programCounter = 0x200;
let stackPointer = 0;

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
  // console.log(iRegister, byte.toString(2));
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

function setMemoryValue(addr, byte) {
  console.log({ addr, byte });
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

function setRegisterValue(Vx, byte) {
  for (let i = 0; i < 8; i++) {
    registers[Vx][i] = 1 & (byte << i);
  }
  // console.log(registers[Vx], byte.toString(2));
}

async function boot() {
  while (true) {
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
          console.log(programCounter.toString(16))
        }
        break;
      }
      case 0x2: {
        programCounter += 2;
        console.log({ programCounter })
        setStackValue(stackPointer, programCounter);
        programCounter = n2 << 8 | n3 << 4 | n4;
        console.log({ programCounter })
        autoIncrement = false;
        break;
      }
      case 0x6: {
        const x = n2;
        kk = n3 << 4 | n4;
        setRegisterValue(x, kk);
        break;
      }
      case 0xA: {
        const nnn = n2 << 8 | n3 << 4 | n4;
        setIRegisterValue(nnn);
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
    }

    if (autoIncrement) {
      programCounter += 2;
    }

    await new Promise(res => { setTimeout(() => { res() }, 100); });
  }
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
  console.log(color ? 'white' : 'black')
  ctx.fillRect(x * PIXEL_SIDE_LENGTH, y * PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH);
}

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


