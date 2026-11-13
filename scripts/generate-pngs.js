import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, isMaskable = false) {
  // Simple uncompressed or deflate-compressed raw RGBA buffer
  const rowSize = width * 4 + 1; // 1 filter byte (0) per row
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.44);

  // Background: Teal gradient (#0f766e to #042f2e)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    const t = y / height;
    const bgR = Math.round(15 * (1 - t) + 4 * t);
    const bgG = Math.round(118 * (1 - t) + 47 * t);
    const bgB = Math.round(110 * (1 - t) + 46 * t);

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Medical cross coordinates
      const crossW = width * 0.12;
      const crossH = height * 0.42;

      const inVert = Math.abs(dx) <= crossW / 2 && Math.abs(dy) <= crossH / 2;
      const inHoriz = Math.abs(dy) <= crossW / 2 && Math.abs(dx) <= crossH / 2;

      // Inner card bounds
      const cardW = width * 0.58;
      const cardH = height * 0.72;
      const inCard = Math.abs(dx) <= cardW / 2 && Math.abs(dy) <= cardH / 2;

      if (inVert || inHoriz) {
        // Medical emerald cross
        rawData[pixelOffset] = 16;     // R
        rawData[pixelOffset + 1] = 185; // G
        rawData[pixelOffset + 2] = 129; // B
        rawData[pixelOffset + 3] = 255; // A
      } else if (inCard && (dist < radius * 0.95)) {
        // Document white paper
        rawData[pixelOffset] = 248;
        rawData[pixelOffset + 1] = 250;
        rawData[pixelOffset + 2] = 252;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Background
        rawData[pixelOffset] = bgR;
        rawData[pixelOffset + 1] = bgG;
        rawData[pixelOffset + 2] = bgB;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(48, 48, false));

console.log('Successfully generated PWA compliant icons in public/');
