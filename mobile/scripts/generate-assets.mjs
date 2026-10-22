/**
 * Generates the Android launcher assets (icon, adaptive icon and the
 * notification silhouette) without any native image dependency.
 *
 * Usage: node scripts/generate-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, '..', 'assets');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(size) {
  return Buffer.alloc(size * size * 4, 0);
}

function setPixel(canvas, size, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const offset = (y * size + x) * 4;
  const alpha = a / 255;
  const existingAlpha = canvas[offset + 3] / 255;
  const outAlpha = alpha + existingAlpha * (1 - alpha);
  if (outAlpha === 0) {
    return;
  }
  canvas[offset] = Math.round((r * alpha + canvas[offset] * existingAlpha * (1 - alpha)) / outAlpha);
  canvas[offset + 1] = Math.round((g * alpha + canvas[offset + 1] * existingAlpha * (1 - alpha)) / outAlpha);
  canvas[offset + 2] = Math.round((b * alpha + canvas[offset + 2] * existingAlpha * (1 - alpha)) / outAlpha);
  canvas[offset + 3] = Math.round(outAlpha * 255);
}

function fillRect(canvas, size, x0, y0, x1, y1, color) {
  for (let y = Math.floor(y0); y < Math.ceil(y1); y += 1) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x += 1) {
      setPixel(canvas, size, x, y, color);
    }
  }
}

/**
 * Draws the IronMind barbell mark.
 *
 * @param scale relative size of the mark inside the canvas
 * @param offsetX horizontal center of the mark
 */
function drawBarbell(canvas, size, color, scale = 1, offsetX = 0.5) {
  const unit = size * scale;
  const left = offsetX * size - unit / 2;
  const top = size / 2 - unit / 2;
  const u = unit;

  // Center bar
  fillRect(canvas, size, left + u * 0.28, top + u * 0.47, left + u * 0.72, top + u * 0.53, color);
  // Inner plates
  fillRect(canvas, size, left + u * 0.22, top + u * 0.32, left + u * 0.28, top + u * 0.68, color);
  fillRect(canvas, size, left + u * 0.72, top + u * 0.32, left + u * 0.78, top + u * 0.68, color);
  // Outer plates
  fillRect(canvas, size, left + u * 0.14, top + u * 0.4, left + u * 0.2, top + u * 0.6, color);
  fillRect(canvas, size, left + u * 0.8, top + u * 0.4, left + u * 0.86, top + u * 0.6, color);
}

const LIME = [200, 247, 81, 255];
const GRAPHITE = [11, 14, 16, 255];
const WHITE = [255, 255, 255, 255];

function generateLauncherIcon(size) {
  const canvas = createCanvas(size);
  fillRect(canvas, size, 0, 0, size, size, GRAPHITE);
  drawBarbell(canvas, size, LIME, 0.62);
  return encodePng(size, size, canvas);
}

function generateAdaptiveForeground(size) {
  const canvas = createCanvas(size);
  drawBarbell(canvas, size, LIME, 0.55);
  return encodePng(size, size, canvas);
}

function generateNotificationIcon(size) {
  const canvas = createCanvas(size);
  drawBarbell(canvas, size, WHITE, 0.8);
  return encodePng(size, size, canvas);
}

mkdirSync(assetsDir, { recursive: true });
writeFileSync(join(assetsDir, 'icon.png'), generateLauncherIcon(1024));
writeFileSync(join(assetsDir, 'adaptive-icon.png'), generateAdaptiveForeground(432));
writeFileSync(join(assetsDir, 'notification-icon.png'), generateNotificationIcon(96));
writeFileSync(join(assetsDir, 'splash-icon.png'), generateAdaptiveForeground(512));

process.stdout.write('Android assets generated in mobile/assets\n');
