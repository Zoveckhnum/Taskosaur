// Keep the supplied originals; derive only transparent-margin crops and icon sizes.
// Sources supplied by the owner:
// https://i.postimg.cc/9XwwSp94/favicon.png
// https://i.postimg.cc/cJtnfBdG/iqualitys-logo-vertical.png
// https://i.postimg.cc/JhHkj5RW/iqualitys-logo-horizontal.png
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const toIco = require('to-ico');
const root = path.join(__dirname, '../frontend/public');
const brand = path.join(root, 'brand');

async function main() {
  for (const variant of ['horizontal', 'vertical']) {
    const original = path.join(brand, `iqualitys-logo-${variant}.png`);
    const { data, info } = await sharp(original).trim().png().toBuffer({ resolveWithObject: true });
    await fs.writeFile(path.join(brand, `iqualitys-logo-${variant}-display.png`), data);
    console.log(`${variant}: ${info.width} x ${info.height}`);
  }
  const source = path.join(brand, 'iqualitys-favicon.png');
  const icons = new Map();
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const data = await sharp(source).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    icons.set(size, data);
    await fs.writeFile(path.join(brand, `iqualitys-favicon-${size}.png`), data);
  }
  await fs.writeFile(path.join(root, 'favicon.ico'), await toIco([icons.get(16), icons.get(32), icons.get(48)]));
  for (const [file, size] of [['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['apple-touch-icon.png', 180], ['android-chrome-192x192.png', 192], ['android-chrome-512x512.png', 512], ['taskosaur-logo.png', 512]]) {
    await fs.writeFile(path.join(root, file), icons.get(size));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Iqualitys PM</title><image width="512" height="512" href="data:image/png;base64,${icons.get(512).toString('base64')}"/></svg>\n`;
  // Legacy URLs also resolve to the new icon for existing bookmarks and clients.
  await fs.writeFile(path.join(root, 'favicon.svg'), svg);
  await fs.writeFile(path.join(root, 'taskosaur-logo.svg'), svg);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
