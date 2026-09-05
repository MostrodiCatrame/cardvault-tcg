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
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (win1252[code] !== undefined) {
            bytes.push(win1252[code]);
        } else if (code < 256) {
            bytes.push(code);
        } else {
            // Keep as is if it's not mojibake?
            // Actually, if it's > 255 and not in win1252, it's a real UTF-8 char that didn't get mojibaked.
            // But we are returning a byte array. So we can't push > 255.
            // Wait, index_render.html was fully mojibaked.
            bytes.push(code & 0xFF);
        }
    }
    return Buffer.from(bytes).toString('utf8');
}

function processFile(inFile, outFile) {
    let content = fs.readFileSync(inFile, 'utf8');
    content = fixDoubleEncoding(content);
    
    if (outFile === 'index.html') {
        content = content.replace(/<option value="onepiece">.*?<\/option>\s*/g, '');
        content = content.replace(/<option value="lorcana">.*?<\/option>\s*/g, '');
        content = content.replace(/<button[^>]*data-brand="onepiece"[\s\S]*?<\/button>\s*/g, '');
        content = content.replace(/<button[^>]*data-brand="lorcana"[\s\S]*?<\/button>\s*/g, '');
    }
    if (outFile === 'app.js') {
        content = content.replace(/if \(g === "onepiece"\).*?\n/g, '');
        content = content.replace(/if \(g === "lorcana"\).*?\n/g, '');
        content = content.replace(/} else if \(game === 'onepiece'\) {[\s\S]*?} else if \(game === 'lorcana'\) {[\s\S]*?}/g, '}');
        content = content.replace(/} else if \(game === 'onepiece'\) {[\s\S]*?}/g, '');
        content = content.replace(/} else if \(game === 'lorcana'\) {[\s\S]*?}/g, '');
    }
    if (outFile === 'style.css') {
        content = content.replace(/\.brand-badge\.badge-onepiece {[\s\S]*?}/g, '');
        content = content.replace(/\.brand-badge\.badge-lorcana {[\s\S]*?}/g, '');
    }
    
    fs.writeFileSync(outFile, content, 'utf8');
}

processFile('index_render.html', 'index.html');
processFile('app_render.js', 'app.js');
processFile('style_render.css', 'style.css');
console.log('Done');
