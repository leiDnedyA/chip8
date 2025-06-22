import { boot, kill, killed } from './src/emu.js';

let romDataView = null;

async function loadRomFromUrl(url) {
  const response = await fetch(url)
  const blob = await response.blob();
  romDataView = new DataView(await blob.arrayBuffer());
  boot(romDataView);
}

window.onload = async function() {
  const killStartButton = document.getElementById('killStartButton');
  killStartButton.addEventListener('click', async function() {
    if (killed) await boot(romDataView); // restart
    else kill();
    killStartButton.innerText = killed ? 'start' : 'kill';
  })

  const romDropdown = document.getElementById('gameDropdown');
  romDropdown.addEventListener('change', async function(e) {
    await kill();
    loadRomFromUrl(e.target.value).then(async function() {
      await boot(romDataView);
    })
  })

  await loadRomFromUrl('./PONG2');
}
