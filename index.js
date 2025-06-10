const fileInput = document.getElementById('fileInput');
const TOTAL_BYTES = 4096

const memory = Array.from(
  { length: TOTAL_BYTES },
  () => Array(8).fill(0)
);

const registers = Array.from(
  { length: 16 },
  () => Array(8).fill(0)
);

const iRegister = Array(16).fill(0);
const delayRegister = Array(8).fill(0);
const audioRegister = Array(8).fill(0);

let programCounter = 0;

function loadRomIntoMemory(dataView) {
  const byteLength = dataView.byteLength;
  for (let i = 0; i < byteLength; i++) {
    const instruction = dataView.getUint8(i);
    for (let j = 0; j < 8; j++) {
      memory[i][j] = 1 & (instruction >> j);
    }
    // console.log(i, instruction.toString(2), memory[i])
  }
}

function setRegisterValue(Vx, byte) {
  for (let i = 0; i < 8; i++) {
    registers[Vx][i] = 1 & (byte << i);
  }
  console.log(registers[Vx], byte.toString(2));
}

async function boot() {
  while (true) {
    const b1 = memory[programCounter * 2];
    const b2 = memory[programCounter * 2 + 1];
    console.log(b1, b2);

    // Nibbles
    const n1 = b1[0] | (b1[1] << 1) | (b1[2] << 2) | (b1[3] << 3);
    const n2 = b1[4] | (b1[5] << 1) | (b1[6] << 2) | (b1[7] << 3);
    const n3 = b2[0] | (b2[1] << 1) | (b2[2] << 2) | (b2[3] << 3);
    const n4 = b2[4] | (b2[5] << 1) | (b2[6] << 2) | (b2[7] << 3);

    console.log(n1.toString(2), n2.toString(2), n3.toString(2), n4.toString(2))

    switch (n1) {
      case 0x6: {
        const x = n2;
        kk = n3 << 4 & n4;
        setRegisterValue(x, kk);
      }
    }

    await new Promise(res => { setTimeout(() => { res() }, 50); });
  }
}

const PIXEL_SIDE_LENGTH = 18;
const WIDTH = 64;
const HEIGHT = 32;

const canvas = document.querySelector('#canvas');
canvas.width = WIDTH * PIXEL_SIDE_LENGTH;
canvas.height = HEIGHT * PIXEL_SIDE_LENGTH;
const ctx = canvas.getContext('2d');

function setPixelState(x, y, color) {
  ctx.fillStyle = color ? 'white' : 'black';
  ctx.fillRect(x * PIXEL_SIDE_LENGTH, y * PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH, PIXEL_SIDE_LENGTH);
}

for (let i = 0; i < 20; i++) {
  setPixelState(i, i, 0);
}


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


