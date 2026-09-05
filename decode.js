const fs = require('fs');

const win1252 = {
    0x20AC: 0x80, // €
    0x201A: 0x82, // ‚
    0x0192: 0x83, // ƒ
    0x201E: 0x84, // „
    0x2026: 0x85, // …
    0x2020: 0x86, // †
    0x2021: 0x87, // ‡
    0x02C6: 0x88, // ˆ
    0x2030: 0x89, // ‰
    0x0160: 0x8A, // Š
    0x2039: 0x8B, // ‹
    0x0152: 0x8C, // Œ
    0x017D: 0x8E, // Ž
    0x2018: 0x91, // ‘
    0x2019: 0x92, // ’
    0x201C: 0x93, // “
    0x201D: 0x94, // ”
    0x2022: 0x95, // •
    0x2013: 0x96, // –
    0x2014: 0x97, // —
    0x02DC: 0x98, // ˜
    0x2122: 0x99, // ™
    0x0161: 0x9A, // š
    0x203A: 0x9B, // ›
    0x0153: 0x9C, // œ
    0x017E: 0x9E, // ž
    0x0178: 0x9F  // Ÿ
};

function fixDoubleEncoding(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (win1252[code] !== undefined) {
            bytes[i] = win1252[code];
        } else if (code < 256) {
            bytes[i] = code;
        } else {
            // Unmapped characters or already UTF-8 characters?
            // If it's a character > 255 and not in win1252, just keep the lower byte as fallback
            // But this should only apply to mojibake.
            bytes[i] = code & 0xFF;
        }
    }
    return Buffer.from(bytes).toString('utf8');
}

// Test
const txt = fs.readFileSync('app.js', 'utf8');
const sub = txt.substring(txt.indexOf('PokÃ©mon') - 20, txt.indexOf('PokÃ©mon') + 20);
console.log('Decoded test:', fixDoubleEncoding(sub));
