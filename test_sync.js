const https = require('https');
const { DEFAULT_CARDS } = require('./cards-data.js');

const token = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjYXJkdHJhZGVyLXByb2R1Y3Rpb24iLCJzdWIiOiJhcHA6OTkwMSIsImF1ZCI6ImFwcDo5OTAxIiwiZXhwIjo0OTQyNDE1NzcyLCJqdGkiOiI2NTM3OTkwNy1iY2RiLTRiZGEtODI2NS02NDExNTcyYzU1OTUiLCJpYXQiOjE3ODY3Mzg1NzIsIm5hbWUiOiJGZ2F2YWduaW4gQXBwIDIwMjQwNDEyMTIxNjExIn0.YcmBv-42ry0rMXzB1ZpqDMfLnSqY4MLcnCJox4jk9DM1-25S-miR_SArKoyIpR0G7Jg4RSfbK0GQKPPLLAOd2n6n34zUZ9qBuXg6yUOKr7vMLCYKh6N7R7e5wtRAvtVKf8V3oj5zeCQ2HfeBfF_fZTgqJzhbN1dCjUA7CRpaWMdHuYe6I1UMfizjLSjVvzWsKVq21i07hzsidfYCvrT8U7pqH2SJzxiumJqUhsYNBkWWItGj9Dec-fC03_LBWI1qfQ5b1lXOA8DXvAERzE06e-eJDS8ywwRWIBGc-VZ-Dhdty6jcG-b3GAGh8P-082ue5tga31RT-tg-aQqcjT9EzA';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.cardtrader.com',
      path: path,
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'CardVault/1.0' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function clean(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log('Fetching expansions...');
  const expansions = await get('/api/v2/expansions');
  const yugiExp = expansions.filter(e => e.game_id === 4);

  const testCards = DEFAULT_CARDS.slice(0, 10);
  for (const card of testCards) {
    const setPrefix = card.code.split('-')[0].toLowerCase();
    const exp = yugiExp.find(e => e.code.toLowerCase() === setPrefix || clean(e.name) === clean(card.expansion));
    if (!exp) {
      console.log('Missing expansion for:', card.name, card.code);
      continue;
    }
    const bps = await get('/api/v2/blueprints?expansion_id=' + exp.id);
    if (!bps || !Array.isArray(bps)) continue;

    const cardCleanName = clean(card.englishName || card.name);
    let matchedBp = bps.find(b => clean(b.name) === cardCleanName && clean(b.version) === clean(card.rarity));
    if (!matchedBp) {
      matchedBp = bps.find(b => clean(b.name) === cardCleanName);
    }

    if (matchedBp) {
      const prods = await get('/api/v2/marketplace/products?blueprint_id=' + matchedBp.id);
      const items = (prods && prods[matchedBp.id]) || [];
      const prices = items.map(i => i.price_cents ? i.price_cents / 100 : (i.price ? i.price.cents / 100 : 0)).filter(p => p > 0);
      const min = prices.length ? Math.min(...prices) : 0;
      const sorted = [...prices].sort((a,b)=>a-b);
      const topSlice = sorted.slice(0, Math.max(1, Math.min(5, sorted.length)));
      const trend = topSlice.length ? (topSlice.reduce((a,b)=>a+b,0) / topSlice.length) : 0;
      console.log(`[${card.code}] ${card.name} (${matchedBp.version}) -> Min: EUR ${min.toFixed(2)}, Trend: EUR ${trend.toFixed(2)} (${items.length} items)`);
    } else {
      console.log(`[${card.code}] ${card.name} -> Blueprint not found in ${exp.name}`);
    }
  }
}

run();
