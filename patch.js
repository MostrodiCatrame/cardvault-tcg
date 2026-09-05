const fs = require('fs');

function patchIndex() {
    let content = fs.readFileSync('index.html', 'utf-8');
    
    // Remove Lorcana & OnePiece Options, add Riftbound
    content = content.replace(/<option value="onepiece">.*?<\/option>\s*/g, '');
    content = content.replace(/<option value="lorcana">.*?<\/option>\s*/g, '');
    
    content = content.replace(/<option value="magic">.*?<\/option>/g, 
        '<option value="magic">🐄 Magic: The Gathering</option>\n                  <option value="riftbound">⚔️ Riftbound</option>');

    // Remove Lorcana & OnePiece Pills, add Riftbound
    content = content.replace(/<button[^>]*data-brand="onepiece"[\s\S]*?<\/button>\sr*/g, '');
    content = content.replace(/<button[^>]*data-brand="lorcana"[\s\S]*?<\/button>\sr*/g, '');
    
    const magicPill = '<button type="button" class="brand-pill" data-brand="magic" id="brand-pill-magic">\n          <span class="brand-pill-icon">🐄</span>\n          <span class="brand-pill-title">Magic: The Gathering</span>\n          <span class="brand-pill-count" id="brand-count-magic">0</span>\n        </button>';
    const riftboundPill = '\n        <button type="button" class="brand-pill" data-brand="riftbound" id="brand-pill-riftbound">\n          <span class="brand-pill-icon">⚔️</span>\n          <span class="brand-pill-title">Riftbound</span>\n          <span class="brand-pill-count" id="brand-count-riftbound">0</span>\n        </button>';
    
    content = content.replace(magicPill, magicPill + riftboundPill);
    
    fs.writeFileSync('index.html', content, 'utf-8');
}

function patchApp() {
    let content = fs.readFileSync('app.js', 'utf-8');
    
    // Auth Headers
    content = content.replace(
        'const headers = { "Content-Type": "application/json", ...extraHeaders };',
        'const headers = { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true", ...extraHeaders };'
    );
    
    // Badges
    content = content.replace(/if \(g === "onepiece"\).*?\n/g, '');
    content = content.replace(/if \(g === "lorcana"\).*?\n/g, '');
    content = content.replace('if (g === "magic") return \'<span class="brand-badge badge-magic">🐄 Magic</span>\';', 
        'if (g === "magic") return \'<span class="brand-badge badge-magic">🐄 Magic</span>\';\n    if (g === "riftbound") return \'<span class="brand-badge badge-riftbound">⚔️ Riftbound</span>\';');

    // Market paths
    content = content.replace(/} else if \(game === 'onepiece'\) {[\s\S]*?} else if \(game === 'lorcana'\) {[\s\S]*?}/g, '}');
    content = content.replace(/} else if \(game === 'onepiece'\) {[\s\S]*?}/g, ''); // just in case
    content = content.replace(/} else if \(game === 'lorcana'\) {[\s\S]*?}/g, '');
    
    content = content.replace(/} else if \(game === 'magic'\) {[\s\S]*?}/g, 
        `} else if (game === 'magic') {
      cmGamePath = 'Magic';
      ebayPrefix = 'Magic The Gathering';
    } else if (game === 'riftbound') {
      cmGamePath = 'Riftbound';
      ebayPrefix = 'Riftbound Card';
    }`);
    
    fs.writeFileSync('app.js', content, 'utf-8');
}

function patchServer() {
    let content = fs.readFileSync('server.js', 'utf-8');
    
    // Game IDs
    content = content.replace(/else if \(gameId === 15\).*?\n/g, '');
    content = content.replace(/else if \(gameId === 18\).*?\n/g, '');
    content = content.replace(/else if \(gameId === 5\) game = 'pokemon';/, 
        "else if (gameId === 5) game = 'pokemon';\n  else if (gameId === 22) game = 'riftbound';");

    // Default Expansion Name
    content = content.replace(/const defaultExpName =.*?Yu-Gi-Oh! Expansion.*?\);/, 
        "const defaultExpName = (game === 'magic' ? 'Magic Set' : (game === 'pokemon' ? 'Pokémon Set' : (game === 'riftbound' ? 'Riftbound Set' : 'Yu-Gi-Oh! Expansion')));");
        
    // Cache Control
    content = content.replace(/res\.writeHead\(200, { 'Content-Type': contentType }\);/,
        "res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' });");
        
    fs.writeFileSync('server.js', content, 'utf-8');
}

function patchCss() {
    let content = fs.readFileSync('style.css', 'utf-8');
    
    content = content.replace(/\.brand-badge\.badge-onepiece {[\s\S]*?}/g, '');
    content = content.replace(/\.brand-badge\.badge-lorcana {[\s\S]*?}/g, '');
    
    const magicCss = `.brand-badge.badge-magic {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
}`;
    
    const riftboundCss = `.brand-badge.badge-riftbound {
  background: rgba(14, 165, 233, 0.13);
  color: #38bdf8;
  border: 1px solid rgba(14, 165, 233, 0.35);
}`;

    content = content.replace(magicCss, magicCss + '\n\n' + riftboundCss);
    
    fs.writeFileSync('style.css', content, 'utf-8');
}

try {
    patchIndex();
    patchApp();
    patchServer();
    patchCss();
    console.log("Patched successfully.");
} catch(e) {
    console.error(e);
}