// Minimal PDF text extractor for ReportLab-generated PDFs (ASCII85+Flate streams).
const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync(process.argv[2]);
const s = buf.toString('latin1');

function ascii85(input) {
  let str = input.replace(/\s+/g, '');
  if (str.startsWith('<~')) str = str.slice(2);
  const end = str.indexOf('~>');
  if (end >= 0) str = str.slice(0, end);
  const out = [];
  let tuple = [];
  for (const ch of str) {
    if (ch === 'z' && tuple.length === 0) { out.push(0, 0, 0, 0); continue; }
    const code = ch.charCodeAt(0);
    if (code < 33 || code > 117) continue;
    tuple.push(code - 33);
    if (tuple.length === 5) {
      let n = 0;
      for (const v of tuple) n = n * 85 + v;
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      tuple = [];
    }
  }
  if (tuple.length) {
    const len = tuple.length;
    while (tuple.length < 5) tuple.push(84);
    let n = 0;
    for (const v of tuple) n = n * 85 + v;
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    for (let i = 0; i < len - 1; i++) out.push(bytes[i]);
  }
  return Buffer.from(out);
}

// ---- collect top-level objects ----
const objs = {};
const objRe = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
let m;
while ((m = objRe.exec(s))) objs[parseInt(m[1], 10)] = m[2];

function streamOf(body) {
  const sm = body.match(/stream\r?\n([\s\S]*?)endstream/);
  if (!sm) return null;
  let data = Buffer.from(sm[1], 'latin1');
  const dict = body.slice(0, sm.index);
  try {
    if (/ASCII85Decode/.test(dict)) data = ascii85(data.toString('latin1'));
    if (/FlateDecode/.test(dict)) data = zlib.inflateSync(data);
  } catch (e) {
    return null;
  }
  return data;
}

// ---- parse ToUnicode CMaps (subset TrueType fonts) ----
const cmaps = {}; // objNum -> Map<code, unicode>
for (const [num, body] of Object.entries(objs)) {
  const data = streamOf(body);
  if (!data) continue;
  const txt = data.toString('latin1');
  if (!/beginbf/.test(txt)) continue;
  const map = new Map();
  const hexToStr = (hex) => {
    let out = '';
    for (let i = 0; i + 3 < hex.length; i += 4) {
      const code = parseInt(hex.substr(i, 4), 16);
      if (!isNaN(code)) out += String.fromCharCode(code);
    }
    return out;
  };
  let cm;
  const charRe = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((cm = charRe.exec(txt))) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let p;
    while ((p = pairRe.exec(cm[1]))) map.set(parseInt(p[1], 16), hexToStr(p[2]));
  }
  const rangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((cm = rangeRe.exec(txt))) {
    const rRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([\s\S]*?)\])/g;
    let p;
    while ((p = rRe.exec(cm[1]))) {
      const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16);
      if (p[3] !== undefined) {
        const base = parseInt(p[3], 16);
        for (let c = lo; c <= hi && c - lo < 65536; c++) {
          map.set(c, String.fromCharCode(base + (c - lo)));
        }
      } else if (p[4] !== undefined) {
        const items = p[4].match(/<([0-9a-fA-F]+)>/g) || [];
        items.forEach((it, i) => map.set(lo + i, hexToStr(it.slice(1, -1))));
      }
    }
  }
  if (map.size) cmaps[Number(num)] = map;
}

// ---- font resource name -> ToUnicode cmap object number ----
const fontNameToObj = {};
for (const body of Object.values(objs)) {
  const fm = body.match(/\/Font\s+(\d+)\s+0\s+R/);
  if (!fm) continue;
  const fontDict = objs[Number(fm[1])];
  if (!fontDict) continue;
  const pairRe = /\/([^\s/]+)\s+(\d+)\s+0\s+R/g;
  let p;
  while ((p = pairRe.exec(fontDict))) {
    const fname = p[1], fobj = objs[Number(p[2])];
    if (!fobj) continue;
    const tu = fobj.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    fontNameToObj[fname] = tu ? Number(tu[1]) : null;
  }
}

// ---- decode PDF literal/hex strings ----
function decodeLiteral(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') {
      const nx = str[++i];
      if (nx === undefined) break;
      if (nx >= '0' && nx <= '7') {
        let oct = nx;
        while (oct.length < 3 && str[i + 1] >= '0' && str[i + 1] <= '7') oct += str[++i];
        bytes.push(parseInt(oct, 8) & 255);
      } else {
        const map = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
        if (nx === '\n') continue;
        bytes.push(map[nx] !== undefined ? map[nx] : nx.charCodeAt(0));
      }
    } else {
      bytes.push(ch.charCodeAt(0) & 255);
    }
  }
  return bytes;
}

function hexToBytes(hex) {
  hex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length % 2) hex += '0';
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
  return out;
}

function renderBytes(bytes, font) {
  const cmap = font && fontNameToObj[font] != null ? cmaps[fontNameToObj[font]] : null;
  let out = '';
  for (const b of bytes) {
    if (cmap && cmap.has(b)) { out += cmap.get(b); continue; }
    out += String.fromCharCode(b); // WinAnsi / ASCII fallback
  }
  return out;
}

// ---- walk content stream, emit text from show-text operators ----
function extractText(src) {
  let font = null;
  let out = '';
  let lastY = null;
  const push = (t) => { if (t) out += t; };
  const operands = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '%') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') {
      let depth = 1, j = i + 1, esc = false, raw = '';
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (esc) { raw += '\\' + ch; esc = false; j++; continue; }
        if (ch === '\\') { esc = true; j++; continue; }
        if (ch === '(') depth++;
        if (ch === ')') { depth--; if (depth === 0) break; }
        raw += ch; j++;
      }
      operands.push({ type: 'lit', value: raw });
      i = j + 1; continue;
    }
    if (c === '<' && src[i + 1] === '<') { i += 2; continue; }
    if (c === '<') {
      const j = src.indexOf('>', i);
      if (j < 0) break;
      operands.push({ type: 'hex', value: src.slice(i + 1, j) });
      i = j + 1; continue;
    }
    if (c === '[' || c === ']' || c === '{' || c === '}' || c === ')' || c === '>') { i++; continue; }
    let j = i;
    while (j < src.length && !/[\s()[\]<>{}]/.test(src[j])) j++;
    const word = src.slice(i, j);
    if (!word) { i++; continue; }
    i = j;

    if (word === 'Tf') {
      const nameOp = operands[operands.length - 2];
      if (nameOp && nameOp.type === 'name') font = nameOp.value;
      operands.length = 0; continue;
    }
    if (word === 'Tj' || word === "'" || word === '"') {
      if (word === "'" || word === '"') push('\n');
      const last = operands[operands.length - 1];
      if (last && last.type === 'lit') push(renderBytes(decodeLiteral(last.value), font));
      else if (last && last.type === 'hex') push(renderBytes(hexToBytes(last.value), font));
      operands.length = 0; continue;
    }
    if (word === 'TJ') {
      for (const op of operands) {
        if (op.type === 'lit') push(renderBytes(decodeLiteral(op.value), font));
        else if (op.type === 'hex') push(renderBytes(hexToBytes(op.value), font));
        else if (op.type === 'num' && op.value <= -180) push(' ');
      }
      operands.length = 0; continue;
    }
    if (word === 'Td' || word === 'TD' || word === 'Tm' || word === 'T*') {
      const nums = operands.filter(o => o.type === 'num').map(o => o.value);
      let y = null;
      if (word === 'Tm' && nums.length >= 6) y = nums[5];
      else if (nums.length >= 2) y = nums[1];
      if (word === 'T*' || (y !== null && lastY !== null && Math.abs(y - lastY) > 0.01)) push('\n');
      if (y !== null) lastY = y;
      operands.length = 0; continue;
    }
    if (word === 'BT') { lastY = null; operands.length = 0; continue; }
    if (word === 'ET') { push('\n'); operands.length = 0; continue; }
    if (/^-?[\d.]+$/.test(word)) { operands.push({ type: 'num', value: parseFloat(word) }); continue; }
    if (word[0] === '/') { operands.push({ type: 'name', value: word.slice(1) }); continue; }
    operands.length = 0;
  }
  return out;
}

// ---- page order via /Pages /Kids ----
const pagesMatch = s.match(/\/Kids\s*\[([^\]]+)\]/);
const pageContents = [];
if (pagesMatch) {
  const kids = pagesMatch[1].match(/(\d+)\s+0\s+R/g) || [];
  for (const k of kids) {
    const body = objs[parseInt(k, 10)];
    if (!body) continue;
    const cm = body.match(/\/Contents\s+(\d+)\s+0\s+R/);
    if (cm) pageContents.push(Number(cm[1]));
  }
}

let pageNum = 0;
for (const cnum of pageContents) {
  pageNum++;
  const data = streamOf(objs[cnum] || '');
  if (!data) continue;
  const text = extractText(data.toString('latin1'));
  console.log('\n===== PAGE ' + pageNum + ' =====\n');
  console.log(text.replace(/\n{3,}/g, '\n\n').trim());
}


