const fs = require('fs');

const win1252 = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
    0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
    0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
    0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
};

function decode(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    const bytes = [];
    let hasMojibake = false;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code > 127) hasMojibake = true;
        
        if (win1252[code] !== undefined) bytes.push(win1252[code]);
        else bytes.push(code & 0xFF);
    }
    return hasMojibake ? Buffer.from(bytes).toString('utf8') : text;
}

// 1. Index
let idx = fs.readFileSync('index_render.html', 'utf8');
idx = decode(idx); // first pass
idx = decode(idx); // second pass

idx = idx.replace(/<option value="onepiece">.*?<\/option>\s*/g, '');
idx = idx.replace(/<option value="lorcana">.*?<\/option>\s*/g, '');
idx = idx.replace(/<button[^>]*data-brand="onepiece"[\s\S]*?<\/button>\s*/g, '');
idx = idx.replace(/<button[^>]*data-brand="lorcana"[\s\S]*?<\/button>\s*/g, '');
fs.writeFileSync('index.html', idx, 'utf8');

// 2. App
let app = fs.readFileSync('app_render.js', 'utf8');
app = decode(app); // one pass

app = app.replace(/if \(g === "onepiece"\).*?\n/g, '');
app = app.replace(/if \(g === "lorcana"\).*?\n/g, '');

// Carefully remove Onepiece and Lorcana logic blocks
app = app.replace(/\} else if \(game === 'onepiece'\) \{[\s\S]*?\} else if \(game === 'lorcana'\) \{[\s\S]*?\}/g, '}');
// If only one of them existed
app = app.replace(/\} else if \(game === 'onepiece'\) \{[\s\S]*?\}/g, '');
app = app.replace(/\} else if \(game === 'lorcana'\) \{[\s\S]*?\}/g, '');

// Ensure Magic block still closes properly if the above replace stripped the closing brace
// Actually, using the above regex with \} at the end means the closing brace OF the block is kept?
// Let's explicitly fix the known issue:
app = app.replace(/ebayPrefix = 'Magic The Gathering';\s+else if/g, "ebayPrefix = 'Magic The Gathering';\n    } else if");

fs.writeFileSync('app.js', app, 'utf8');

// 3. Style
let css = fs.readFileSync('style_render.css', 'utf8');
css = css.replace(/\.brand-badge\.badge-onepiece {[\s\S]*?}/g, '');
css = css.replace(/\.brand-badge\.badge-lorcana {[\s\S]*?}/g, '');
fs.writeFileSync('style.css', css, 'utf8');

// 4. Server
let srv = fs.readFileSync('C:/Users/fgava/yugioh-card-tracker/server.js', 'utf8');
srv = srv.replace(/else if \(gameId === 15\).*?\n/g, '');
srv = srv.replace(/else if \(gameId === 18\).*?\n/g, '');
srv = srv.replace(/else if \(gameId === 5\) game = 'pokemon';/, 
    "else if (gameId === 5) game = 'pokemon';\n  else if (gameId === 22) game = 'riftbound';");
srv = srv.replace(/const defaultExpName =.*?Yu-Gi-Oh! Expansion.*?\);/, 
    "const defaultExpName = (game === 'magic' ? 'Magic Set' : (game === 'pokemon' ? 'Pokémon Set' : (game === 'riftbound' ? 'Riftbound Set' : 'Yu-Gi-Oh! Expansion')));");
srv = srv.replace(/res\.writeHead\(200, { 'Content-Type': contentType }\);/,
    "res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' });");
fs.writeFileSync('server.js', srv, 'utf8');

console.log('Master fix complete');
