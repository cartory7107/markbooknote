/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import esbuild from 'esbuild';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const iconsDir = path.join(extensionDir, 'icons');
const publicDir = path.join(rootDir, 'public');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

/**
 * Creates a valid PNG buffer of given width and height with a gradient background
 */
function createPng(width, height, r1 = 99, g1 = 102, b1 = 241, r2 = 139, g2 = 92, b2 = 246) {
  // Each row has 1 filter byte (0) + width * 4 bytes (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None
    const t = y / height;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw lightning bolt or subtle M shape or simple vibrant icon
      const cx = x / width;
      const cy = y / height;
      const isLightning = (cx > 0.45 && cx < 0.55 && cy > 0.2 && cy < 0.8) ||
                          (cx > 0.35 && cx < 0.65 && cy > 0.45 && cy < 0.55);

      if (isLightning) {
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = 255;
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Simple CRC32 for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 1. Generate Icons
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createPng(16, 16));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createPng(48, 48));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createPng(128, 128));
console.log('✓ Generated icons (icon16.png, icon48.png, icon128.png)');

// 2. Compile TypeScript extension files using esbuild
async function buildExtension() {
  console.log('Building extension with esbuild...');

  // Build background.js
  await esbuild.build({
    entryPoints: [path.join(extensionDir, 'background.ts')],
    outfile: path.join(extensionDir, 'background.js'),
    bundle: true,
    format: 'esm',
    target: 'chrome100',
    platform: 'browser',
    sourcemap: false
  });

  // Build content-script.js
  await esbuild.build({
    entryPoints: [path.join(extensionDir, 'content-script.ts')],
    outfile: path.join(extensionDir, 'content-script.js'),
    bundle: true,
    format: 'iife',
    target: 'chrome100',
    platform: 'browser',
    sourcemap: false
  });

  // Build popup.js
  await esbuild.build({
    entryPoints: [path.join(extensionDir, 'popup.ts')],
    outfile: path.join(extensionDir, 'popup.js'),
    bundle: true,
    format: 'iife',
    target: 'chrome100',
    platform: 'browser',
    sourcemap: false
  });

  console.log('✓ Compiled background.js, content-script.js, popup.js');

  // 3. Package extension into public/memora-extension.zip
  const zip = new JSZip();

  function addFolderToZip(folderPath, zipFolder) {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const sub = zipFolder.folder(item);
        addFolderToZip(fullPath, sub);
      } else {
        zipFolder.file(item, fs.readFileSync(fullPath));
      }
    }
  }

  addFolderToZip(extensionDir, zip);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.join(publicDir, 'memora-extension.zip'), zipBuffer);
  console.log('✓ Successfully generated public/memora-extension.zip (' + (zipBuffer.length / 1024).toFixed(1) + ' KB)');
}

buildExtension().catch(err => {
  console.error('Build extension failed:', err);
  process.exit(1);
});
