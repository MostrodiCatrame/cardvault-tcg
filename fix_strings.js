const fs = require('fs');

const map = {
    'Ã¢â‚¬Â¢': '•',
    'Ã¢Å¡Â¡': '⚡',
    'Ã°Å¸â€˜Â Ã¯Â¸Â': '👁️',
    'Ã°Å¸â€ â€™': '➡️',
    'Ã¢Å¡â„¢Ã¯Â¸Â ': '⚙️ ',
    'Ã¢Å¡â„¢Ã¯Â¸Â': '⚙️',
    'giÃƒÂ ': 'già',
    'PokÃƒÂ©mon': 'Pokémon',
    'RaritÃƒÂ ': 'Rarità',
    'PrioritÃƒÂ ': 'Priorità',
    'OpportunitÃƒÂ ': 'Opportunità',
    'Ã¢Å“Â¨': '✨',
    'Ã°Å¸Å½Â´': '🎴',
    'Ã°Å¸Âªâ€ž': '🪄',
    'Ã¢Å¡â€Ã¯Â¸Â': '⚔️',
    'Ã°Å¸Â Â´Ã¢â‚¬Â Ã¢ËœÂ Ã¯Â¸Â ': '🏴‍☠️ ',
    'Ã°Å¸Â Â´Ã¢â‚¬Â Ã¢ËœÂ Ã¯Â¸Â': '🏴‍☠️',
    'Ã°Å¸Â§â„¢': '🧙',
    'Ã¢â€ â€”': '↗',
    'Ã¢â€ â€ ': '➡',
    'Ã¢â€ Ëœ': '↘',
    'Ã¢â€šÂ¬': '€',
    'Ã°Å¸â€¢â€™': '🕒',
    'PiÃƒÂ¹': 'Più',
    'NÃ‚Â°': 'N°',
    '1Ã‚Âª': '1ª',
    'Ã¢Å“â€¦': '✅',
    'Ã¢Å¡Â Ã¯Â¸Â ': '⚠️ ',
    'Ã¢Å¡Â Ã¯Â¸Â': '⚠️',
    'Ã°Å¸Å½Â¯': '🎯',
    'Ã°Å¸Å’Â ': '🌐 ',
    'Ã°Å¸Å’Â': '🌐',
    'Ã°Å¸Æ’Â ': '🃏 ',
    'Ã°Å¸Æ’Â': '🃏',
    'Ã°Å¸â€œÅ ': '📊',
    'Ã°Å¸â€ â€˜': '🔑',
    'Ã¢Â Å’': '❌',
    'Ã¢â€“Â´': '▴',
    'Ã°Å¸Â¥Â§': '🥧',
    'Ã¢â€ â€˜': '⬆',
    'Ã¢â€ â€œ': '⬇',
    'PokÃǟÂmon': 'Pokémon',
    'Pokǟmon': 'Pokémon',
    'PokǸmon': 'Pokémon',
    'Pokmon': 'Pokémon'
};

const htmlContent = fs.readFileSync('index_render.html', 'utf8');
let fixedHtml = htmlContent;
for (let [bad, good] of Object.entries(map)) {
    fixedHtml = fixedHtml.split(bad).join(good);
}
fixedHtml = fixedHtml.replace(/<option value="onepiece">.*?<\/option>\s*/g, '');
fixedHtml = fixedHtml.replace(/<option value="lorcana">.*?<\/option>\s*/g, '');
fixedHtml = fixedHtml.replace(/<button[^>]*data-brand="onepiece"[\s\S]*?<\/button>\s*/g, '');
fixedHtml = fixedHtml.replace(/<button[^>]*data-brand="lorcana"[\s\S]*?<\/button>\s*/g, '');
fs.writeFileSync('index.html', fixedHtml, 'utf8');

const appContent = fs.readFileSync('app_render.js', 'utf8');
let fixedApp = appContent;
for (let [bad, good] of Object.entries(map)) {
    fixedApp = fixedApp.split(bad).join(good);
}
fixedApp = fixedApp.replace(/if \(g === "onepiece"\).*?\n/g, '');
fixedApp = fixedApp.replace(/if \(g === "lorcana"\).*?\n/g, '');
fixedApp = fixedApp.replace(/} else if \(game === 'onepiece'\) {[\s\S]*?}/g, '');
fixedApp = fixedApp.replace(/} else if \(game === 'lorcana'\) {[\s\S]*?}/g, '');
fs.writeFileSync('app.js', fixedApp, 'utf8');

const cssContent = fs.readFileSync('style_render.css', 'utf8');
let fixedCss = cssContent;
for (let [bad, good] of Object.entries(map)) {
    fixedCss = fixedCss.split(bad).join(good);
}
fixedCss = fixedCss.replace(/\.brand-badge\.badge-onepiece {[\s\S]*?}/g, '');
fixedCss = fixedCss.replace(/\.brand-badge\.badge-lorcana {[\s\S]*?}/g, '');
fs.writeFileSync('style.css', fixedCss, 'utf8');

let serverContent = fs.readFileSync('C:/Users/fgava/yugioh-card-tracker/server.js', 'utf8');
serverContent = serverContent.replace(/else if \(gameId === 15\).*?\n/g, '');
serverContent = serverContent.replace(/else if \(gameId === 18\).*?\n/g, '');
serverContent = serverContent.replace(/else if \(gameId === 5\) game = 'pokemon';/, 
    "else if (gameId === 5) game = 'pokemon';\n  else if (gameId === 22) game = 'riftbound';");
serverContent = serverContent.replace(/const defaultExpName =.*?Yu-Gi-Oh! Expansion.*?\);/, 
    "const defaultExpName = (game === 'magic' ? 'Magic Set' : (game === 'pokemon' ? 'Pokémon Set' : (game === 'riftbound' ? 'Riftbound Set' : 'Yu-Gi-Oh! Expansion')));");
serverContent = serverContent.replace(/res\.writeHead\(200, { 'Content-Type': contentType }\);/,
    "res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' });");
fs.writeFileSync('server.js', serverContent, 'utf8');

console.log('Fixed files');
