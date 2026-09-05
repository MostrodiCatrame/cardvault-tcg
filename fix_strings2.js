const fs = require('fs');

const map = {
    'Ã¢â€ â€ ': '➡',
    'raritÃƒÂ ': 'rarità',
    'RaritÃƒÂ ': 'Rarità',
    'Ã°Å¸â€˜Â Ã¯Â¸Â': '👁️',
    'Ã°Å¸â€ â€™': '➡️',
    'Ã°Å¸â€ â€˜': '🔑'
};

const files = ['index.html', 'app.js', 'server.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    for (let [bad, good] of Object.entries(map)) {
        content = content.split(bad).join(good);
    }
    fs.writeFileSync(f, content, 'utf8');
});

console.log('Fixed more files');
