const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'apps', 'mobile', 'assets');
fs.mkdirSync(outDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function makePng(size, background, mark, scale) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = background[0];
    pixels[i * 4 + 1] = background[1];
    pixels[i * 4 + 2] = background[2];
    pixels[i * 4 + 3] = background[3];
  }

  const map = (n) => size / 2 + (n - 256) * (size / 512) * scale;
  const color = mark;
  function paint(x, y, radius) {
    const left = Math.max(0, Math.floor(x - radius - 1));
    const right = Math.min(size - 1, Math.ceil(x + radius + 1));
    const top = Math.max(0, Math.floor(y - radius - 1));
    const bottom = Math.min(size - 1, Math.ceil(y + radius + 1));
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        const distance = Math.hypot(px + 0.5 - x, py + 0.5 - y);
        const coverage = Math.max(0, Math.min(1, radius + 0.6 - distance));
        if (!coverage) continue;
        const index = (py * size + px) * 4;
        const alpha = (color[3] / 255) * coverage;
        const priorAlpha = pixels[index + 3] / 255;
        const nextAlpha = alpha + priorAlpha * (1 - alpha);
        if (!nextAlpha) continue;
        pixels[index] = Math.round((color[0] * alpha + pixels[index] * priorAlpha * (1 - alpha)) / nextAlpha);
        pixels[index + 1] = Math.round((color[1] * alpha + pixels[index + 1] * priorAlpha * (1 - alpha)) / nextAlpha);
        pixels[index + 2] = Math.round((color[2] * alpha + pixels[index + 2] * priorAlpha * (1 - alpha)) / nextAlpha);
        pixels[index + 3] = Math.round(nextAlpha * 255);
      }
    }
  }
  function line(x1, y1, x2, y2, thickness) {
    const ax = map(x1), ay = map(y1), bx = map(x2), by = map(y2);
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 1.25);
    const radius = (thickness * size / 512 * scale) / 2;
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      paint(ax + (bx - ax) * t, ay + (by - ay) * t, radius);
    }
  }
  function ring(cx, cy, radius, thickness) {
    const centerX = map(cx), centerY = map(cy);
    const outer = radius * size / 512 * scale;
    const inner = outer - thickness * size / 512 * scale;
    const bound = outer + 1;
    for (let y = Math.max(0, Math.floor(centerY - bound)); y <= Math.min(size - 1, Math.ceil(centerY + bound)); y++) {
      for (let x = Math.max(0, Math.floor(centerX - bound)); x <= Math.min(size - 1, Math.ceil(centerX + bound)); x++) {
        const d = Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY);
        const coverage = Math.max(0, Math.min(1, Math.min(outer + 0.6 - d, d - inner + 0.6)));
        if (!coverage) continue;
        paint(x + 0.5, y + 0.5, 0.5 * coverage);
      }
    }
  }

  // A clean scissors mark: twin blades, central pivot and rounded handles.
  line(158, 148, 254, 253, 24);
  line(354, 146, 258, 253, 24);
  line(252, 249, 155, 354, 24);
  line(260, 249, 357, 354, 24);
  ring(124, 385, 48, 22);
  ring(388, 385, 48, 22);
  paint(map(256), map(251), size / 512 * 15 * scale);

  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (rowBytes + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const deepGreen = [15, 91, 62, 255];
const white = [255, 255, 255, 255];
const transparent = [0, 0, 0, 0];
const softWhite = [246, 248, 247, 255];
fs.writeFileSync(path.join(outDir, 'icon.png'), makePng(512, deepGreen, white, 1));
fs.writeFileSync(path.join(outDir, 'adaptive-icon.png'), makePng(512, transparent, white, 0.78));
fs.writeFileSync(path.join(outDir, 'splash.png'), makePng(1024, softWhite, deepGreen, 0.38));
fs.writeFileSync(path.join(outDir, 'favicon.png'), makePng(64, deepGreen, white, 1));
console.log('SalonSlot brand assets generated.');
