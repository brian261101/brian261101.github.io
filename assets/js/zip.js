/* Bộ ghi ZIP tối giản, thuần JavaScript.

   Ghi ở chế độ "store" (không nén) nên không cần cài đặt deflate. Dùng để
   gói một thư mục skill thành .zip ngay trong trình duyệt, không qua dịch
   vụ trung gian nào. */
(function (root) {
  'use strict';

  const CRC = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* files: [{ name: 'duong/dan.txt', data: Uint8Array | string }] */
  function zip(files) {
    const enc = new TextEncoder();
    const d = new Date();
    const tm = ((d.getHours() << 11) | (d.getMinutes() << 5) |
                Math.floor(d.getSeconds() / 2)) & 0xFFFF;
    const dt = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) |
                d.getDate()) & 0xFFFF;

    const parts = [], central = [];
    let offset = 0;

    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);

      const lh = new Uint8Array(30 + name.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034B50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);      // tên file mã hoá UTF-8
      lv.setUint16(8, 0, true);           // store
      lv.setUint16(10, tm, true);
      lv.setUint16(12, dt, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      lh.set(name, 30);
      parts.push(lh, data);

      const ch = new Uint8Array(46 + name.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014B50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, tm, true);
      cv.setUint16(14, dt, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);

      offset += lh.length + data.length;
    }

    let cdSize = 0;
    for (const c of central) cdSize += c.length;

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(8, central.length, true);
    ev.setUint16(10, central.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);

    const out = new Uint8Array(offset + cdSize + 22);
    let p = 0;
    for (const b of parts) { out.set(b, p); p += b.length; }
    for (const c of central) { out.set(c, p); p += c.length; }
    out.set(eocd, p);
    return out;
  }

  root.TinyZip = { zip, crc32 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
