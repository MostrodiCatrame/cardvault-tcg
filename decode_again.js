const fs = require('fs');

const win1252 = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
    0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
    0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
    0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

function fixDoubleEncoding(text) {
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
    }
    const bytes = [];
    let hasMojibake = false;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code > 127) hasMojibake = true;
        if (win1252[code] !== undefined) {
            bytes.push(win1252[code]);
        } else if (code < 256) {
            bytes.push(code);
        } else {
            bytes.push(code & 0xFF);
        }
    }
    if (hasMojibake) {
       return Buffer.from(bytes).toString('utf8');
    }
    return text;
}

function processFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = fixDoubleEncoding(content);
    content = content.replace(/  Riftbound/g, '⚔️ Riftbound');
    fs.writeFileSync(file, content, 'utf8');
}

processFile('index.html');
processFile('app.js'); // Just in case
console.log('Decoded again');
