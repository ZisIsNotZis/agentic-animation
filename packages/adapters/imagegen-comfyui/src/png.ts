import { deflateSync } from "node:zlib";

/**
 * Minimal, dependency-free RGBA PNG encoder — used by the adapter's --dry-run
 * mock to emit valid placeholder part images (with a real alpha channel, so the
 * `char cut`/`rig` stages can be exercised end-to-end without ComfyUI). Not a
 * general-purpose encoder: 8-bit RGBA, no interlacing, filter 0 per scanline.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode a width×height RGBA buffer (`rgba.length === width*height*4`) to PNG bytes. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  if (rgba.length !== width * height * 4) {
    throw new Error(`encodePng: rgba length ${rgba.length} != ${width}x${height}x4`);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: RGBA
  // 10,11,12 = compression/filter/interlace = 0

  // Prepend a 0 filter byte to each scanline.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Read (width, height) from a PNG's IHDR without decoding pixels. */
export function readPngSize(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452 /* "IHDR" */) {
    throw new Error("readPngSize: not a PNG (missing IHDR).");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
