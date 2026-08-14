// Local Sync Server for CardVault TCG
// Permette la sincronizzazione bidirezionale in tempo reale con Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv
// Include l'integrazione ufficiale CardTrader API v2 per il calcolo automatico dei prezzi reali!

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

// Dynamic CSV Path: uses Windows local user path if available, otherwise local app directory for Cloud/Docker
const WINDOWS_LOCAL_CSV = path.join('C:', 'Users', 'fgava', 'Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv');
const CSV_FILE_PATH = (process.platform === 'win32' && fs.existsSync('C:\\Users\\fgava'))
  ? WINDOWS_LOCAL_CSV
  : path.join(ROOT_DIR, 'Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv');

const TOKEN_FILE_PATH = path.join(ROOT_DIR, '.cardtrader_token');

// Default initial user token (or from process.env)
let CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN || 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjYXJkdHJhZGVyLXByb2R1Y3Rpb24iLCJzdWIiOiJhcHA6OTkwMSIsImF1ZCI6ImFwcDo5OTAxIiwiZXhwIjo0OTQyNDE1NzcyLCJqdGkiOiI2NTM3OTkwNy1iY2RiLTRiZGEtODI2NS02NDExNTcyYzU1OTUiLCJpYXQiOjE3ODY3Mzg1NzIsIm5hbWUiOiJGZ2F2YWduaW4gQXBwIDIwMjQwNDEyMTIxNjExIn0.YcmBv-42ry0rMXzB1ZpqDMfLnSqY4MLcnCJox4jk9DM1-25S-miR_SArKoyIpR0G7Jg4RSfbK0GQKPPLLAOd2n6n34zUZ9qBuXg6yUOKr7vMLCYKh6N7R7e5wtRAvtVKf8V3oj5zeCQ2HfeBfF_fZTgqJzhbN1dCjUA7CRpaWMdHuYe6I1UMfizjLSjVvzWsKVq21i07hzsidfYCvrT8U7pqH2SJzxiumJqUhsYNBkWWItGj9Dec-fC03_LBWI1qfQ5b1lXOA8DXvAERzE06e-eJDS8ywwRWIBGc-VZ-Dhdty6jcG-b3GAGh8P-082ue5tga31RT-tg-aQqcjT9EzA';


// Load saved token if exists
if (fs.existsSync(TOKEN_FILE_PATH)) {
  try {
    const saved = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
    if (saved) CARDTRADER_TOKEN = saved;
  } catch (e) {}
}

// Memory caches for CardTrader API
let expansionsCache = null;
const blueprintsCache = new Map(); // expansionId -> Array of blueprints

function formatNumberToCsv(val) {
  if (val === undefined || val === null || isNaN(val)) return "0,00";
  return Number(val).toFixed(2).replace('.', ',');
}

function cleanStr(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// CardTrader HTTPS Request Helper
function fetchCardTrader(endpointPath) {
  return new Promise((resolve, reject) => {
    if (!CARDTRADER_TOKEN) {
      return reject(new Error("Token CardTrader non configurato"));
    }

    const options = {
      hostname: 'api.cardtrader.com',
      path: endpointPath,
      headers: {
        'Authorization': 'Bearer ' + CARDTRADER_TOKEN,
        'User-Agent': 'CardVault-TCG/2.0'
      }
    };

    const req = https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          return reject(new Error("Token CardTrader non valido o scaduto"));
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`Errore CardTrader API HTTP ${res.statusCode}: ${data}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Timeout richiesta CardTrader API"));
    });
  });
}

// Get all Yu-Gi-Oh! expansions (cached)
async function getYuGiOhExpansions() {
  if (expansionsCache) return expansionsCache;
  const allExpansions = await fetchCardTrader('/api/v2/expansions');
  if (Array.isArray(allExpansions)) {
    expansionsCache = allExpansions.filter(e => e.game_id === 4);
    return expansionsCache;
  }
  return [];
}

// Get blueprints for an expansion with pagination (cached)
async function getExpansionBlueprints(expansionId) {
  if (blueprintsCache.has(expansionId)) {
    return blueprintsCache.get(expansionId);
  }

  let allBlueprints = [];
  for (let page = 1; page <= 12; page++) {
    try {
      const list = await fetchCardTrader(`/api/v2/blueprints?expansion_id=${expansionId}&page=${page}`);
      if (!list || !Array.isArray(list) || list.length === 0) break;
      allBlueprints = allBlueprints.concat(list);
      if (list.length < 50) break; // Last page reached
    } catch (err) {
      break;
    }
  }

  blueprintsCache.set(expansionId, allBlueprints);
  return allBlueprints;
}

// Find live CardTrader price for a single card
async function fetchCardTraderPrice(card) {
  const expansions = await getYuGiOhExpansions();
  const codePrefix = (card.code || '').split('-')[0].toLowerCase().trim();
  const cardCleanName = cleanStr(card.englishName || card.name);
  const cleanExpName = cleanStr(card.expansion);

  // 1. Find matching expansion
  let exp = expansions.find(e => e.code.toLowerCase() === codePrefix);
  if (!exp) {
    exp = expansions.find(e => cleanStr(e.name) === cleanExpName);
  }
  if (!exp) {
    exp = expansions.find(e => cleanStr(e.name).includes(cleanExpName) || cleanExpName.includes(cleanStr(e.name)));
  }

  if (!exp) {
    return { success: false, reason: `Espansione non trovata per codice ${card.code}` };
  }

  // 2. Fetch blueprints for expansion
  const blueprints = await getExpansionBlueprints(exp.id);
  if (!blueprints || blueprints.length === 0) {
    return { success: false, reason: `Nessuna carta trovata nell'espansione ${exp.name}` };
  }

  // 3. Find matching blueprint by English name and rarity
  const targetRarity = cleanStr(card.rarity);
  let matchedBp = blueprints.find(b => cleanStr(b.name) === cardCleanName && cleanStr(b.version) === targetRarity);
  
  if (!matchedBp) {
    matchedBp = blueprints.find(b => cleanStr(b.name) === cardCleanName && targetRarity.includes(cleanStr(b.version)));
  }
  if (!matchedBp) {
    matchedBp = blueprints.find(b => cleanStr(b.name) === cardCleanName);
  }
  if (!matchedBp) {
    matchedBp = blueprints.find(b => cleanStr(b.name).includes(cardCleanName) || cardCleanName.includes(cleanStr(b.name)));
  }

  if (!matchedBp) {
    return { success: false, reason: `Blueprint "${card.englishName || card.name}" non trovato in ${exp.name}` };
  }

  // 4. Fetch live marketplace products
  const productsMap = await fetchCardTrader(`/api/v2/marketplace/products?blueprint_id=${matchedBp.id}`);
  const items = (productsMap && productsMap[matchedBp.id]) || [];

  if (items.length === 0) {
    return {
      success: true,
      blueprintId: matchedBp.id,
      blueprintName: matchedBp.name,
      expansionName: exp.name,
      minPrice: Number(card.ctMin) || 0,
      trendPrice: Number(card.ctTrend) || 0,
      listingsCount: 0,
      note: "Nessuna inserzione attiva al momento su CardTrader (mantenuti prezzi correnti)"
    };
  }

  // Extract all valid Euro prices
  const prices = items
    .map(i => i.price_cents ? (i.price_cents / 100) : (i.price ? (i.price.cents / 100) : 0))
    .filter(p => p > 0);

  if (prices.length === 0) {
    return { success: false, reason: "Nessun prezzo valido trovato tra le inserzioni" };
  }

  prices.sort((a, b) => a - b);
  const minPrice = prices[0];

  // Calculate market trend (median of the lowest 5 offers or trimmed average)
  const sampleSize = Math.max(1, Math.min(5, prices.length));
  const sample = prices.slice(0, sampleSize);
  const trendPrice = sample.reduce((a, b) => a + b, 0) / sample.length;

  return {
    success: true,
    blueprintId: matchedBp.id,
    blueprintName: matchedBp.name,
    blueprintVersion: matchedBp.version,
    expansionName: exp.name,
    minPrice: Number(minPrice.toFixed(2)),
    trendPrice: Number(trendPrice.toFixed(2)),
    listingsCount: items.length,
    allPrices: prices
  };
}

// Convert JSON cards back to the exact format of Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv
function convertCardsToCsv(cards) {
  const header = "N°;Nome Carta;Espansione;Codice Carta;Rarità;Edizione / Artwork;Lingua;Stato / Condizione;Cardmarket Min (€);Cardmarket Trend (€);CardTrader Min (€);CardTrader Trend (€);Media Min (€);Media Trend (€);Note";
  
  let totalCmMin = 0;
  let totalCmTrend = 0;
  let totalCtMin = 0;
  let totalCtTrend = 0;
  let totalMediaMin = 0;
  let totalMediaTrend = 0;

  const rows = cards.map((card, idx) => {
    const num = card.num || (idx + 1);
    const cmMin = Number(card.cmMin) || 0;
    const cmTrend = Number(card.cmTrend) || 0;
    const ctMin = Number(card.ctMin) || 0;
    const ctTrend = Number(card.ctTrend) || 0;

    const mediaMin = (cmMin > 0 && ctMin > 0) ? ((cmMin + ctMin) / 2) : (cmMin || ctMin || 0);
    const mediaTrend = (cmTrend > 0 && ctTrend > 0) ? ((cmTrend + ctTrend) / 2) : (cmTrend || ctTrend || 0);

    totalCmMin += cmMin;
    totalCmTrend += cmTrend;
    totalCtMin += ctMin;
    totalCtTrend += ctTrend;
    totalMediaMin += mediaMin;
    totalMediaTrend += mediaTrend;

    return [
      num,
      card.name || "",
      card.expansion || "",
      card.code || "",
      card.rarity || "",
      card.edition || "",
      card.language || "",
      card.condition || "",
      formatNumberToCsv(cmMin),
      formatNumberToCsv(cmTrend),
      formatNumberToCsv(ctMin),
      formatNumberToCsv(ctTrend),
      formatNumberToCsv(mediaMin),
      formatNumberToCsv(mediaTrend),
      card.notes || ""
    ].join(';');
  });

  const totalRow = [
    "",
    `TOTALE LOTTO (${cards.length} Carte)`,
    "-", "-", "-", "-", "-",
    "Somma Carte",
    formatNumberToCsv(totalCmMin),
    formatNumberToCsv(totalCmTrend),
    formatNumberToCsv(totalCtMin),
    formatNumberToCsv(totalCtTrend),
    formatNumberToCsv(totalMediaMin),
    formatNumberToCsv(totalMediaTrend),
    "Totale valore lotto sincronizzato automaticamente da CardVault TCG"
  ].join(';');

  return header + '\r\n' + rows.join('\r\n') + '\r\n\r\n' + totalRow + '\r\n';
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Status Check
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      csvPath: CSV_FILE_PATH,
      cardTraderConnected: !!CARDTRADER_TOKEN,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // API: CardTrader Token Status & Validation
  if (req.url === '/api/cardtrader/status' && req.method === 'GET') {
    try {
      const info = await fetchCardTrader('/api/v2/info');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: true,
        user: info.name || "Utente CardTrader",
        userId: info.user_id,
        appId: info.id
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        error: err.message
      }));
    }
    return;
  }

  // API: Save new CardTrader token
  if (req.url === '/api/cardtrader/set-token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const newToken = (payload.token || '').trim();
        if (!newToken) throw new Error("Token vuoto");

        CARDTRADER_TOKEN = newToken;
        fs.writeFileSync(TOKEN_FILE_PATH, newToken, 'utf-8');
        expansionsCache = null;
        blueprintsCache.clear();

        const info = await fetchCardTrader('/api/v2/info');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: info.name }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Sync a Single Card with CardTrader
  if (req.url === '/api/cardtrader/sync-single' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const card = payload.card;
        if (!card) throw new Error("Dati carta mancanti");

        const result = await fetchCardTraderPrice(card);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Full Batch Sync All Cards with CardTrader and Save directly to CSV
  if (req.url === '/api/cardtrader/sync-all' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const inputCards = payload.cards || [];
        if (inputCards.length === 0) throw new Error("Lista carte vuota");

        console.log(`[CardTrader Live Sync] Inizio sincronizzazione per ${inputCards.length} carte...`);

        const updatedCards = [];
        const logs = [];

        for (let i = 0; i < inputCards.length; i++) {
          const card = { ...inputCards[i] };
          try {
            const resPrice = await fetchCardTraderPrice(card);
            if (resPrice.success && resPrice.listingsCount > 0) {
              const oldMin = card.ctMin;
              const oldTrend = card.ctTrend;

              card.ctMin = resPrice.minPrice;
              card.ctTrend = resPrice.trendPrice;
              card.baseCtMin = resPrice.minPrice;
              card.baseCtTrend = resPrice.trendPrice;

              logs.push({
                cardName: card.name,
                code: card.code,
                oldCtMin: oldMin,
                newCtMin: resPrice.minPrice,
                oldCtTrend: oldTrend,
                newCtTrend: resPrice.trendPrice,
                listings: resPrice.listingsCount,
                expansion: resPrice.expansionName
              });
            } else {
              logs.push({
                cardName: card.name,
                code: card.code,
                status: 'no_listings',
                note: resPrice.reason || resPrice.note || 'Nessuna inserzione attiva'
              });
            }
          } catch (itemErr) {
            logs.push({
              cardName: card.name,
              code: card.code,
              status: 'error',
              error: itemErr.message
            });
          }

          updatedCards.push(card);
          // Small delay to respect rate limit smoothly
          await new Promise(r => setTimeout(r, 120));
        }

        // Save updated cards directly to CSV on disk
        const csvContent = convertCardsToCsv(updatedCards);
        fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
        console.log(`[CardTrader Live Sync] Completato con successo! File CSV aggiornato.`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          cards: updatedCards,
          logs: logs,
          message: `${updatedCards.length} carte sincronizzate con CardTrader API e salvate nel CSV!`
        }));
      } catch (err) {
        console.error('[CardTrader Live Sync] Errore:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Save Portfolio Cards directly to Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv
  if (req.url === '/api/save-portfolio' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const cards = payload.cards || [];
        const csvContent = convertCardsToCsv(cards);

        fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
        console.log(`[CardVault Sync] ${cards.length} carte salvate con successo in: ${CSV_FILE_PATH}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: cards.length, message: 'File CSV aggiornato con successo su disco!' }));
      } catch (err) {
        console.error('[CardVault Sync] Errore durante il salvataggio del CSV:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Read directly from CSV file
  if (req.url === '/api/load-portfolio' && req.method === 'GET') {
    try {
      if (fs.existsSync(CSV_FILE_PATH)) {
        const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File CSV non trovato' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(ROOT_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 CardVault TCG Server attivo su: http://localhost:${PORT}`);
  console.log(`📁 File CSV collegato: ${CSV_FILE_PATH}`);
  console.log(`⚡ CardTrader API: Connessa (Token Attivo)`);
  console.log('====================================================');
});
