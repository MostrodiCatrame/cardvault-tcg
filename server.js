// Local & Cloud Server for CardVault TCG
// Include Sincronizzazione CSV, CardTrader API v2 e Sicurezza 2FA (Password + TOTP Google/Microsoft Authenticator)

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

// Dynamic CSV Path: uses Windows local user path if available, otherwise local app directory for Cloud/Docker
const WINDOWS_LOCAL_CSV = path.join('C:', 'Users', 'fgava', 'Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv');
const CSV_FILE_PATH = (process.platform === 'win32' && fs.existsSync('C:\\Users\\fgava'))
  ? WINDOWS_LOCAL_CSV
  : path.join(ROOT_DIR, 'Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv');

const TOKEN_FILE_PATH = path.join(ROOT_DIR, '.cardtrader_token');
const AUTH_CONFIG_FILE = path.join(ROOT_DIR, '.auth_config.json');
const JSON_DATA_PATH = path.join(ROOT_DIR, 'data_portfolio.json');

// Default initial user token (or from process.env)
let CARDTRADER_TOKEN = process.env.CARDTRADER_TOKEN || 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjYXJkdHJhZGVyLXByb2R1Y3Rpb24iLCJzdWIiOiJhcHA6OTkwMSIsImF1ZCI6ImFwcDo5OTAxIiwiZXhwIjo0OTQyNDE1NzcyLCJqdGkiOiI2NTM3OTkwNy1iY2RiLTRiZGEtODI2NS02NDExNTcyYzU1OTUiLCJpYXQiOjE3ODY3Mzg1NzIsIm5hbWUiOiJGZ2F2YWduaW4gQXBwIDIwMjQwNDEyMTIxNjExIn0.YcmBv-42ry0rMXzB1ZpqDMfLnSqY4MLcnCJox4jk9DM1-25S-miR_SArKoyIpR0G7Jg4RSfbK0GQKPPLLAOd2n6n34zUZ9qBuXg6yUOKr7vMLCYKh6N7R7e5wtRAvtVKf8V3oj5zeCQ2HfeBfF_fZTgqJzhbN1dCjUA7CRpaWMdHuYe6I1UMfizjLSjVvzWsKVq21i07hzsidfYCvrT8U7pqH2SJzxiumJqUhsYNBkWWItGj9Dec-fC03_LBWI1qfQ5b1lXOA8DXvAERzE06e-eJDS8ywwRWIBGc-VZ-Dhdty6jcG-b3GAGh8P-082ue5tga31RT-tg-aQqcjT9EzA';

// Load saved token if exists
const JUSTTCG_TOKEN_FILE = path.join(ROOT_DIR, '.justtcg_token');
const JUSTTCG_USAGE_FILE = path.join(ROOT_DIR, '.justtcg_usage.json');
let JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY || '';

if (fs.existsSync(JUSTTCG_TOKEN_FILE)) {
  try {
    const savedKey = fs.readFileSync(JUSTTCG_TOKEN_FILE, 'utf-8').trim();
    if (savedKey) JUSTTCG_API_KEY = savedKey;
  } catch (e) {}
}

if (fs.existsSync(TOKEN_FILE_PATH)) {
  try {
    const saved = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
    if (saved) CARDTRADER_TOKEN = saved;
  } catch (e) {}
}

// ==========================================
// JUSTTCG MONTHLY QUOTA TRACKER (1.000 Req/Mese)
// ==========================================
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getNextResetDateStr() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDaysUntilReset() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diffTime = nextMonth - now;
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function loadJustTcgUsage() {
  const monthKey = getCurrentMonthKey();
  let usage = {
    currentMonth: monthKey,
    count: 0,
    monthlyLimit: 1000,
    warningThreshold: 500,
    lastReset: new Date().toISOString()
  };

  if (fs.existsSync(JUSTTCG_USAGE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(JUSTTCG_USAGE_FILE, 'utf-8'));
      if (data && data.currentMonth === monthKey) {
        usage = { ...usage, ...data };
      } else {
        // Nuovo mese solare! Reset automatico del contatore
        usage.currentMonth = monthKey;
        usage.count = 0;
        usage.lastReset = new Date().toISOString();
        saveJustTcgUsage(usage);
      }
    } catch (e) {}
  }
  return usage;
}

function saveJustTcgUsage(usage) {
  try {
    fs.writeFileSync(JUSTTCG_USAGE_FILE, JSON.stringify(usage, null, 2), 'utf-8');
  } catch (e) {}
}

function recordJustTcgCall() {
  const usage = loadJustTcgUsage();
  usage.count += 1;
  saveJustTcgUsage(usage);
  return usage;
}

function getJustTcgApiKey(explicitKey) {
  if (explicitKey && typeof explicitKey === 'string' && explicitKey.trim()) {
    return explicitKey.trim();
  }
  if (JUSTTCG_API_KEY && JUSTTCG_API_KEY.trim()) {
    return JUSTTCG_API_KEY.trim();
  }
  if (fs.existsSync(JUSTTCG_TOKEN_FILE)) {
    try {
      const saved = fs.readFileSync(JUSTTCG_TOKEN_FILE, 'utf-8').trim();
      if (saved) {
        JUSTTCG_API_KEY = saved;
        return saved;
      }
    } catch (e) {}
  }
  return '';
}

function getJustTcgUsageStats() {
  const usage = loadJustTcgUsage();
  const key = getJustTcgApiKey();
  const remaining = Math.max(0, usage.monthlyLimit - usage.count);
  const isWarning = usage.count >= usage.warningThreshold;
  const isExceeded = usage.count >= usage.monthlyLimit;
  return {
    configured: !!key,
    currentMonth: usage.currentMonth,
    count: usage.count,
    monthlyLimit: usage.monthlyLimit,
    remaining: remaining,
    warningThreshold: usage.warningThreshold,
    isWarning: isWarning,
    isExceeded: isExceeded,
    nextResetDate: getNextResetDateStr(),
    daysUntilReset: getDaysUntilReset()
  };
}

// ==========================================
// 2FA AUTHENTICATION SYSTEM (RFC 6238 TOTP)
// ==========================================
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32) {
  let cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    let val = BASE32_CHARS.indexOf(cleaned.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  let bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

function generateSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let base32 = '';
  for (let i = 0; i < bytes.length; i++) {
    base32 += BASE32_CHARS.charAt(bytes[i] % 32);
  }
  return base32;
}

function verifyTOTP(secret, userCode, window = 1) {
  if (!secret || !userCode) return false;
  const epoch = Math.floor(Date.now() / 1000);
  const currentTime = Math.floor(epoch / 30);
  const key = base32Decode(secret);
  const codeStr = (userCode || '').trim();

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const time = currentTime + errorWindow;
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(time));
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1000000;
    const genCode = code.toString().padStart(6, '0');
    if (genCode === codeStr) return true;
  }
  return false;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

let authConfig = {
  enabled: false,
  passwordHash: null,
  salt: null,
  totpSecret: null,
  sessionSecret: crypto.randomBytes(32).toString('hex')
};

function loadAuthConfig() {
  if (fs.existsSync(AUTH_CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_CONFIG_FILE, 'utf-8'));
      if (data && data.enabled) {
        authConfig = { ...authConfig, ...data };
      }
    } catch (e) {}
  }
}
loadAuthConfig();

function saveAuthConfig() {
  try {
    fs.writeFileSync(AUTH_CONFIG_FILE, JSON.stringify(authConfig, null, 2), 'utf-8');
  } catch (e) {}
}

function createSessionToken(userId = 'admin', rememberDays = 30) {
  const expiresAt = Date.now() + (rememberDays * 24 * 60 * 60 * 1000);
  const payload = `${userId}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', authConfig.sessionSecret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifySessionToken(token) {
  if (!authConfig.enabled) return true; // Auth disabled, open access
  if (!token) return false;

  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 3) return false;
    const [userId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr);

    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSig = crypto.createHmac('sha256', authConfig.sessionSecret).update(`${userId}:${expiresAt}`).digest('hex');
    return signature === expectedSig;
  } catch (e) {
    return false;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
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
      if (list.length < 50) break;
    } catch (err) {
      break;
    }
  }

  blueprintsCache.set(expansionId, allBlueprints);
  return allBlueprints;
}

function getTargetLangCode(langStr) {
  if (!langStr) return null;
  const l = langStr.toLowerCase();
  if (l.includes('ita')) return 'it';
  if (l.includes('ing') || l.includes('en')) return 'en';
  if (l.includes('ted') || l.includes('de')) return 'de';
  if (l.includes('fra') || l.includes('fr')) return 'fr';
  if (l.includes('spa') || l.includes('es')) return 'es';
  if (l.includes('gia') || l.includes('jp') || l.includes('ja')) return 'ja';
  return null;
}

function getTargetConditions(condStr) {
  if (!condStr) return ['Near Mint', 'Slightly Played'];
  const c = condStr.toLowerCase();
  if (c.includes('near') || c.includes('nm')) return ['Near Mint', 'Slightly Played'];
  if (c.includes('exc') || c.includes('ex') || c.includes('slight')) return ['Near Mint', 'Slightly Played', 'Moderately Played'];
  if (c.includes('good') || c.includes('gd') || c.includes('light') || c.includes('lp')) return ['Near Mint', 'Slightly Played', 'Moderately Played', 'Played'];
  return ['Near Mint', 'Slightly Played', 'Moderately Played', 'Played', 'Poor'];
}

function extractFilteredCardTraderPrices(items, card) {
  const getPrice = p => (p.price_cents ? p.price_cents / 100 : (p.price && p.price.cents ? p.price.cents / 100 : 0));
  const targetLang = getTargetLangCode(card.language);
  const targetConds = getTargetConditions(card.condition);
  const is1st = (card.edition || '').toLowerCase().includes('1');

  let matched = [];
  let filterLevel = '';

  // Level 1: Lang + Condition + 1st Edition
  if (targetLang && is1st) {
    matched = items.filter(p => {
      const ph = p.properties_hash || {};
      const matchLang = (ph.yugioh_language === targetLang || ph.language === targetLang);
      const matchCond = targetConds.includes(ph.condition);
      const match1st = ph.first_edition === true;
      return matchLang && matchCond && match1st;
    });
    if (matched.length > 0) filterLevel = `${targetLang.toUpperCase()} • ${card.condition || 'NM'} • 1ª Edizione`;
  }

  // Level 2: Lang + Condition
  if (matched.length === 0 && targetLang) {
    matched = items.filter(p => {
      const ph = p.properties_hash || {};
      const matchLang = (ph.yugioh_language === targetLang || ph.language === targetLang);
      const matchCond = targetConds.includes(ph.condition);
      return matchLang && matchCond;
    });
    if (matched.length > 0) filterLevel = `${targetLang.toUpperCase()} • ${card.condition || 'NM'}`;
  }

  // Level 3: Lang Only
  if (matched.length === 0 && targetLang) {
    matched = items.filter(p => {
      const ph = p.properties_hash || {};
      return (ph.yugioh_language === targetLang || ph.language === targetLang);
    });
    if (matched.length > 0) filterLevel = `${targetLang.toUpperCase()} (Tutte Condizioni)`;
  }

  // Level 4: Global Condition
  if (matched.length === 0) {
    matched = items.filter(p => {
      const ph = p.properties_hash || {};
      return targetConds.includes(ph.condition);
    });
    if (matched.length > 0) filterLevel = `Globale • ${card.condition || 'NM'}`;
  }

  // Level 5: Global All
  if (matched.length === 0) {
    matched = items;
    filterLevel = 'Globale (Tutti)';
  }

  const prices = matched.map(getPrice).filter(p => p > 0).sort((a, b) => a - b);
  return { prices, matchedCount: matched.length, totalCount: items.length, filterLevel };
}

// Find live CardTrader price for a single card (Filtered by Language, Condition & Edition)
async function fetchCardTraderPrice(card) {
  // Ultra-fast exact lookup if blueprintId is available
  if (card.blueprintId) {
    try {
      const mkt = await fetchCardTrader('/api/v2/marketplace/products?blueprint_id=' + card.blueprintId);
      if (mkt) {
        const prods = Array.isArray(mkt) ? mkt : (mkt[card.blueprintId] || Object.values(mkt).flat());
        if (prods && prods.length > 0) {
          const { prices, matchedCount, totalCount, filterLevel } = extractFilteredCardTraderPrices(prods, card);
          if (prices.length > 0) {
            const minPrice = prices[0];
            const sampleSize = Math.max(1, Math.min(5, prices.length));
            const sample = prices.slice(0, sampleSize);
            const trendPrice = sample.reduce((a, b) => a + b, 0) / sample.length;

            return {
              success: true,
              blueprintId: card.blueprintId,
              minPrice: parseFloat(minPrice.toFixed(2)),
              trendPrice: parseFloat(trendPrice.toFixed(2)),
              listingsCount: totalCount,
              matchedListingsCount: matchedCount,
              filterLevel: filterLevel,
              blueprint: { id: card.blueprintId, name: card.englishName }
            };
          }
        }
      }
    } catch(e) {}
  }

  const expansions = await getYuGiOhExpansions();
  const codePrefix = (card.code || '').split('-')[0].toLowerCase().trim();
  const cardCleanName = cleanStr(card.englishName || card.name);
  const cleanExpName = cleanStr(card.expansion);

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

  const blueprints = await getExpansionBlueprints(exp.id);
  if (!blueprints || blueprints.length === 0) {
    return { success: false, reason: `Nessuna carta trovata nell'espansione ${exp.name}` };
  }

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

  const { prices, matchedCount, totalCount, filterLevel } = extractFilteredCardTraderPrices(items, card);

  if (prices.length === 0) {
    return { success: false, reason: "Nessun prezzo valido trovato tra le inserzioni" };
  }

  const minPrice = prices[0];
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
    listingsCount: totalCount,
    matchedListingsCount: matchedCount,
    filterLevel: filterLevel,
    allPrices: prices
  };
}

// Convert JSON cards back to the exact format of Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv
function convertCardsToCsv(cards) {
  const header = "N°;Nome Carta;Espansione;Codice Carta;Rarità;Edizione / Artwork;Lingua;Stato / Condizione;Cardmarket Min (€);Cardmarket Trend (€);CardTrader Min (€);CardTrader Trend (€);eBay Min (€);eBay Trend (€);Note";
  
  let totalCmMin = 0;
  let totalCmTrend = 0;
  let totalCtMin = 0;
  let totalCtTrend = 0;
  let totalEbMin = 0;
  let totalEbTrend = 0;

  const rows = cards.map((card, idx) => {
    const num = card.num || (idx + 1);
    const cmMin = Number(card.cmMin) || 0;
    const cmTrend = Number(card.cmTrend) || 0;
    const ctMin = Number(card.ctMin) || 0;
    const ctTrend = Number(card.ctTrend) || 0;
    const ebMin = Number(card.ebMin) || (ctMin * 0.98);
    const ebTrend = Number(card.ebTrend) || (ctTrend * 1.02);

    totalCmMin += cmMin;
    totalCmTrend += cmTrend;
    totalCtMin += ctMin;
    totalCtTrend += ctTrend;
    totalEbMin += ebMin;
    totalEbTrend += ebTrend;

    return [
      num,
      `"${(card.name || '').replace(/"/g, '""')}"`,
      `"${(card.expansion || '').replace(/"/g, '""')}"`,
      `"${(card.code || '').replace(/"/g, '""')}"`,
      `"${(card.rarity || '').replace(/"/g, '""')}"`,
      `"${(card.edition || '').replace(/"/g, '""')}"`,
      `"${(card.language || '').replace(/"/g, '""')}"`,
      `"${(card.condition || '').replace(/"/g, '""')}"`,
      formatNumberToCsv(cmMin),
      formatNumberToCsv(cmTrend),
      formatNumberToCsv(ctMin),
      formatNumberToCsv(ctTrend),
      formatNumberToCsv(ebMin),
      formatNumberToCsv(ebTrend),
      `"${(card.notes || '').replace(/"/g, '""')}"`
    ].join(';');
  });

  const totalRow = [
    "",
    `"TOTALE LOTTO (${cards.length} Carte)"`,
    "-", "-", "-", "-", "-",
    `"Somma Carte"`,
    formatNumberToCsv(totalCmMin),
    formatNumberToCsv(totalCmTrend),
    formatNumberToCsv(totalCtMin),
    formatNumberToCsv(totalCtTrend),
    formatNumberToCsv(totalEbMin),
    formatNumberToCsv(totalEbTrend),
    `"Totale valore lotto completo sincronizzato da CardVault TCG"`
  ].join(';');

  return "\uFEFF" + header + '\r\n' + rows.join('\r\n') + '\r\n\r\n' + totalRow + '\r\n';
}

// Centralized atomic persistence to data_portfolio.json, cards-data.js and CSV files
function saveAllStores(cards, wants, lastUpdated) {
  const ts = lastUpdated || new Date().toLocaleString("it-IT");
  const isoNow = new Date().toISOString();

  // Try to load existing data for smart timestamp merge
  let existingPortfolio = null;
  try {
    if (fs.existsSync(JSON_DATA_PATH)) {
      existingPortfolio = JSON.parse(fs.readFileSync(JSON_DATA_PATH, 'utf-8'));
    }
  } catch(e) {}

  const existingCardMap = new Map();
  if (existingPortfolio && Array.isArray(existingPortfolio.cards)) {
    existingPortfolio.cards.forEach(c => {
      if (c.id !== undefined && c.id !== null) existingCardMap.set(`id:${c.id}`, c);
      if (c.code) existingCardMap.set(`code:${c.code.toUpperCase().trim()}`, c);
    });
  }

  // Ensure each card has an updatedAt timestamp
  const processedCards = (cards || []).map(card => {
    let cardUpdatedAt = card.updatedAt;
    if (!cardUpdatedAt) {
      const existing = (card.id !== undefined && existingCardMap.get(`id:${card.id}`)) ||
                       (card.code && existingCardMap.get(`code:${card.code.toUpperCase().trim()}`));
      cardUpdatedAt = (existing && existing.updatedAt) ? existing.updatedAt : isoNow;
    }
    return {
      ...card,
      updatedAt: cardUpdatedAt
    };
  });
  
  // If wants not passed, preserve existing
  let finalWants = wants;
  if (!finalWants) {
    try {
      finalWants = existingPortfolio ? (existingPortfolio.wants || []) : [];
    } catch(e) {
      finalWants = [];
    }
  }

  const existingWantMap = new Map();
  if (existingPortfolio && Array.isArray(existingPortfolio.wants)) {
    existingPortfolio.wants.forEach(w => {
      if (w.id !== undefined && w.id !== null) existingWantMap.set(`id:${w.id}`, w);
      if (w.code) existingWantMap.set(`code:${w.code.toUpperCase().trim()}`, w);
    });
  }

  const processedWants = (finalWants || []).map(want => {
    let wantUpdatedAt = want.updatedAt;
    if (!wantUpdatedAt) {
      const existing = (want.id !== undefined && existingWantMap.get(`id:${want.id}`)) ||
                       (want.code && existingWantMap.get(`code:${want.code.toUpperCase().trim()}`));
      wantUpdatedAt = (existing && existing.updatedAt) ? existing.updatedAt : isoNow;
    }
    return {
      ...want,
      updatedAt: wantUpdatedAt
    };
  });

  const portfolioData = {
    cards: processedCards,
    wants: processedWants,
    lastUpdated: ts
  };

  // 1. Write data_portfolio.json
  try {
    fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(portfolioData, null, 2), 'utf-8');
  } catch(e) {
    console.error('[saveAllStores] Errore scrittura JSON:', e.message);
  }

  // 2. Write cards-data.js
  try {
    const cardsDataContent = `// CardVault TCG Master Collection (${portfolioData.cards.length} Carte con Blueprint Certificati CardTrader & YGOPRODeck)
const DEFAULT_CARDS = ${JSON.stringify(portfolioData.cards, null, 2)};

const DEFAULT_WANTS = ${JSON.stringify(portfolioData.wants, null, 2)};

if (typeof module !== 'undefined') {
  module.exports = { DEFAULT_CARDS, DEFAULT_WANTS };
}
`;
    const cardsDataPath = path.join(ROOT_DIR, 'cards-data.js');
    fs.writeFileSync(cardsDataPath, cardsDataContent, 'utf-8');
  } catch(e) {
    console.error('[saveAllStores] Errore scrittura cards-data.js:', e.message);
  }

  // 3. Write CSV to project folder and Desktop
  if (processedCards && processedCards.length > 0) {
    const csvContent = convertCardsToCsv(processedCards);
    try {
      fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
    } catch (e) {}

    const localCsv = path.join(ROOT_DIR, 'Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv');
    if (CSV_FILE_PATH !== localCsv) {
      try {
        fs.writeFileSync(localCsv, csvContent, 'utf-8');
      } catch (e) {}
    }
  }

  console.log(`[Auto-Save Disk] Salvataggio completato: ${portfolioData.cards.length} carte e ${portfolioData.wants.length} wants persistiti su JSON, CSV e cards-data.js con timestamp.`);
  return portfolioData;
}


// Parse raw CSV string to card array
function parseCsvCards(csvText) {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];

  const separator = lines[0].includes(";") ? ";" : ",";
  const cards = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(";TOTALE")) continue;

    const tokens = [];
    let cur = "";
    let insideQuote = false;

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === separator && !insideQuote) {
        tokens.push(cur.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
        cur = "";
      } else {
        cur += char;
      }
    }
    tokens.push(cur.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));

    if (tokens.length >= 4 && tokens[1]) {
      const parsePrice = (str) => {
        if (!str) return 0;
        const cleaned = str.replace(/[^0-9,.-]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
      };

      const cmMin = parsePrice(tokens[8]);
      const cmTrend = parsePrice(tokens[9]);
      const ctMin = parsePrice(tokens[10]);
      const ctTrend = parsePrice(tokens[11]);
      const ebMin = parsePrice(tokens[12]) || parseFloat((cmMin * 1.02).toFixed(2));
      const ebTrend = parsePrice(tokens[13]) || parseFloat((cmTrend * 1.02).toFixed(2));

      cards.push({
        id: parseInt(tokens[0]) || i,
        num: parseInt(tokens[0]) || i,
        name: tokens[1] || "Sconosciuta",
        englishName: tokens[1] || "Sconosciuta",
        expansion: tokens[2] || "",
        code: tokens[3] || "",
        rarity: tokens[4] || "Rare",
        edition: tokens[5] || "",
        language: tokens[6] || "Italiano (ITA)",
        condition: tokens[7] || "Near Mint",
        cmMin, cmTrend, ctMin, ctTrend, ebMin, ebTrend,
        baseCmMin: cmMin, baseCmTrend: cmTrend,
        baseCtMin: ctMin, baseCtTrend: ctTrend,
        baseEbMin: ebMin, baseEbTrend: ebTrend,
        trendStatus: (cmTrend > cmMin * 1.15) ? "up" : "stable",
        trendPct: (cmTrend > cmMin) ? parseFloat(((cmTrend - cmMin) / cmMin * 10).toFixed(1)) : 0,
        notes: tokens[14] || "",
        updatedAt: new Date().toISOString()
      });
    }
  }
  return cards;
}

// Retrieve portfolio state with multi-tier fallback (JSON storage -> CSV -> cards-data.js)
function getStoredPortfolio() {
  const isoNow = new Date().toISOString();

  // 1. JSON persistent storage (contains both cards and wants)
  if (fs.existsSync(JSON_DATA_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(JSON_DATA_PATH, 'utf-8'));
      if (data && Array.isArray(data.cards) && data.cards.length > 0) {
        data.cards.forEach(c => { if (!c.updatedAt) c.updatedAt = isoNow; });
        (data.wants || []).forEach(w => { if (!w.updatedAt) w.updatedAt = isoNow; });
        return data;
      }
    } catch (e) {}
  }

  // 2. CSV file on disk
  if (fs.existsSync(CSV_FILE_PATH)) {
    try {
      const csvText = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
      const cards = parseCsvCards(csvText);
      if (cards.length > 0) {
        let defaultWants = [];
        try {
          delete require.cache[require.resolve('./cards-data.js')];
          const cardsData = require('./cards-data.js');
          defaultWants = cardsData.DEFAULT_WANTS || [];
        } catch (e) {}
        defaultWants.forEach(w => { if (!w.updatedAt) w.updatedAt = isoNow; });
        return {
          cards,
          wants: defaultWants,
          lastUpdated: new Date().toLocaleString("it-IT")
        };
      }
    } catch (e) {}
  }

  // 3. Fallback to cards-data.js
  try {
    delete require.cache[require.resolve('./cards-data.js')];
    const cardsData = require('./cards-data.js');
    const cards = (cardsData.DEFAULT_CARDS || []).map(c => ({ ...c, updatedAt: c.updatedAt || isoNow }));
    const wants = (cardsData.DEFAULT_WANTS || []).map(w => ({ ...w, updatedAt: w.updatedAt || isoNow }));
    return {
      cards,
      wants,
      lastUpdated: new Date().toLocaleString("it-IT")
    };
  } catch (e) {
    return { cards: [], wants: [], lastUpdated: new Date().toLocaleString("it-IT") };
  }
}


// ==========================================
// YGOPRODECK & JUSTTCG MULTI-MARKETPLACE ENGINE
// ==========================================

function cleanCardNameForYgo(name) {
  return (name || '')
    .replace(/\s*\(V\.\d+\)/gi, '')
    .replace(/\s*Alternate Art.*/gi, '')
    .replace(/l'Invocatore/gi, 'the Invoker')
    .replace(/\/Assault Mode/gi, '/Assault Mode')
    .trim();
}

function fetchYgoProDeck(card) {
  return new Promise((resolve) => {
    const rawName = card.englishName || card.name;
    const cleanName = cleanCardNameForYgo(rawName);
    const url = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?name=' + encodeURIComponent(cleanName);

    const req = https.get(url, { headers: { 'User-Agent': 'CardVault-TCG/2.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.data && j.data.length > 0) {
            const ygo = j.data[0];
            const img = ygo.card_images && ygo.card_images[0] ? ygo.card_images[0] : {};
            const prices = ygo.card_prices && ygo.card_prices[0] ? ygo.card_prices[0] : {};
            resolve({
              success: true,
              imageUrl: img.image_url_small || img.image_url || null,
              imageUrlLarge: img.image_url || null,
              imageUrlCropped: img.image_url_cropped || null,
              ygoprodeckUrl: ygo.ygoprodeck_url || ('https://ygoprodeck.com/card/' + encodeURIComponent(ygo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))),
              cardType: ygo.type || '',
              race: ygo.race || '',
              attribute: ygo.attribute || '',
              atk: ygo.atk,
              def: ygo.def,
              level: ygo.level || ygo.linkval,
              archetype: ygo.archetype || '',
              desc: ygo.desc || '',
              prices: {
                cardmarketFloor: parseFloat(prices.cardmarket_price) || 0,
                tcgplayer: parseFloat(prices.tcgplayer_price) || 0,
                ebay: parseFloat(prices.ebay_price) || 0,
                amazon: parseFloat(prices.amazon_price) || 0
              }
            });
          } else {
            // Fallback to fuzzy search
            const fuzzyUrl = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=' + encodeURIComponent(cleanName.split(' ')[0]);
            https.get(fuzzyUrl, { headers: { 'User-Agent': 'CardVault-TCG/2.0' } }, fres => {
              let fd = '';
              fres.on('data', c => fd += c);
              fres.on('end', () => {
                try {
                  const fj = JSON.parse(fd);
                  if (fj.data && fj.data.length > 0) {
                    const ygo = fj.data[0];
                    const img = ygo.card_images && ygo.card_images[0] ? ygo.card_images[0] : {};
                    resolve({
                      success: true,
                      imageUrl: img.image_url_small || img.image_url || null,
                      imageUrlLarge: img.image_url || null,
                      imageUrlCropped: img.image_url_cropped || null,
                      cardType: ygo.type || '',
                      desc: ygo.desc || '',
                      prices: {}
                    });
                  } else {
                    resolve({ success: false, reason: 'Carta non trovata su YGOPRODeck' });
                  }
                } catch(e) {
                  resolve({ success: false, reason: e.message });
                }
              });
            }).on('error', () => resolve({ success: false, reason: 'Network error fuzzy' }));
          }
        } catch(e) {
          resolve({ success: false, reason: e.message });
        }
      });
    });

    req.on('error', e => resolve({ success: false, reason: e.message }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ success: false, reason: 'Timeout richiesta YGOPRODeck' });
    });
  });
}

// JustTCG API Request Helper with Monthly Quota Tracking (1000 Calls/Month)
function fetchJustTcgPrice(card, apiKey) {
  return new Promise((resolve) => {
    const key = getJustTcgApiKey(apiKey);
    if (!key) {
      return resolve({ success: false, reason: 'Nessuna API Key JustTCG configurata' });
    }

    const usage = loadJustTcgUsage();
    if (usage.count >= usage.monthlyLimit) {
      return resolve({
        success: false,
        quotaExceeded: true,
        reason: `Limite mensile JustTCG raggiunto (${usage.count}/${usage.monthlyLimit} richieste). Riprova dopo il ${getNextResetDateStr()}.`
      });
    }

    // Registra la chiamata API nel contatore mensile
    recordJustTcgCall();

    const cardCode = (card.code || '').toUpperCase().trim();
    const cardName = card.englishName || card.name;
    const cleanName = cleanCardNameForYgo(cardName);
    const url = `https://api.justtcg.com/v1/cards?q=${encodeURIComponent(cleanName)}&game=yugioh`;

    console.log(`[JustTCG API Call #${usage.count + 1}] Ricerca: "${cleanName}" (${cardCode})`);

    const req = https.get(url, {
      headers: {
        'x-api-key': key,
        'User-Agent': 'CardVault-TCG/2.0'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.data && Array.isArray(j.data) && j.data.length > 0) {
            const cardRarity = (card.rarity || '').toLowerCase().trim();

            // 1. Cerca corrispondenza esatta per codice carta (es. SOI-EN001 o STOR-EN040)
            let match = null;
            if (cardCode) {
              const baseCode = cardCode.replace(/-IT/i, '-EN');
              match = j.data.find(item => item.number && (
                item.number.toUpperCase() === cardCode ||
                item.number.toUpperCase() === baseCode ||
                cardCode.includes(item.number.toUpperCase()) ||
                item.number.toUpperCase().includes(baseCode)
              ));
            }

            // 2. Fallback: Corrispondenza per rarità
            if (!match && cardRarity) {
              match = j.data.find(item => item.rarity && item.rarity.toLowerCase().includes(cardRarity));
            }

            // 3. Fallback: Primo risultato
            if (!match) {
              match = j.data[0];
            }

            if (match && match.variants && match.variants.length > 0) {
              // Isola la variante Near Mint / Lightly Played
              const nmVar = match.variants.find(v => v.condition === 'Near Mint' || v.condition === 'Lightly Played') || match.variants[0];
              const priceUsd = nmVar.price || 0;
              const priceEuro = priceUsd > 0 ? parseFloat((priceUsd * 0.92).toFixed(2)) : 0;
              const trendEuro = priceEuro > 0 ? parseFloat((priceEuro * 1.15).toFixed(2)) : 0;

              const stats = getJustTcgUsageStats();
              console.log(`[JustTCG Result] Trovata "${match.name}" (${match.number || match.rarity}) -> USD $${priceUsd} = EUR €${priceEuro}`);
              resolve({
                success: true,
                cardName: match.name,
                setNumber: match.number,
                rarity: match.rarity,
                cmMin: priceEuro,
                cmTrend: trendEuro,
                tcgMin: priceUsd,
                tcgTrend: parseFloat((priceUsd * 1.15).toFixed(2)),
                usage: stats
              });
              return;
            }
          }
          console.log(`[JustTCG] Nessun prezzo trovato per "${cleanName}"`);
          resolve({ success: false, reason: 'Nessun prezzo valido trovato da JustTCG' });
        } catch(e) {
          console.error('[JustTCG Parse Error]', e.message);
          resolve({ success: false, reason: e.message });
        }
      });
    });

    req.on('error', e => {
      console.error('[JustTCG Network Error]', e.message);
      resolve({ success: false, reason: e.message });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ success: false, reason: 'Timeout richiesta JustTCG' });
    });
  });
}

// Combined Multi-Marketplace Sync
async function fetchMultiMarketplaceCard(card, justTcgKey) {
  const ygoRes = await fetchYgoProDeck(card);
  let updated = { ...card };
  let logItem = {
    cardName: card.name,
    code: card.code,
    sources: []
  };

  if (ygoRes.success) {
    updated.imageUrl = ygoRes.imageUrl || updated.imageUrl;
    updated.imageUrlLarge = ygoRes.imageUrlLarge || updated.imageUrlLarge;
    updated.imageUrlCropped = ygoRes.imageUrlCropped || updated.imageUrlCropped;
    updated.cardType = ygoRes.cardType || updated.cardType;
    updated.desc = ygoRes.desc || updated.desc;
    updated.archetype = ygoRes.archetype || updated.archetype;
    updated.atk = ygoRes.atk !== undefined ? ygoRes.atk : updated.atk;
    updated.def = ygoRes.def !== undefined ? ygoRes.def : updated.def;
    updated.level = ygoRes.level !== undefined ? ygoRes.level : updated.level;
    updated.attribute = ygoRes.attribute || updated.attribute;

    logItem.sources.push('YGOPRODeck (Immagine HD & Dati)');

    // Store YGOPRODeck canonical URL and metadata
    if (ygoRes.ygoprodeckUrl) {
      updated.ygoprodeckUrl = ygoRes.ygoprodeckUrl;
    }
    // Only update eBay price from generic floor IF the card is a low-value common/bulk card (< 3 EUR)
    // to avoid overwriting high-value vintage/foil printings with 0.99$ generic reprint prices
    if (ygoRes.prices && ygoRes.prices.ebay > 0) {
      const ebEuro = parseFloat((ygoRes.prices.ebay * 0.92).toFixed(2));
      if (ebEuro > 0 && (!updated.ebMin || updated.ebMin <= 3.00)) {
        logItem.oldEbMin = updated.ebMin;
        logItem.newEbMin = ebEuro;
        updated.ebMin = ebEuro;
        updated.ebTrend = parseFloat((ebEuro * 1.2).toFixed(2));
        logItem.sources.push('eBay Base Floor');
      }
    }
  }

  // Try JustTCG if configured
  const key = getJustTcgApiKey(justTcgKey);
  if (key) {
    const justRes = await fetchJustTcgPrice(card, key);
    if (justRes.success) {
      if (justRes.cmMin > 0) {
        logItem.oldCmMin = updated.cmMin;
        logItem.newCmMin = justRes.cmMin;
        updated.cmMin = justRes.cmMin;
        logItem.sources.push('JustTCG (Cardmarket Min)');
      }
      if (justRes.cmTrend > 0) {
        logItem.oldCmTrend = updated.cmTrend;
        logItem.newCmTrend = justRes.cmTrend;
        updated.cmTrend = justRes.cmTrend;
        logItem.sources.push('JustTCG (Cardmarket Trend)');
      }
    }
  }

  return { success: true, card: updated, log: logItem };
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

  // ==========================================
  // AUTHENTICATION API ROUTES (2FA)
  // ==========================================
  if (req.url === '/api/auth/status' && req.method === 'GET') {
    const token = getBearerToken(req);
    const isValid = verifySessionToken(token);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      isSetup: authConfig.enabled,
      isAuthenticated: isValid
    }));
    return;
  }

  // Init 2FA Setup: Generate secret and OTPAuth URL (Protected against overwrite)
  if (req.url === '/api/auth/setup-init' && req.method === 'POST') {
    if (authConfig.enabled) {
      const token = getBearerToken(req);
      if (!verifySessionToken(token)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: "La protezione 2FA è già attiva su questo Vault. Solo l'amministratore autenticato può riconfigurarla."
        }));
        return;
      }
    }

    const secret = generateSecret(20);
    const otpAuthUrl = `otpauth://totp/CardVault:Fgavagnin?secret=${secret}&issuer=CardVault`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      secret: secret,
      otpAuthUrl: otpAuthUrl,
      formattedSecret: secret.match(/.{1,4}/g).join(' ')
    }));
    return;
  }

  // Complete 2FA Setup: Validate first OTP & save password (Protected against overwrite)
  if (req.url === '/api/auth/setup-complete' && req.method === 'POST') {
    if (authConfig.enabled) {
      const token = getBearerToken(req);
      if (!verifySessionToken(token)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: "Operazione non consentita: la 2FA è già stata configurata. Impossibile sovrascrivere l'account senza autenticazione."
        }));
        return;
      }
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { password, secret, otpCode } = JSON.parse(body);
        if (!password || password.length < 4) {
          throw new Error("La password deve contenere almeno 4 caratteri");
        }
        if (!secret || !verifyTOTP(secret, otpCode)) {
          throw new Error("Codice OTP non valido o scaduto. Inserisci il codice a 6 cifre visualizzato sulla tua app");
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(password, salt);

        authConfig.enabled = true;
        authConfig.passwordHash = passwordHash;
        authConfig.salt = salt;
        authConfig.totpSecret = secret;
        authConfig.sessionSecret = crypto.randomBytes(32).toString('hex');

        saveAuthConfig();

        const token = createSessionToken('admin', 30);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, token: token, message: "2FA attivata con successo!" }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Login: Check Master Password + 6-digit TOTP Code
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { password, otpCode, rememberMe } = JSON.parse(body);
        if (!authConfig.enabled) {
          // If not configured, allow access and create token
          const token = createSessionToken('admin', 30);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, token: token }));
          return;
        }

        const calculatedHash = hashPassword(password || '', authConfig.salt);
        if (calculatedHash !== authConfig.passwordHash) {
          throw new Error("Password non corretta");
        }

        if (!verifyTOTP(authConfig.totpSecret, otpCode)) {
          throw new Error("Codice OTP a 6 cifre non valido o scaduto");
        }

        const days = rememberMe ? 30 : 1;
        const token = createSessionToken('admin', days);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, token: token }));
      } catch (err) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // AUTH MIDDLEWARE FOR SENSITIVE API ENDPOINTS
  // ==========================================
  const isProtectedApi = (req.url.startsWith('/api/save') ||
                          req.url.startsWith('/api/cardtrader') ||
                          (req.url.startsWith('/api/portfolio') && req.method === 'POST'));

  if (isProtectedApi && authConfig.enabled) {
    const token = getBearerToken(req);
    if (!verifySessionToken(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Accesso non autorizzato. Effettua il login 2FA." }));
      return;
    }
  }

  // API: Status Check
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      csvPath: CSV_FILE_PATH,
      cardTraderConnected: !!CARDTRADER_TOKEN,
      twoFactorEnabled: authConfig.enabled,
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
        if (result.success && result.listingsCount > 0) {
          const currentData = getStoredPortfolio();
          const cardIdx = (currentData.cards || []).findIndex(c => c.id === card.id || c.code === card.code || c.num === card.num);
          if (cardIdx !== -1) {
            currentData.cards[cardIdx].ctMin = result.minPrice;
            currentData.cards[cardIdx].ctTrend = result.trendPrice;
            currentData.cards[cardIdx].baseCtMin = result.minPrice;
            currentData.cards[cardIdx].baseCtTrend = result.trendPrice;
            currentData.cards[cardIdx].updatedAt = new Date().toISOString();
            saveAllStores(currentData.cards, currentData.wants, new Date().toLocaleString("it-IT"));
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: JustTCG Monthly Quota Usage & Warning Stats
  if (req.url === '/api/justtcg/usage' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getJustTcgUsageStats()));
    return;
  }

  // API: Providers Configuration Status
  if (req.url === '/api/config/providers' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      cardTrader: {
        configured: !!CARDTRADER_TOKEN,
        tokenMasked: CARDTRADER_TOKEN ? (CARDTRADER_TOKEN.slice(0, 10) + '...' + CARDTRADER_TOKEN.slice(-6)) : null
      },
      justTcg: {
        configured: !!JUSTTCG_API_KEY,
        keyMasked: JUSTTCG_API_KEY ? (JUSTTCG_API_KEY.slice(0, 4) + '...' + JUSTTCG_API_KEY.slice(-4)) : null,
        usage: getJustTcgUsageStats()
      },
      ygoProDeck: {
        configured: true,
        status: "Attivo (100% Gratuito - 15 req/sec)",
        provides: "Artwork HD, Statistiche Mostri, Descrizioni, Prezzi Base TCGplayer & eBay"
      }
    }));
    return;
  }

  // API: Save Provider Configuration
  if (req.url === '/api/config/providers' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.justTcgKey !== undefined) {
          JUSTTCG_API_KEY = payload.justTcgKey.trim();
          fs.writeFileSync(JUSTTCG_TOKEN_FILE, JUSTTCG_API_KEY, 'utf-8');
        }
        if (payload.cardTraderToken !== undefined) {
          CARDTRADER_TOKEN = payload.cardTraderToken.trim();
          fs.writeFileSync(TOKEN_FILE_PATH, CARDTRADER_TOKEN, 'utf-8');
          expansionsCache = null;
          blueprintsCache.clear();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: "Impostazioni API salvate con successo!" }));
      } catch(err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Single Card Multi-Marketplace Sync (YGOPRODeck + JustTCG)
  if (req.url === '/api/marketplaces/sync-single' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const card = payload.card;
        if (!card) throw new Error("Dati carta mancanti");

        const result = await fetchMultiMarketplaceCard(card, payload.justTcgKey);
        result.card.updatedAt = new Date().toISOString();

        // Auto-save updated card immediately to all stores on disk
        const currentData = getStoredPortfolio();
        const cardIdx = (currentData.cards || []).findIndex(c => c.id === card.id || c.code === card.code || c.num === card.num);
        if (cardIdx !== -1) {
          currentData.cards[cardIdx] = result.card;
          saveAllStores(currentData.cards, currentData.wants, new Date().toLocaleString("it-IT"));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Batch Multi-Marketplace Sync for All Cards
  if (req.url === '/api/marketplaces/sync-all' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const inputCards = payload.cards || [];
        if (inputCards.length === 0) throw new Error("Lista carte vuota");

        console.log(`[Multi-Marketplace Sync] Inizio sincronizzazione per ${inputCards.length} carte...`);

        const updatedCards = [];
        const logs = [];

        for (let i = 0; i < inputCards.length; i++) {
          const card = inputCards[i];
          try {
            const resItem = await fetchMultiMarketplaceCard(card, payload.justTcgKey);
            resItem.card.updatedAt = new Date().toISOString();
            updatedCards.push(resItem.card);
            logs.push(resItem.log);
          } catch(itemErr) {
            updatedCards.push(card);
            logs.push({
              cardName: card.name,
              code: card.code,
              error: itemErr.message
            });
          }
          await new Promise(r => setTimeout(r, 100));
        }

        // Save updated cards to all disk stores immediately
        const wants = payload.wants || [];
        const lastUpdated = new Date().toLocaleString("it-IT");
        saveAllStores(updatedCards, wants, lastUpdated);

        console.log(`[Multi-Marketplace Sync] Completato! ${updatedCards.length} carte arricchite con immagini e mercati.`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          cards: updatedCards,
          logs: logs,
          message: `${updatedCards.length} carte sincronizzate con successo con YGOPRODeck, Immagini HD e Mercati Globali!`
        }));
      } catch (err) {
        console.error('[Multi-Marketplace Sync] Errore:', err);
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
              card.updatedAt = new Date().toISOString();

              logs.push({
                cardName: card.name,
                code: card.code,
                oldCtMin: oldMin,
                newCtMin: resPrice.minPrice,
                oldCtTrend: oldTrend,
                newCtTrend: resPrice.trendPrice,
                listings: resPrice.listingsCount,
                matchedListings: resPrice.matchedListingsCount,
                filterLevel: resPrice.filterLevel || 'Filtro Automatico',
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

          card.updatedAt = card.updatedAt || new Date().toISOString();
          updatedCards.push(card);
          await new Promise(r => setTimeout(r, 100));
        }

        // Save updated cards to all disk stores immediately
        const wants = payload.wants || [];
        const lastUpdated = new Date().toLocaleString("it-IT");
        saveAllStores(updatedCards, wants, lastUpdated);

        console.log(`[CardTrader Live Sync] Completato con successo! File CSV e database aggiornati.`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          cards: updatedCards,
          logs: logs,
          message: `${updatedCards.length} carte sincronizzate con CardTrader API e salvate su disco!`
        }));
      } catch (err) {
        console.error('[CardTrader Live Sync] Errore:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Get Full Portfolio & Wants (JSON)
  if (req.url === '/api/portfolio' && req.method === 'GET') {
    try {
      const data = getStoredPortfolio();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        cards: data.cards || [],
        wants: data.wants || [],
        lastUpdated: data.lastUpdated || new Date().toLocaleString("it-IT")
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API: Save Portfolio Cards & Wants (JSON & CSV)
  if ((req.url === '/api/save-portfolio' || req.url === '/api/portfolio') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const cards = payload.cards || [];
        const wants = payload.wants || [];
        const lastUpdated = payload.lastUpdated || new Date().toLocaleString("it-IT");

        saveAllStores(cards, wants, lastUpdated);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: cards.length,
          wantsCount: wants.length,
          lastUpdated: lastUpdated,
          message: 'Portfolio e Wants sincronizzati con successo sul server e su disco!'
        }));
      } catch (err) {
        console.error('[CardVault Sync] Errore salvataggio:', err);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 CardVault TCG Server attivo su: http://0.0.0.0:${PORT}`);
  console.log(`📁 File CSV collegato: ${CSV_FILE_PATH}`);
  console.log(`⚡ CardTrader API: Connessa (Token Attivo)`);
  console.log(`🔐 Sicurezza 2FA: ${authConfig.enabled ? 'Attiva' : 'In attesa di configurazione iniziale'}`);
  console.log('====================================================');
});
