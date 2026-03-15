// scripts/generate-icons.js
// Generates circular refresh-arrow icons (↻) with transparent background

const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.resolve(__dirname, "..", "icons");
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

// --- PNG helpers ---

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    table[n] = k;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

function w32(buf, val, off) {
  buf[off] = (val >>> 24) & 0xff; buf[off+1] = (val >>> 16) & 0xff;
  buf[off+2] = (val >>> 8) & 0xff; buf[off+3] = val & 0xff;
}

function makeChunk(type, data) {
  const chunk = Buffer.alloc(4 + 4 + data.length + 4);
  w32(chunk, data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const crcBuf = Buffer.alloc(4 + data.length);
  chunk.copy(crcBuf, 0, 4, 8 + data.length);
  w32(chunk, crc32(crcBuf), 8 + data.length);
  return chunk;
}

// --- Geometry helpers ---

const DEG = Math.PI / 180;

function normAngle(d) { return ((d % 360) + 360) % 360; }

function inArc(angle, start, end) {
  const a = normAngle(angle), s = normAngle(start), e = normAngle(end);
  return s <= e ? (a >= s && a <= e) : (a >= s || a <= e);
}

function inTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// --- Refresh icon renderer ---

function createRefreshIcon(size, r, g, b) {
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.33;
  const midR = (outerR + innerR) / 2;
  const ringW = outerR - innerR;

  // Two arcs, each 140°, symmetric
  const arcs = [
    { start: 20, end: 160 },
    { start: 200, end: 340 },
  ];

  // Arrowhead triangle at the leading edge of each arc
  function arrow(endDeg) {
    const tipOff = size <= 24 ? 28 : 20;   // degrees beyond arc end
    const baseOff = size <= 24 ? 8 : 4;    // degrees behind arc end
    const extra = ringW * (size <= 24 ? 1.6 : 1.2); // width beyond ring
    const tipR = (endDeg + tipOff) * DEG;
    const baseR = (endDeg - baseOff) * DEG;
    return {
      tx: cx + midR * Math.cos(tipR),           ty: cy + midR * Math.sin(tipR),
      ox: cx + (outerR + extra) * Math.cos(baseR), oy: cy + (outerR + extra) * Math.sin(baseR),
      ix: cx + (innerR - extra) * Math.cos(baseR), iy: cy + (innerR - extra) * Math.sin(baseR),
    };
  }
  const arrows = arcs.map(a => arrow(a.end));

  // RGBA pixel data (color type 6)
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);

  for (let y = 0; y < size; y++) {
    const ro = y * rowLen;
    raw[ro] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const off = ro + 1 + x * 4;
      const px = x + 0.5, py = y + 0.5;
      const dx = px - cx, dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ang = normAngle(Math.atan2(dy, dx) / DEG);

      let alpha = 0;

      // Ring arcs with edge anti-aliasing
      if (dist >= innerR - 1 && dist <= outerR + 1) {
        if (arcs.some(a => inArc(ang, a.start, a.end))) {
          let aa = 1;
          if (dist < innerR) aa = Math.max(0, 1 - (innerR - dist));
          else if (dist > outerR) aa = Math.max(0, 1 - (dist - outerR));
          alpha = Math.round(aa * 255);
        }
      }

      // Arrowheads
      if (alpha === 0) {
        for (const a of arrows) {
          if (inTriangle(px, py, a.tx, a.ty, a.ox, a.oy, a.ix, a.iy)) {
            alpha = 255; break;
          }
        }
      }

      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = alpha;
    }
  }

  // --- Encode PNG ---
  const ihdrData = Buffer.alloc(13);
  w32(ihdrData, size, 0); w32(ihdrData, size, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; // 8-bit RGBA
  const ihdr = makeChunk("IHDR", ihdrData);

  const blocks = [];
  const BM = 65535;
  for (let i = 0; i < raw.length; i += BM) {
    const sl = raw.slice(i, Math.min(i + BM, raw.length));
    const last = i + BM >= raw.length;
    const bh = Buffer.alloc(5);
    bh[0] = last ? 1 : 0;
    bh[1] = sl.length & 0xff; bh[2] = (sl.length >> 8) & 0xff;
    bh[3] = ~sl.length & 0xff; bh[4] = (~sl.length >> 8) & 0xff;
    blocks.push(bh, sl);
  }
  const aVal = adler32(raw);
  const aBuf = Buffer.alloc(4); w32(aBuf, aVal, 0);
  const idat = makeChunk("IDAT", Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, aBuf]));
  const iend = makeChunk("IEND", Buffer.alloc(0));
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// --- Generate all icon variants ---

const variants = [
  { suffix: "",        r: 0x66, g: 0x66, b: 0x66 },  // gray — inactive
  { suffix: "-active", r: 0x4c, g: 0xaf, b: 0x50 },  // green — active
];
const sizes = [16, 48, 128];

for (const { suffix, r, g, b } of variants) {
  for (const size of sizes) {
    const png = createRefreshIcon(size, r, g, b);
    const fp = path.join(ICONS_DIR, `icon${size}${suffix}.png`);
    fs.writeFileSync(fp, png);
    console.log(`  Generated icons/icon${size}${suffix}.png (${png.length} bytes)`);
  }
}
console.log("Refresh arrow icons generated successfully.");
