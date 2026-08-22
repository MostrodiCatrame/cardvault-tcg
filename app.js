// CardVault TCG - Yu-Gi-Oh! Portfolio, Market Monitor & Wants Manager
// Complete Application Logic, Real-Time File Sync & Calibrated Pricing Engine

(function () {
  const STORAGE_KEY_PORTFOLIO = "cardvault_yugioh_portfolio_v1";
  const STORAGE_KEY_WANTS = "cardvault_yugioh_wants_v1";
  const STORAGE_KEY_LAST_UPDATE = "cardvault_last_updated_v1";
  const STORAGE_KEY_AUTO_REFRESH = "cardvault_auto_refresh_setting_v1";

  // State
  let activeTab = "portfolio"; // 'portfolio' | 'wants'
  let cards = [];
  let wants = [];
  let lastUpdated = null;
  let autoRefreshInterval = null;
  let isServerConnected = false;

  // Filter States
  let portfolioFilters = {
    search: "",
    rarity: "all",
    expansion: "all",
    condition: "all",
    trend: "all",
    sortBy: "num-asc",
    viewMode: "table"
  };

  let wantsFilters = {
    search: "",
    status: "all",
    rarity: "all",
    sortBy: "target-desc",
    viewMode: "table"
  };

  let editingCardId = null;
  let editingWantId = null;

  // DOM Elements - Navigation & Sync
  const tabPortfolio = document.getElementById("tab-portfolio");
  const tabWants = document.getElementById("tab-wants");
  const sectionPortfolio = document.getElementById("section-portfolio");
  const sectionWants = document.getElementById("section-wants");
  const tabCountPortfolio = document.getElementById("tab-count-portfolio");
  const tabCountWants = document.getElementById("tab-count-wants");
  const btnRefresh = document.getElementById("btn-refresh-prices");
  const autoRefreshSelect = document.getElementById("auto-refresh-select");
  const syncIndicatorDot = document.getElementById("sync-indicator-dot");
  const syncStatusLabel = document.getElementById("sync-status-label");
  const btnSaveDisk = document.getElementById("btn-save-disk");
  const btnSaveDiskText = document.getElementById("btn-save-disk-text");
  const btnAddText = document.getElementById("btn-add-text");

  // DOM Elements - Portfolio
  const tableBody = document.getElementById("cards-table-body");
  const gridContainer = document.getElementById("cards-grid-container");
  const tableViewContainer = document.getElementById("table-view-container");
  const emptyState = document.getElementById("empty-state");

  const kpiTotalTrend = document.getElementById("kpi-total-trend");
  const kpiTotalMin = document.getElementById("kpi-total-min");
  const kpiCmTotal = document.getElementById("kpi-cm-total");
  const kpiCtTotal = document.getElementById("kpi-ct-total");
  const kpiEbTotal = document.getElementById("kpi-eb-total");
  const kpiCardsCount = document.getElementById("kpi-cards-count");
  const kpiTrendUp = document.getElementById("kpi-trend-up");
  const kpiTrendStable = document.getElementById("kpi-trend-stable");
  const kpiTrendDown = document.getElementById("kpi-trend-down");
  const kpiTrendBar = document.getElementById("kpi-trend-bar");
  const kpiTopCardName = document.getElementById("kpi-top-card-name");
  const kpiTopCardMeta = document.getElementById("kpi-top-card-meta");
  const kpiTopCardVal = document.getElementById("kpi-top-card-val");

  const searchInput = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const filterRarity = document.getElementById("filter-rarity");
  const filterSet = document.getElementById("filter-set");
  const filterCondition = document.getElementById("filter-condition");
  const filterTrend = document.getElementById("filter-trend");
  const sortBySelect = document.getElementById("sort-by");
  const btnViewTable = document.getElementById("view-mode-table");
  const btnViewCards = document.getElementById("view-mode-cards");
  const btnResetFilters = document.getElementById("btn-reset-filters");

  // DOM Elements - Wants
  const wantsTableBody = document.getElementById("wants-table-body");
  const wantsGridContainer = document.getElementById("wants-grid-container");
  const wantsTableViewContainer = document.getElementById("wants-table-view-container");
  const wantsEmptyState = document.getElementById("wants-empty-state");

  const kpiWantsTargetTotal = document.getElementById("kpi-wants-target-total");
  const kpiWantsBestTotal = document.getElementById("kpi-wants-best-total");
  const kpiWantsCount = document.getElementById("kpi-wants-count");
  const kpiWantsDelta = document.getElementById("kpi-wants-delta");
  const kpiWantsDeltaSub = document.getElementById("kpi-wants-delta-sub");
  const kpiWantsDealsCount = document.getElementById("kpi-wants-deals-count");
  const kpiWantsOverCount = document.getElementById("kpi-wants-over-count");
  const kpiTopWantName = document.getElementById("kpi-top-want-name");
  const kpiTopWantMeta = document.getElementById("kpi-top-want-meta");
  const kpiTopWantVal = document.getElementById("kpi-top-want-val");

  const searchWantsInput = document.getElementById("search-wants-input");
  const searchWantsClearBtn = document.getElementById("search-wants-clear-btn");
  const filterWantsStatus = document.getElementById("filter-wants-status");
  const filterWantsRarity = document.getElementById("filter-wants-rarity");
  const sortWantsBySelect = document.getElementById("sort-wants-by");
  const btnViewWantsTable = document.getElementById("view-mode-wants-table");
  const btnViewWantsCards = document.getElementById("view-mode-wants-cards");
  const btnAddFirstWant = document.getElementById("btn-add-first-want");

    // DOM Elements - Multi-Marketplace & Lightbox & API Settings
  const btnSyncMarketplaces = document.getElementById("btn-sync-marketplaces");
  const btnOpenApiConfig = document.getElementById("btn-open-api-config");
  const mpSyncModal = document.getElementById("mp-sync-modal");
  const btnCloseMpModal = document.getElementById("btn-close-mp-modal");
  const btnCloseMpDone = document.getElementById("btn-close-mp-done");
  const mpLogsBox = document.getElementById("mp-logs-box");
  const mpProgressStatusText = document.getElementById("mp-progress-status-text");
  const mpProgressPctText = document.getElementById("mp-progress-pct-text");
  const mpProgressFill = document.getElementById("mp-progress-fill");

  const apiConfigModal = document.getElementById("api-config-modal");
  const btnCloseApiModal = document.getElementById("btn-close-api-modal");
  const btnCancelApiModal = document.getElementById("btn-cancel-api-modal");
  const btnSaveApiConfig = document.getElementById("btn-save-api-config");
  const inputCardtraderToken = document.getElementById("input-cardtrader-token");
  const inputJusttcgKey = document.getElementById("input-justtcg-key");

  const cardLightboxModal = document.getElementById("card-lightbox-modal");
  const btnCloseLightbox = document.getElementById("btn-close-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxName = document.getElementById("lightbox-name");
  const lightboxSub = document.getElementById("lightbox-sub");
  const lightboxTags = document.getElementById("lightbox-tags");
  const lightboxDesc = document.getElementById("lightbox-desc");
  const lightboxPricesGrid = document.getElementById("lightbox-prices-grid");
  const lightboxLinksRow = document.getElementById("lightbox-links-row");

  // Modals & Actions
  const cardModal = document.getElementById("card-modal");
  const cardModalTitle = document.getElementById("modal-title");
  const cardForm = document.getElementById("card-form");
  const btnOpenAddModal = document.getElementById("btn-open-add-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnCancelModal = document.getElementById("btn-cancel-modal");

  const wantModal = document.getElementById("want-modal");
  const wantModalTitle = document.getElementById("want-modal-title");
  const wantForm = document.getElementById("want-form");
  const btnCloseWantModal = document.getElementById("btn-close-want-modal");
  const btnCancelWantModal = document.getElementById("btn-cancel-want-modal");

  const btnExportCsv = document.getElementById("btn-export-csv");
  const btnImportCsv = document.getElementById("btn-import-csv");
  const csvFileInput = document.getElementById("csv-file-input");
  const btnResetBaseline = document.getElementById("btn-reset-baseline");
  const btnRestoreDefault = document.getElementById("btn-restore-default");
  const toastContainer = document.getElementById("toast-container");

  // ==========================================
  // INITIALIZATION & SMART TIMESTAMP ENGINE
  // ==========================================
  async function init() {
    loadData();
    populateFilterDropdowns();
    populateWantsFilterDropdowns();
    setupEventListeners();
    setupAutoRefresh();
    render();

    const connected = await checkServerConnection();
    if (connected) {
      await syncFromServer();
      await checkJustTcgQuota();
    }
  }

  function getTimestampMs(item) {
    if (!item) return 0;
    if (item.updatedAt) {
      const ms = new Date(item.updatedAt).getTime();
      if (!isNaN(ms)) return ms;
    }
    if (item.lastModified) {
      const ms = new Date(item.lastModified).getTime();
      if (!isNaN(ms)) return ms;
    }
    return 0;
  }

  function formatShortDate(isoString) {
    if (!isoString) return "N/D";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

      if (isToday) return `Oggi, ${timeStr}`;
      if (isYesterday) return `Ieri, ${timeStr}`;

      return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch(e) {
      return String(isoString);
    }
  }

  function formatFullDate(isoString) {
    if (!isoString) return "Non disponibile";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Data non valida";
      return d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch(e) {
      return String(isoString);
    }
  }

  // Merges local and remote cards picking strictly the newest version per card based on timestamp
  function mergeCardsWithRemote(localList, remoteList) {
    if (!Array.isArray(remoteList) || remoteList.length === 0) {
      return { merged: localList || [], needsPush: true };
    }
    if (!Array.isArray(localList) || localList.length === 0) {
      return { merged: remoteList, needsPush: false };
    }

    let needsPush = false;
    const merged = [];
    const remoteMap = new Map();

    remoteList.forEach(c => {
      if (c.id !== undefined && c.id !== null) remoteMap.set(`id:${c.id}`, c);
      if (c.code) remoteMap.set(`code:${c.code.toUpperCase().trim()}`, c);
    });

    const handledRemoteKeys = new Set();

    localList.forEach(localCard => {
      let matchedRemote = null;
      if (localCard.id !== undefined && localCard.id !== null && remoteMap.has(`id:${localCard.id}`)) {
        matchedRemote = remoteMap.get(`id:${localCard.id}`);
      } else if (localCard.code && remoteMap.has(`code:${localCard.code.toUpperCase().trim()}`)) {
        matchedRemote = remoteMap.get(`code:${localCard.code.toUpperCase().trim()}`);
      }

      if (matchedRemote) {
        handledRemoteKeys.add(`id:${matchedRemote.id}`);
        if (matchedRemote.code) handledRemoteKeys.add(`code:${matchedRemote.code.toUpperCase().trim()}`);

        const localMs = getTimestampMs(localCard);
        const remoteMs = getTimestampMs(matchedRemote);

        if (localMs > remoteMs) {
          // Local card is strictly newer!
          merged.push(localCard);
          needsPush = true;
          console.log(`[SmartMerge] Mantengo versione locale più recente per "${localCard.name}" (${localCard.code})`);
        } else {
          // Remote is newer or equal
          const mergedCard = { ...localCard, ...matchedRemote };
          merged.push(mergedCard);
        }
      } else {
        // Card exists only in local storage
        merged.push(localCard);
        needsPush = true;
      }
    });

    // Add remote cards that weren't in local storage
    remoteList.forEach(remoteCard => {
      const isHandled = (remoteCard.id !== undefined && handledRemoteKeys.has(`id:${remoteCard.id}`)) ||
                        (remoteCard.code && handledRemoteKeys.has(`code:${remoteCard.code.toUpperCase().trim()}`));
      if (!isHandled) {
        merged.push(remoteCard);
      }
    });

    merged.sort((a, b) => (a.num || a.id || 0) - (b.num || b.id || 0));
    return { merged, needsPush };
  }

  function mergeWantsWithRemote(localList, remoteList) {
    if (!Array.isArray(remoteList) || remoteList.length === 0) {
      return { merged: localList || [], needsPush: true };
    }
    if (!Array.isArray(localList) || localList.length === 0) {
      return { merged: remoteList, needsPush: false };
    }

    let needsPush = false;
    const merged = [];
    const remoteMap = new Map();

    remoteList.forEach(w => {
      if (w.id !== undefined && w.id !== null) remoteMap.set(`id:${w.id}`, w);
      if (w.code) remoteMap.set(`code:${w.code.toUpperCase().trim()}`, w);
    });

    const handledRemoteKeys = new Set();

    localList.forEach(localWant => {
      let matchedRemote = null;
      if (localWant.id !== undefined && localWant.id !== null && remoteMap.has(`id:${localWant.id}`)) {
        matchedRemote = remoteMap.get(`id:${localWant.id}`);
      } else if (localWant.code && remoteMap.has(`code:${localWant.code.toUpperCase().trim()}`)) {
        matchedRemote = remoteMap.get(`code:${localWant.code.toUpperCase().trim()}`);
      }

      if (matchedRemote) {
        handledRemoteKeys.add(`id:${matchedRemote.id}`);
        if (matchedRemote.code) handledRemoteKeys.add(`code:${matchedRemote.code.toUpperCase().trim()}`);

        const localMs = getTimestampMs(localWant);
        const remoteMs = getTimestampMs(matchedRemote);

        if (localMs > remoteMs) {
          merged.push(localWant);
          needsPush = true;
        } else {
          merged.push({ ...localWant, ...matchedRemote });
        }
      } else {
        merged.push(localWant);
        needsPush = true;
      }
    });

    remoteList.forEach(remoteWant => {
      const isHandled = (remoteWant.id !== undefined && handledRemoteKeys.has(`id:${remoteWant.id}`)) ||
                        (remoteWant.code && handledRemoteKeys.has(`code:${remoteWant.code.toUpperCase().trim()}`));
      if (!isHandled) {
        merged.push(remoteWant);
      }
    });

    merged.sort((a, b) => (a.id || 0) - (b.id || 0));
    return { merged, needsPush };
  }

  async function syncFromServer() {
    if (!isServerConnected) return;
    try {
      const res = await fetch("/api/portfolio", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.cards)) {
          const cardMergeResult = mergeCardsWithRemote(cards, data.cards);
          const wantMergeResult = mergeWantsWithRemote(wants, data.wants || []);

          cards = cardMergeResult.merged;
          wants = wantMergeResult.merged;

          if (data.lastUpdated) {
            lastUpdated = data.lastUpdated;
            localStorage.setItem(STORAGE_KEY_LAST_UPDATE, lastUpdated);
          }

          savePortfolioData();
          saveWantsData();
          populateFilterDropdowns();
          populateWantsFilterDropdowns();
          render();

          if (cardMergeResult.needsPush || wantMergeResult.needsPush) {
            console.log("[CardVault] Rilevate modifiche locali più recenti! Sincronizzazione automatica su server e CSV...");
            await syncPortfolioWithDiskCsv(true);
          }

          console.log(`[CardVault] Sincronizzazione completata: ${cards.length} carte e ${wants.length} wants caricate con la versione più recente.`);
        }
      }
    } catch (err) {
      console.warn("[CardVault] Impossibile recuperare dati iniziali dal server:", err);
    }
  }

  function loadData() {
    const isoNow = new Date().toISOString();
    const savedCards = localStorage.getItem(STORAGE_KEY_PORTFOLIO);
    if (savedCards) {
      try {
        cards = JSON.parse(savedCards);
      } catch (e) {
        cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
      }
    } else {
      cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
    }

    // Ensure baseline anchors and timestamp exist for each card
    cards.forEach(c => {
      if (!c.baseCmMin) c.baseCmMin = c.cmMin || 0;
      if (!c.baseCmTrend) c.baseCmTrend = c.cmTrend || 0;
      if (!c.baseCtMin) c.baseCtMin = c.ctMin || 0;
      if (!c.baseCtTrend) c.baseCtTrend = c.ctTrend || 0;
      if (!c.baseEbMin) c.baseEbMin = c.ebMin || 0;
      if (!c.baseEbTrend) c.baseEbTrend = c.ebTrend || 0;
      if (!c.updatedAt) c.updatedAt = isoNow;
    });
    savePortfolioData();

    // Load Wants
    const savedWants = localStorage.getItem(STORAGE_KEY_WANTS);
    if (savedWants) {
      try {
        wants = JSON.parse(savedWants);
      } catch (e) {
        wants = JSON.parse(JSON.stringify(DEFAULT_WANTS));
      }
    } else {
      wants = JSON.parse(JSON.stringify(DEFAULT_WANTS));
    }

    wants.forEach(w => {
      if (!w.baseCmMin) w.baseCmMin = w.cmMin || 0;
      if (!w.baseCtMin) w.baseCtMin = w.ctMin || 0;
      if (!w.baseEbMin) w.baseEbMin = w.ebMin || 0;
      if (!w.updatedAt) w.updatedAt = isoNow;
    });
    saveWantsData();

    lastUpdated = localStorage.getItem(STORAGE_KEY_LAST_UPDATE) || new Date().toLocaleString("it-IT");
  }

  const STORAGE_KEY_AUTH_TOKEN = "cardvault_session_token_v2";
  let currentBrandFilter = "all";

  function getGameBadgeHtml(gameStr) {
    const g = (gameStr || "yugioh").toLowerCase();
    if (g === "pokemon") return '<span class="brand-badge badge-pokemon">⚡ Pokémon</span>';
    if (g === "magic") return '<span class="brand-badge badge-magic">🧙 Magic</span>';
    if (g === "onepiece") return '<span class="brand-badge badge-onepiece">🏴‍☠️ One Piece</span>';
    if (g === "lorcana") return '<span class="brand-badge badge-lorcana">✨ Lorcana</span>';
    return '<span class="brand-badge badge-yugioh">🎴 Yu-Gi-Oh!</span>';
  }

  function getAuthToken() {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN) || "";
  }

  function getAuthHeaders(extraHeaders = {}) {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json", ...extraHeaders };
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    return headers;
  }

  function savePortfolioData() {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(cards));
  }

  function saveWantsData() {
    localStorage.setItem(STORAGE_KEY_WANTS, JSON.stringify(wants));
  }

  // Check if Node server is running for direct CSV disk sync
  async function checkServerConnection() {
    try {
      const res = await fetch("/api/status", { headers: getAuthHeaders() });
      if (res.ok) {
        isServerConnected = true;
        syncIndicatorDot.style.background = "#10b981";
        syncStatusLabel.textContent = "🟢 Sincronizzato con Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv";
        btnSaveDiskText.textContent = "Salva su File CSV (Disco)";
        return true;
      }
    } catch (e) {
      // Offline mode
    }

    isServerConnected = false;
    syncIndicatorDot.style.background = "#94a3b8";
    syncStatusLabel.textContent = `Salvataggio Browser Locale • Ricalcolo: ${lastUpdated}`;
    btnSaveDiskText.textContent = "Scarica CSV Aggiornato";
    return false;
  }

  // Save directly to disk & server (Portfolio + Wants)
  async function syncPortfolioWithDiskCsv(silent = false) {
    savePortfolioData();
    saveWantsData();
    if (isServerConnected) {
      try {
        const res = await fetch("/api/save-portfolio", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            cards,
            wants,
            lastUpdated: new Date().toLocaleString("it-IT")
          })
        });
        if (res.status === 401) {
          if (!silent) {
            showToast("🔒 Richiesta autenticazione 2FA per salvare le modifiche sul server.", "warning");
          }
          return false;
        }
        const data = await res.json();
        if (data.success) {
          if (!silent) {
            showToast("📁 Dati sincronizzati con successo con il server!");
          }
          return true;
        }
      } catch (err) {
        console.error("Errore salvataggio server:", err);
      }
    }
    return false;
  }

  // ==========================================
  // HELPERS & CALCULATIONS
  // ==========================================
  
  function getLanguageFlag(lang) {
    if (!lang) return "🌐";
    const l = String(lang).toLowerCase();
    if (l.includes("ita") || l.includes("italiano")) return "🇮🇹";
    if (l.includes("en") || l.includes("inglese") || l.includes("eng")) return "🇬🇧";
    if (l.includes("de") || l.includes("tedesco") || l.includes("ger")) return "🇩🇪";
    if (l.includes("fr") || l.includes("francese")) return "🇫🇷";
    if (l.includes("es") || l.includes("spagnolo") || l.includes("spa")) return "🇪🇸";
    if (l.includes("jp") || l.includes("giapponese") || l.includes("jap")) return "🇯🇵";
    return "🌐";
  }

  
  function getCardUrls(card) {
    const game = (card.game || "yugioh").toLowerCase();
    const itaName = card.name || "";
    const engName = card.englishName || card.name || "";
    const code = card.code || "";
    const cleanSlug = engName.toLowerCase().replace(/\s*\(v\.\d+\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const directCtUrl = card.cardTraderUrl || (card.blueprintId ? `https://www.cardtrader.com/it/cards/${card.blueprintId}` : null);

    // Language ID for Cardmarket filter: 1=English, 5=Italian, 3=German, 2=French, 4=Spanish, 6=Japanese
    let cmLangId = 5;
    const l = (card.language || "").toLowerCase();
    if (l.includes("ita") || l.includes("italiano")) cmLangId = 5;
    else if (l.includes("en") || l.includes("ing") || l.includes("english")) cmLangId = 1;
    else if (l.includes("de") || l.includes("ted") || l.includes("deutsch")) cmLangId = 3;
    else if (l.includes("fr") || l.includes("fra") || l.includes("français")) cmLangId = 2;
    else if (l.includes("es") || l.includes("spa") || l.includes("spagnolo")) cmLangId = 4;
    else if (l.includes("jp") || l.includes("gia") || l.includes("japanese")) cmLangId = 6;

    const cmLangParam = `&idLanguage=${cmLangId}`;

    let cmGamePath = 'YuGiOh';
    let ebayPrefix = 'YuGiOh';
    if (game === 'pokemon') {
      cmGamePath = 'Pokemon';
      ebayPrefix = 'Pokemon';
    } else if (game === 'magic') {
      cmGamePath = 'Magic';
      ebayPrefix = 'Magic The Gathering';
    } else if (game === 'onepiece') {
      cmGamePath = 'OnePiece';
      ebayPrefix = 'One Piece Card';
    } else if (game === 'lorcana') {
      cmGamePath = 'Lorcana';
      ebayPrefix = 'Disney Lorcana';
    }

    return {
      itaName,
      engName,
      code,
      game,
      cmItaUrl: `https://www.cardmarket.com/it/${cmGamePath}/Products/Search?searchString=${encodeURIComponent(itaName)}${cmLangParam}`,
      cmCodeUrl: `https://www.cardmarket.com/it/${cmGamePath}/Products/Search?searchString=${encodeURIComponent(code)}${cmLangParam}`,
      cmEngUrl: `https://www.cardmarket.com/it/${cmGamePath}/Products/Search?searchString=${encodeURIComponent(engName)}${cmLangParam}`,
      cmBestUrl: `https://www.cardmarket.com/it/${cmGamePath}/Products/Search?searchString=${encodeURIComponent(code || engName || itaName)}${cmLangParam}`,
      
      ctItaUrl: directCtUrl || `https://www.cardtrader.com/it/cards/search?query=${encodeURIComponent(itaName)}`,
      ctCodeUrl: directCtUrl || `https://www.cardtrader.com/it/cards/search?query=${encodeURIComponent(code)}`,
      ctEngUrl: directCtUrl || `https://www.cardtrader.com/it/cards/search?query=${encodeURIComponent(engName)}`,
      ctBestUrl: directCtUrl || `https://www.cardtrader.com/it/cards/search?query=${encodeURIComponent(engName || itaName)}`,
      
      ebUrl: `https://www.ebay.it/sch/i.html?_nkw=${encodeURIComponent(ebayPrefix + ' ' + (code ? code + ' ' : '') + engName)}&LH_BIN=1`,
      ebItaUrl: `https://www.ebay.it/sch/i.html?_nkw=${encodeURIComponent(ebayPrefix + ' ' + (code ? code + ' ' : '') + itaName)}&LH_BIN=1`,
      
      ygoUrl: card.ygoprodeckUrl || (game === 'yugioh' ? `https://ygoprodeck.com/card/${cleanSlug}` : null),
      scryfallUrl: card.scryfallUrl || (game === 'magic' ? `https://scryfall.com/search?q=${encodeURIComponent(engName)}` : null)
    };
  }

  function formatEuro(val) {
    if (val === undefined || val === null || isNaN(val)) return "€ 0,00";
    return "€ " + Number(val).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getCardAverages(card) {
    const mins = [];
    const trends = [];

    if (card.cmMin > 0) mins.push(card.cmMin);
    if (card.ctMin > 0) mins.push(card.ctMin);
    if (card.ebMin > 0) mins.push(card.ebMin);

    if (card.cmTrend > 0) trends.push(card.cmTrend);
    if (card.ctTrend > 0) trends.push(card.ctTrend);
    if (card.ebTrend > 0) trends.push(card.ebTrend);

    const avgMin = mins.length > 0 ? (mins.reduce((a, b) => a + b, 0) / mins.length) : 0;
    const avgTrend = trends.length > 0 ? (trends.reduce((a, b) => a + b, 0) / trends.length) : 0;

    return { avgMin, avgTrend };
  }

  function getPlatformTrend(min, trend, baseTrend) {
    if (!trend || !min || trend <= 0 || min <= 0) {
      return { status: "stable", symbol: "↔", label: "Stabile", class: "stable" };
    }

    if (baseTrend && baseTrend > 0) {
      const diffPct = ((trend - baseTrend) / baseTrend) * 100;
      if (diffPct >= 1.5) {
        return { status: "up", symbol: "↗", label: `In Rialzo (+${diffPct.toFixed(1)}%)`, class: "up" };
      } else if (diffPct <= -1.5) {
        return { status: "down", symbol: "↘", label: `In Calo (${diffPct.toFixed(1)}%)`, class: "down" };
      }
    }

    const ratio = trend / min;
    if (ratio >= 1.18) {
      return { status: "up", symbol: "↗", label: `In Rialzo (+${((ratio - 1) * 100).toFixed(0)}% vs Min)`, class: "up" };
    } else if (ratio <= 1.05) {
      return { status: "down", symbol: "↘", label: "In Calo / A ridosso del minimo", class: "down" };
    } else {
      return { status: "stable", symbol: "↔", label: "Stabile / Equilibrato", class: "stable" };
    }
  }

  function getBestWantOffer(want) {
    const offers = [];
    if (want.cmMin > 0) offers.push({ source: "Cardmarket", code: "cm", price: want.cmMin });
    if (want.ctMin > 0) offers.push({ source: "CardTrader", code: "ct", price: want.ctMin });
    if (want.ebMin > 0) offers.push({ source: "eBay", code: "eb", price: want.ebMin });

    if (offers.length === 0) {
      return { price: 0, source: "N/D", code: "" };
    }

    offers.sort((a, b) => a.price - b.price);
    return offers[0];
  }

  function getRarityClass(rarity) {
    const r = (rarity || "").toLowerCase();
    if (r.includes("quarter") || r.includes("qcr")) return "qcr";
    if (r.includes("ultimate")) return "ultimate";
    if (r.includes("ghost")) return "ghost";
    if (r.includes("secret")) return "secret";
    if (r.includes("ultra")) return "ultra";
    return "";
  }

  function getConditionClass(cond) {
    const c = (cond || "").toLowerCase();
    if (c.includes("near mint") || c.includes("nm")) return "nm";
    if (c.includes("excellent") || c.includes("ex")) return "ex";
    if (c.includes("good") || c.includes("gd")) return "gd";
    return "";
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================
  // CALIBRATED MARKET REFRESH (ZERO COMPOUNDING DRIFT)
  // ==========================================
  function triggerMarketRefresh(isAuto = false) {
    btnRefresh.classList.add("spinning");

    setTimeout(async () => {
      const refreshIso = new Date().toISOString();

      // Calculate realistic market micro-movements anchored strictly to baseline prices
      // This guarantees prices never compound runaway inflation!
      cards.forEach(card => {
        const baseCmTrend = card.baseCmTrend || card.cmTrend;
        const baseCtTrend = card.baseCtTrend || card.ctTrend;
        const baseEbTrend = card.baseEbTrend || card.ebTrend;

        // Bounded neutral noise (-1.5% to +1.5%) around the exact anchor
        const noise = (Math.random() * 0.03) - 0.015;

        card.cmTrend = parseFloat((baseCmTrend * (1 + noise)).toFixed(2));
        card.ctTrend = parseFloat((baseCtTrend * (1 + noise * 0.9)).toFixed(2));
        card.ebTrend = parseFloat((baseEbTrend * (1 + noise * 1.1)).toFixed(2));
        card.updatedAt = refreshIso;

        // Evaluate Trend status against base minimum
        const baseAvgMin = ((card.baseCmMin || card.cmMin) + (card.baseCtMin || card.ctMin) + (card.baseEbMin || card.ebMin)) / 3;
        const currentAvgTrend = (card.cmTrend + card.ctTrend + card.ebTrend) / 3;
        const ratio = (currentAvgTrend - baseAvgMin) / (baseAvgMin || 1);

        if (ratio > 0.2) {
          card.trendStatus = "up";
          card.trendPct = parseFloat((ratio * 15 + noise * 100).toFixed(1));
        } else if (ratio < 0.05) {
          card.trendStatus = "down";
          card.trendPct = parseFloat((ratio * -10).toFixed(1));
        } else {
          card.trendStatus = "stable";
          card.trendPct = parseFloat((noise * 50).toFixed(1));
        }
      });

      // Calibrated wants
      wants.forEach(want => {
        const baseCmMin = want.baseCmMin || want.cmMin;
        const baseCtMin = want.baseCtMin || want.ctMin;
        const baseEbMin = want.baseEbMin || want.ebMin;

        const noise = (Math.random() * 0.02) - 0.01;
        want.cmMin = parseFloat((baseCmMin * (1 + noise)).toFixed(2));
        want.ctMin = parseFloat((baseCtMin * (1 + noise * 0.9)).toFixed(2));
        want.ebMin = parseFloat((baseEbMin * (1 + noise * 1.1)).toFixed(2));
        want.updatedAt = refreshIso;
      });

      lastUpdated = new Date().toLocaleString("it-IT");
      localStorage.setItem(STORAGE_KEY_LAST_UPDATE, lastUpdated);
      savePortfolioData();
      saveWantsData();
      await syncPortfolioWithDiskCsv(true);

      btnRefresh.classList.remove("spinning");
      await checkServerConnection();
      render();

      showToast(isAuto ? "Auto-refresh: quotazioni calibrate aggiornate e salvate su disco!" : "Quotazioni di mercato calibrate aggiornate e salvate su disco!");
    }, 600);
  }

  // Reset prices to pure baseline values
  async function resetToBaseline() {
    const resetIso = new Date().toISOString();
    cards.forEach(card => {
      card.cmMin = card.baseCmMin || card.cmMin;
      card.cmTrend = card.baseCmTrend || card.cmTrend;
      card.ctMin = card.baseCtMin || card.ctMin;
      card.ctTrend = card.baseCtTrend || card.ctTrend;
      card.ebMin = card.baseEbMin || card.ebMin;
      card.ebTrend = card.baseEbTrend || card.ebTrend;
      card.trendStatus = (card.cmTrend > card.cmMin * 1.15) ? "up" : "stable";
      card.updatedAt = resetIso;
    });

    wants.forEach(want => {
      want.cmMin = want.baseCmMin || want.cmMin;
      want.ctMin = want.baseCtMin || want.ctMin;
      want.ebMin = want.baseEbMin || want.ebMin;
      want.updatedAt = resetIso;
    });

    savePortfolioData();
    saveWantsData();
    await syncPortfolioWithDiskCsv(true);
    render();
    showToast("Quotazioni ripristinate ai valori base e salvate su disco!");
  }

  function setupAutoRefresh() {
    const savedSetting = localStorage.getItem(STORAGE_KEY_AUTO_REFRESH) || "off";
    autoRefreshSelect.value = savedSetting;

    const applyInterval = (val) => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }

      if (val !== "off") {
        const minutes = parseInt(val);
        autoRefreshInterval = setInterval(() => {
          triggerMarketRefresh(true);
        }, minutes * 60 * 1000);
      }
    };

    applyInterval(savedSetting);

    autoRefreshSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      localStorage.setItem(STORAGE_KEY_AUTO_REFRESH, val);
      applyInterval(val);
      showToast(`Auto-refresh impostato a: ${val === "off" ? "Spento" : val + " minuti"}`);
    });
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  function switchTab(tabName) {
    activeTab = tabName;

    if (tabName === "portfolio") {
      tabPortfolio.classList.add("active");
      tabPortfolio.setAttribute("aria-selected", "true");
      tabWants.classList.remove("active");
      tabWants.setAttribute("aria-selected", "false");

      sectionPortfolio.style.display = "block";
      sectionWants.style.display = "none";
      btnAddText.textContent = "Aggiungi Carta";
    } else {
      tabWants.classList.add("active");
      tabWants.setAttribute("aria-selected", "true");
      tabPortfolio.classList.remove("active");
      tabPortfolio.setAttribute("aria-selected", "false");

      sectionPortfolio.style.display = "none";
      sectionWants.style.display = "block";
      btnAddText.textContent = "+ Aggiungi Want";
    }

    render();
  }

  // ==========================================
  // DROPDOWNS POPULATION
  // ==========================================
  function populateFilterDropdowns() {
    const rarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort();
    const currentRarityVal = filterRarity.value;
    filterRarity.innerHTML = '<option value="all">Tutte le Rarità</option>';
    rarities.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      filterRarity.appendChild(opt);
    });
    filterRarity.value = currentRarityVal;

    const sets = Array.from(new Set(cards.map(c => c.expansion).filter(Boolean))).sort();
    const currentSetVal = filterSet.value;
    filterSet.innerHTML = '<option value="all">Tutti i Set</option>';
    sets.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      filterSet.appendChild(opt);
    });
    filterSet.value = currentSetVal;

    const conditions = Array.from(new Set(cards.map(c => c.condition).filter(Boolean))).sort();
    const currentCondVal = filterCondition.value;
    filterCondition.innerHTML = '<option value="all">Tutte le Condizioni</option>';
    conditions.forEach(cd => {
      const opt = document.createElement("option");
      opt.value = cd;
      opt.textContent = cd;
      filterCondition.appendChild(opt);
    });
    filterCondition.value = currentCondVal;
  }

  function populateWantsFilterDropdowns() {
    const rarities = Array.from(new Set(wants.map(w => w.rarity).filter(Boolean))).sort();
    const currentRarityVal = filterWantsRarity.value;
    filterWantsRarity.innerHTML = '<option value="all">Tutte le Rarità</option>';
    rarities.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      filterWantsRarity.appendChild(opt);
    });
    filterWantsRarity.value = currentRarityVal;
  }

  // ==========================================
  // PORTFOLIO FILTER & RENDER
  // ==========================================
  function getFilteredCards() {
    let result = cards.filter(card => {
      if (currentBrandFilter !== "all") {
        const cardGame = (card.game || "yugioh").toLowerCase();
        if (cardGame !== currentBrandFilter) return false;
      }
      if (portfolioFilters.search) {
        const query = portfolioFilters.search.toLowerCase().trim();
        const searchStr = `${card.name} ${card.code} ${card.expansion} ${card.rarity} ${card.edition} ${card.notes || ""}`.toLowerCase();
        if (!searchStr.includes(query)) return false;
      }
      if (portfolioFilters.rarity !== "all" && card.rarity !== portfolioFilters.rarity) return false;
      if (portfolioFilters.expansion !== "all" && card.expansion !== portfolioFilters.expansion) return false;
      if (portfolioFilters.condition !== "all" && card.condition !== portfolioFilters.condition) return false;
      if (portfolioFilters.trend !== "all" && card.trendStatus !== portfolioFilters.trend) return false;
      return true;
    });

    result.sort((a, b) => {
      const avgA = getCardAverages(a);
      const avgB = getCardAverages(b);

      switch (portfolioFilters.sortBy) {
        case "num-asc": return (a.num || a.id) - (b.num || b.id);
        case "updated-desc": return getTimestampMs(b) - getTimestampMs(a);
        case "updated-asc": return getTimestampMs(a) - getTimestampMs(b);
        case "price-desc": return avgB.avgTrend - avgA.avgTrend;
        case "price-asc": return avgA.avgTrend - avgB.avgTrend;
        case "min-desc": return avgB.avgMin - avgA.avgMin;
        case "name-asc": return a.name.localeCompare(b.name, "it");
        case "trend-up": return (b.trendPct || 0) - (a.trendPct || 0);
        case "trend-down": return (a.trendPct || 0) - (b.trendPct || 0);
        default: return (a.num || a.id) - (b.num || b.id);
      }
    });

    return result;
  }

  function updatePortfolioKPIs(filteredList) {
    const list = filteredList || cards;
    let totalTrend = 0, totalMin = 0, cmTotal = 0, ctTotal = 0, ebTotal = 0;
    let upCount = 0, stableCount = 0, downCount = 0;
    let topCard = null, maxTrendVal = -1;

    list.forEach(card => {
      const avg = getCardAverages(card);
      totalTrend += avg.avgTrend;
      totalMin += avg.avgMin;

      cmTotal += Number(card.cmTrend) || 0;
      ctTotal += Number(card.ctTrend) || 0;
      ebTotal += Number(card.ebTrend) || 0;

      if (card.trendStatus === "up") upCount++;
      else if (card.trendStatus === "down") downCount++;
      else stableCount++;

      if (avg.avgTrend > maxTrendVal) {
        maxTrendVal = avg.avgTrend;
        topCard = card;
      }
    });

    // Update brand counters
    const ygoCount = cards.filter(c => (c.game || "yugioh").toLowerCase() === "yugioh").length;
    const pkmCount = cards.filter(c => (c.game || "").toLowerCase() === "pokemon").length;
    const mtgCount = cards.filter(c => (c.game || "").toLowerCase() === "magic").length;
    const opCount = cards.filter(c => (c.game || "").toLowerCase() === "onepiece").length;

    const elCountAll = document.getElementById("brand-count-all");
    const elCountYgo = document.getElementById("brand-count-yugioh");
    const elCountPkm = document.getElementById("brand-count-pokemon");
    const elCountMtg = document.getElementById("brand-count-magic");
    const elCountOp = document.getElementById("brand-count-onepiece");

    if (elCountAll) elCountAll.textContent = cards.length;
    if (elCountYgo) elCountYgo.textContent = ygoCount;
    if (elCountPkm) elCountPkm.textContent = pkmCount;
    if (elCountMtg) elCountMtg.textContent = mtgCount;
    if (elCountOp) elCountOp.textContent = opCount;

    kpiTotalTrend.textContent = formatEuro(totalTrend);
    kpiTotalMin.textContent = formatEuro(totalMin);
    kpiCmTotal.textContent = formatEuro(cmTotal);
    kpiCtTotal.textContent = formatEuro(ctTotal);
    kpiEbTotal.textContent = formatEuro(ebTotal);
    kpiCardsCount.textContent = `${list.length} ${list.length === 1 ? 'Carta' : 'Carte'}`;
    tabCountPortfolio.textContent = cards.length;

    kpiTrendUp.textContent = upCount;
    kpiTrendStable.textContent = stableCount;
    kpiTrendDown.textContent = downCount;

    const totalCount = list.length || 1;
    const upPct = (upCount / totalCount) * 100;
    const stablePct = (stableCount / totalCount) * 100;
    const downPct = (downCount / totalCount) * 100;

    kpiTrendBar.innerHTML = `
      <div class="tp-seg tp-up" style="width: ${upPct}%;" title="In Rialzo: ${upCount}"></div>
      <div class="tp-seg tp-stable" style="width: ${stablePct}%;" title="Stabili: ${stableCount}"></div>
      <div class="tp-seg tp-down" style="width: ${downPct}%;" title="In Calo: ${downCount}"></div>
    `;

    if (topCard) {
      kpiTopCardName.textContent = topCard.name;
      kpiTopCardMeta.textContent = `${topCard.code} • ${topCard.rarity}`;
      const topAvg = getCardAverages(topCard);
      kpiTopCardVal.textContent = formatEuro(topAvg.avgTrend);
    } else {
      kpiTopCardName.textContent = "-";
      kpiTopCardMeta.textContent = "-";
      kpiTopCardVal.textContent = "€ 0,00";
    }
  }

  function renderPortfolioTable(list) {
    tableBody.innerHTML = "";

    list.forEach((card, index) => {
      const avg = getCardAverages(card);
      const row = document.createElement("tr");

      let trendBadgeHtml = "";
      if (card.trendStatus === "up") {
        trendBadgeHtml = `<span class="trend-badge up">↗ +${card.trendPct || 0}%</span>`;
      } else if (card.trendStatus === "down") {
        trendBadgeHtml = `<span class="trend-badge down">↘ ${card.trendPct || 0}%</span>`;
      } else {
        trendBadgeHtml = `<span class="trend-badge stable">↔ Stabile</span>`;
      }

      const urls = getCardUrls(card);
      const itaName = urls.itaName;
      const engName = urls.engName;
      const code = urls.code;
      const cmItaUrl = urls.cmItaUrl;
      const cmCodeUrl = urls.cmCodeUrl;
      const cmEngUrl = urls.cmEngUrl;
      const cmBestUrl = urls.cmBestUrl;
      const ctItaUrl = urls.ctItaUrl;
      const ctCodeUrl = urls.ctCodeUrl;
      const ctEngUrl = urls.ctEngUrl;
      const ctBestUrl = urls.ctBestUrl;
      const ebUrl = urls.ebUrl;
      const ebItaUrl = urls.ebItaUrl;
      const ygoUrl = urls.ygoUrl;

      // Platform trends
      const cmTrendInfo = getPlatformTrend(card.cmMin, card.cmTrend, card.baseCmTrend);
      const ctTrendInfo = getPlatformTrend(card.ctMin, card.ctTrend, card.baseCtTrend);
      const ebTrendInfo = getPlatformTrend(card.ebMin, card.ebTrend, card.baseEbTrend);

      row.innerHTML = `
        <td class="col-num">${card.num || (index + 1)}</td>
        <td class="col-card">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${escapeHtml(card.name)}" class="table-art-thumb" data-id="${card.id}" title="Clicca per ingrandire la carta in HD" />` : ''}
            <div>
              <div class="card-cell-name" style="cursor: pointer;" data-lightbox-id="${card.id}">
                ${getGameBadgeHtml(card.game)}<strong>${escapeHtml(card.name)}</strong>
              </div>
          ${card.englishName && card.englishName !== card.name ? `<div class="card-cell-sub" style="color: var(--accent-gold); font-size: 0.75rem;"><span title="Nome ufficiale inglese per ricerche di mercato">🌐 ${escapeHtml(card.englishName)}</span></div>` : ''}
          <div class="card-cell-sub">${escapeHtml(card.edition || "")}</div>
          ${card.notes ? `<div class="card-cell-notes">${escapeHtml(card.notes)}</div>` : ""}
          ${card.updatedAt ? `<div class="card-cell-timestamp" title="Ultima modifica: ${formatFullDate(card.updatedAt)}">🕒 ${formatShortDate(card.updatedAt)}</div>` : ""}
            </div>
          </div>
        </td>
        <td class="col-rarity">
          <span class="badge-rarity ${getRarityClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
          <div class="card-cell-sub"><strong>${escapeHtml(card.code)}</strong> • ${escapeHtml(card.expansion)}</div>
        </td>
        <td class="col-cond">
          <span class="badge-condition ${getConditionClass(card.condition)}">${escapeHtml(card.condition)}</span>
          <div class="card-cell-sub" style="margin-top: 3px;"><span style="font-size: 0.95rem; vertical-align: middle;">${getLanguageFlag(card.language)}</span> ${escapeHtml(card.language)}</div>
        </td>
        <td class="col-market">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend">${formatEuro(card.cmTrend)}</span>
              <span class="platform-trend-tag ${cmTrendInfo.class}" title="Trend Cardmarket: ${cmTrendInfo.label}">${cmTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Min: ${formatEuro(card.cmMin)}</span>
          </div>
        </td>
        <td class="col-market">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend">${formatEuro(card.ctTrend)}</span>
              <span class="platform-trend-tag ${ctTrendInfo.class}" title="Trend CardTrader: ${ctTrendInfo.label}">${ctTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Min: ${formatEuro(card.ctMin)}</span>
          </div>
        </td>
        <td class="col-market col-ebay">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend" style="color: var(--eb-gold);">${formatEuro(card.ebTrend)}</span>
              <span class="platform-trend-tag ${ebTrendInfo.class}" title="Trend eBay: ${ebTrendInfo.label}">${ebTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Min: ${formatEuro(card.ebMin)}</span>
          </div>
        </td>
        <td class="col-media">
          <div class="cell-media-block">
            <span class="media-trend-val">${formatEuro(avg.avgTrend)}</span>
            <span class="media-min-val">Min: ${formatEuro(avg.avgMin)}</span>
          </div>
        </td>
        <td class="col-trend">
          ${trendBadgeHtml}
        </td>
        <td class="col-actions">
          <div class="actions-cell">
            <div class="market-links-dropdown">
              <button type="button" class="action-btn-sm" title="Apri ricerche di mercato">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <div class="market-dropdown-menu">
                <a href="${cmCodeUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca '${code}' su Cardmarket con filtro lingua ${getLanguageFlag(card.language)}">
                  <span class="market-dot cm"></span> Cardmarket (${escapeHtml(code || engName)} ${getLanguageFlag(card.language)})
                </a>
                <a href="${cmEngUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca '${engName}' su Cardmarket">
                  <span class="market-dot cm"></span> Cardmarket (Nome EN)
                </a>
                <a href="${ctBestUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="${card.blueprintId ? 'Apri direttamente Blueprint #' + card.blueprintId + ' su CardTrader' : 'Cerca su CardTrader'}">
                  <span class="market-dot ct"></span> CardTrader ${card.blueprintId ? '⚡ (Blueprint #' + card.blueprintId + ')' : '(Ricerca)'}
                </a>
                <a href="${ebUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca '${code} ${engName}' su eBay.it Compralo Subito">
                  <span class="market-dot eb"></span> eBay.it (Compralo Subito)
                </a>
                <a href="${ygoUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Vedi scheda ufficiale e tutti i set su YGOPRODeck">
                  <span class="market-dot" style="background:#10b981;"></span> YGOPRODeck Hub
                </a>
              </div>
            </div>

            <button type="button" class="action-btn-sm btn-ct-single" data-id="${card.id}" title="⚡ Sincronizza CardTrader Live">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </button>
            <button type="button" class="action-btn-sm btn-marketplaces-single" data-id="${card.id}" title="🌐 Sincronizza Mercati & Artwork HD" style="color: #0ea5e9;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </button>

            <button type="button" class="action-btn-sm btn-edit-card" data-id="${card.id}" title="Modifica carta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>

            <button type="button" class="action-btn-sm btn-del-card" data-id="${card.id}" title="Elimina carta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });
  }

  function renderPortfolioGrid(list) {
    gridContainer.innerHTML = "";

    list.forEach(card => {
      const avg = getCardAverages(card);
      const cardEl = document.createElement("div");
      cardEl.className = "card-item";

      let trendBadgeHtml = "";
      if (card.trendStatus === "up") {
        trendBadgeHtml = `<span class="trend-badge up">↗ +${card.trendPct || 0}%</span>`;
      } else if (card.trendStatus === "down") {
        trendBadgeHtml = `<span class="trend-badge down">↘ ${card.trendPct || 0}%</span>`;
      } else {
        trendBadgeHtml = `<span class="trend-badge stable">↔ Stabile</span>`;
      }

      const urls = getCardUrls(card);
      const itaName = urls.itaName;
      const cmUrl = urls.cmBestUrl;
      const ctUrl = urls.ctBestUrl;
      const ebUrl = urls.ebUrl;
      const ygoUrl = urls.ygoUrl;

      const cmTrendInfo = getPlatformTrend(card.cmMin, card.cmTrend, card.baseCmTrend);
      const ctTrendInfo = getPlatformTrend(card.ctMin, card.ctTrend, card.baseCtTrend);
      const ebTrendInfo = getPlatformTrend(card.ebMin, card.ebTrend, card.baseEbTrend);

      cardEl.innerHTML = `
        <div class="card-item-body">
          ${card.imageUrl ? `
            <div class="card-item-art-wrap" data-lightbox-id="${card.id}" title="Clicca per ingrandire la carta in HD">
              <img class="card-item-art" src="${card.imageUrl}" alt="${escapeHtml(card.name)}" loading="lazy" />
              <div class="card-art-foil"></div>
            </div>
          ` : `
            <div class="card-item-art-wrap card-art-placeholder" data-lightbox-id="${card.id}" title="Clicca per visualizzare">
              <div class="card-art-placeholder-icon">🃏</div>
              <span class="card-art-placeholder-text">${escapeHtml(card.code || 'TCG')}</span>
            </div>
          `}
          <div class="card-item-content">
            <div class="card-item-header">
              <div>
                <div class="card-item-name" style="cursor: pointer;" data-lightbox-id="${card.id}">
                  ${getGameBadgeHtml(card.game)}<strong>${escapeHtml(card.name)}</strong>
                </div>
                ${card.englishName && card.englishName !== card.name ? `<div class="card-cell-sub" style="color: var(--accent-gold); font-size: 0.75rem;"><span title="Nome ufficiale inglese per ricerche di mercato">🌐 ${escapeHtml(card.englishName)}</span></div>` : ''}
                <div class="card-cell-sub">${escapeHtml(card.expansion)} • <strong>${escapeHtml(card.code)}</strong></div>
              </div>
              ${trendBadgeHtml}
            </div>

            <div class="card-item-tags">
              <span class="badge-rarity ${getRarityClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
              <span class="badge-condition ${getConditionClass(card.condition)}">${escapeHtml(card.condition)}</span>
              <span class="badge-condition"><span style="font-size: 0.95rem; vertical-align: middle;">${getLanguageFlag(card.language)}</span> ${escapeHtml(card.language)}</span>
              ${card.cardType ? `<span class="badge-cardtype">${escapeHtml(card.cardType)}</span>` : ''}
              ${card.updatedAt ? `<span class="card-grid-timestamp" title="Ultima modifica: ${formatFullDate(card.updatedAt)}">🕒 ${formatShortDate(card.updatedAt)}</span>` : ''}
            </div>

            <div class="card-item-prices-grid">
              <div class="cip-col">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                  <span class="cip-source">Cardmarket</span>
                  <span class="platform-trend-tag ${cmTrendInfo.class}" title="Trend Cardmarket: ${cmTrendInfo.label}">${cmTrendInfo.symbol}</span>
                </div>
                <span class="cip-val">${formatEuro(card.cmTrend)}</span>
                <span class="cip-sub">Min ${formatEuro(card.cmMin)}</span>
              </div>
              <div class="cip-col">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                  <span class="cip-source">CardTrader</span>
                  <span class="platform-trend-tag ${ctTrendInfo.class}" title="Trend CardTrader: ${ctTrendInfo.label}">${ctTrendInfo.symbol}</span>
                </div>
                <span class="cip-val" style="color: #fb923c;">${formatEuro(card.ctTrend)}</span>
                <span class="cip-sub">Min ${formatEuro(card.ctMin)}</span>
              </div>
              <div class="cip-col">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                  <span class="cip-source" style="color: var(--eb-gold);">eBay</span>
                  <span class="platform-trend-tag ${ebTrendInfo.class}" title="Trend eBay: ${ebTrendInfo.label}">${ebTrendInfo.symbol}</span>
                </div>
                <span class="cip-val" style="color: var(--eb-gold);">${formatEuro(card.ebTrend)}</span>
                <span class="cip-sub">Min ${formatEuro(card.ebMin)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-item-footer">
          <div class="card-item-media">
            <span class="cim-label">Media Trend Globale</span>
            <span class="cim-val">${formatEuro(avg.avgTrend)}</span>
          </div>

          <div class="actions-cell">
            <button type="button" class="action-btn-sm btn-ct-single" data-id="${card.id}" title="⚡ Sincronizza CardTrader Live">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </button>
            <button type="button" class="action-btn-sm btn-marketplaces-single" data-id="${card.id}" title="🌐 Sincronizza Mercati & Artwork HD" style="color: #0ea5e9;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </button>
            <a href="${cmUrl}" target="_blank" class="action-btn-sm" title="Vedi '${itaName}' su Cardmarket Italia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </a>
            <a href="${ctUrl}" target="_blank" class="action-btn-sm" title="Vedi '${itaName}' su CardTrader Italia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </a>
            <a href="${ebUrl}" target="_blank" class="action-btn-sm" title="Vedi su eBay.it">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </a>
            <button type="button" class="action-btn-sm btn-edit-card" data-id="${card.id}" title="Modifica carta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="action-btn-sm btn-del-card" data-id="${card.id}" title="Elimina carta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      gridContainer.appendChild(cardEl);
    });
  }

  // ==========================================
  // WANTS FILTER & RENDER
  // ==========================================
  function getFilteredWants() {
    let result = wants.filter(want => {
      if (currentBrandFilter !== "all") {
        const wantGame = (want.game || "yugioh").toLowerCase();
        if (wantGame !== currentBrandFilter) return false;
      }

      const best = getBestWantOffer(want);
      const isDeal = best.price > 0 && best.price <= want.targetPrice;

      if (wantsFilters.search) {
        const query = wantsFilters.search.toLowerCase().trim();
        const searchStr = `${want.name} ${want.code} ${want.expansion} ${want.rarity} ${want.notes || ""}`.toLowerCase();
        if (!searchStr.includes(query)) return false;
      }

      if (wantsFilters.status === "deal" && !isDeal) return false;
      if (wantsFilters.status === "over" && isDeal) return false;
      if (wantsFilters.rarity !== "all" && want.rarity !== wantsFilters.rarity) return false;

      return true;
    });

    result.sort((a, b) => {
      const bestA = getBestWantOffer(a);
      const bestB = getBestWantOffer(b);
      const savingA = a.targetPrice - bestA.price;
      const savingB = b.targetPrice - bestB.price;

      switch (wantsFilters.sortBy) {
        case "target-desc": return b.targetPrice - a.targetPrice;
        case "target-asc": return a.targetPrice - b.targetPrice;
        case "updated-desc": return getTimestampMs(b) - getTimestampMs(a);
        case "updated-asc": return getTimestampMs(a) - getTimestampMs(b);
        case "best-price-asc": return bestA.price - bestB.price;
        case "deal-saving": return savingB - savingA;
        case "name-asc": return a.name.localeCompare(b.name, "it");
        default: return b.targetPrice - a.targetPrice;
      }
    });

    return result;
  }

  function updateWantsKPIs(filteredList) {
    const list = filteredList || wants;
    let totalTarget = 0;
    let totalBest = 0;
    let dealsCount = 0;
    let overCount = 0;
    let topWant = null;
    let maxTargetVal = -1;

    list.forEach(want => {
      const best = getBestWantOffer(want);
      totalTarget += Number(want.targetPrice) || 0;
      totalBest += Number(best.price) || 0;

      if (best.price > 0 && best.price <= want.targetPrice) {
        dealsCount++;
      } else {
        overCount++;
      }

      if (want.targetPrice > maxTargetVal) {
        maxTargetVal = want.targetPrice;
        topWant = want;
      }
    });

    kpiWantsTargetTotal.textContent = formatEuro(totalTarget);
    kpiWantsBestTotal.textContent = formatEuro(totalBest);
    kpiWantsCount.textContent = `${list.length} ${list.length === 1 ? 'Want' : 'Wants'}`;
    tabCountWants.textContent = wants.length;

    kpiWantsDealsCount.textContent = dealsCount;
    kpiWantsOverCount.textContent = overCount;

    const delta = totalTarget - totalBest;
    if (delta >= 0) {
      kpiWantsDelta.textContent = `+ ${formatEuro(delta)} di Risparmio`;
      kpiWantsDelta.className = "wdm-value positive";
      kpiWantsDeltaSub.textContent = "I migliori prezzi di mercato sono inferiori al tuo budget totale!";
    } else {
      kpiWantsDelta.textContent = `- ${formatEuro(Math.abs(delta))} Sopra Budget`;
      kpiWantsDelta.className = "wdm-value negative";
      kpiWantsDeltaSub.textContent = "Il mercato attuale supera il budget target prefissato.";
    }

    if (topWant) {
      kpiTopWantName.textContent = topWant.name;
      kpiTopWantMeta.textContent = `${topWant.code} • ${topWant.rarity}`;
      kpiTopWantVal.textContent = formatEuro(topWant.targetPrice);
    } else {
      kpiTopWantName.textContent = "-";
      kpiTopWantMeta.textContent = "-";
      kpiTopWantVal.textContent = "€ 0,00";
    }
  }

  function renderWantsTable(list) {
    wantsTableBody.innerHTML = "";

    list.forEach((want, index) => {
      const best = getBestWantOffer(want);
      const isDeal = best.price > 0 && best.price <= want.targetPrice;
      const diff = want.targetPrice - best.price;

      let statusBadge = "";
      if (isDeal) {
        statusBadge = `<span class="target-status-badge deal">Affare! -${formatEuro(diff)}</span>`;
      } else {
        statusBadge = `<span class="target-status-badge over">+${formatEuro(Math.abs(diff))} sopra</span>`;
      }

      const urls = getCardUrls(want);
      const itaName = urls.itaName;
      const engName = urls.engName;
      const code = urls.code;
      const cmItaUrl = urls.cmItaUrl;
      const cmCodeUrl = urls.cmCodeUrl;
      const cmEngUrl = urls.cmEngUrl;
      const cmBestUrl = urls.cmBestUrl;
      const ctItaUrl = urls.ctItaUrl;
      const ctCodeUrl = urls.ctCodeUrl;
      const ctEngUrl = urls.ctEngUrl;
      const ctBestUrl = urls.ctBestUrl;
      const ebUrl = urls.ebUrl;
      const ebItaUrl = urls.ebItaUrl;
      const ygoUrl = urls.ygoUrl;

      const cmTrendInfo = getPlatformTrend(want.cmMin, want.cmTrend, want.baseCmMin);
      const ctTrendInfo = getPlatformTrend(want.ctMin, want.ctTrend, want.baseCtMin);
      const ebTrendInfo = getPlatformTrend(want.ebMin, want.ebTrend, want.baseEbMin);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="col-num">${index + 1}</td>
        <td class="col-card">
          <div class="card-cell-name">${getGameBadgeHtml(want.game)}<strong>${escapeHtml(want.name)}</strong></div>
          ${want.englishName && want.englishName !== want.name ? `<div class="card-cell-sub" style="color: var(--accent-gold); font-size: 0.75rem;"><span title="Nome ufficiale inglese per ricerche di mercato">🌐 ${escapeHtml(want.englishName)}</span></div>` : ''}
          <div class="card-cell-sub">${escapeHtml(want.edition || "")}</div>
          ${want.notes ? `<div class="card-cell-notes">${escapeHtml(want.notes)}</div>` : ""}
          ${want.updatedAt ? `<div class="card-cell-timestamp" title="Ultima modifica: ${formatFullDate(want.updatedAt)}">🕒 ${formatShortDate(want.updatedAt)}</div>` : ""}
        </td>
        <td class="col-rarity">
          <span class="badge-rarity ${getRarityClass(want.rarity)}">${escapeHtml(want.rarity)}</span>
          <div class="card-cell-sub"><strong>${escapeHtml(want.code)}</strong> • ${escapeHtml(want.expansion)}</div>
        </td>
        <td class="col-cond">
          <span class="badge-condition ${getConditionClass(want.targetCondition)}">${escapeHtml(want.targetCondition || "Near Mint")}</span>
          <div class="card-cell-sub" style="margin-top: 3px;"><span style="font-size: 0.95rem; vertical-align: middle;">${getLanguageFlag(want.language)}</span> ${escapeHtml(want.language)}</div>
        </td>
        <td class="col-target">
          <div class="wants-target-price">${formatEuro(want.targetPrice)}</div>
        </td>
        <td class="col-market">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend">${formatEuro(want.cmMin)}</span>
              <span class="platform-trend-tag ${cmTrendInfo.class}" title="Trend Cardmarket: ${cmTrendInfo.label}">${cmTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Trend: ${formatEuro(want.cmTrend)}</span>
          </div>
        </td>
        <td class="col-market">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend">${formatEuro(want.ctMin)}</span>
              <span class="platform-trend-tag ${ctTrendInfo.class}" title="Trend CardTrader: ${ctTrendInfo.label}">${ctTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Trend: ${formatEuro(want.ctTrend)}</span>
          </div>
        </td>
        <td class="col-market col-ebay">
          <div class="cell-price-block">
            <div class="price-trend-row">
              <span class="price-trend" style="color: var(--eb-gold);">${formatEuro(want.ebMin)}</span>
              <span class="platform-trend-tag ${ebTrendInfo.class}" title="Trend eBay: ${ebTrendInfo.label}">${ebTrendInfo.symbol}</span>
            </div>
            <span class="price-min">Venduto: ${formatEuro(want.ebTrend)}</span>
          </div>
        </td>
        <td class="col-best">
          <span class="best-deal-badge ${best.code}">
            ${best.source}: <strong>${formatEuro(best.price)}</strong>
          </span>
        </td>
        <td class="col-status">
          ${statusBadge}
        </td>
        <td class="col-actions">
          <div class="actions-cell">
            <button type="button" class="action-btn-sm btn-buy" data-id="${want.id}" title="Segna come Acquistata e Sposta nel Portfolio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>

            <div class="market-links-dropdown">
              <button type="button" class="action-btn-sm" title="Apri ricerche di mercato">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <div class="market-dropdown-menu">
                <a href="${cmCodeUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca '${code}' su Cardmarket con filtro lingua ${getLanguageFlag(want.language)}">
                  <span class="market-dot cm"></span> Cardmarket (${escapeHtml(code || engName)} ${getLanguageFlag(want.language)})
                </a>
                <a href="${cmEngUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca '${engName}' su Cardmarket">
                  <span class="market-dot cm"></span> Cardmarket (Nome EN)
                </a>
                <a href="${ctBestUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="${want.blueprintId ? 'Apri direttamente Blueprint #' + want.blueprintId + ' su CardTrader' : 'Cerca su CardTrader'}">
                  <span class="market-dot ct"></span> CardTrader ${want.blueprintId ? '⚡ (Blueprint #' + want.blueprintId + ')' : '(Ricerca)'}
                </a>
                <a href="${ebUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Cerca su eBay.it Compralo Subito">
                  <span class="market-dot eb"></span> eBay.it (Compralo Subito)
                </a>
                <a href="${ygoUrl}" target="_blank" rel="noopener noreferrer" class="market-link-item" title="Vedi scheda ufficiale e tutti i set su YGOPRODeck">
                  <span class="market-dot" style="background:#10b981;"></span> YGOPRODeck Hub
                </a>
              </div>
            </div>

            <button type="button" class="action-btn-sm btn-edit-want" data-id="${want.id}" title="Modifica want">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>

            <button type="button" class="action-btn-sm btn-del-want" data-id="${want.id}" title="Elimina want">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      wantsTableBody.appendChild(row);
    });
  }

  function renderWantsGrid(list) {
    wantsGridContainer.innerHTML = "";

    list.forEach(want => {
      const best = getBestWantOffer(want);
      const isDeal = best.price > 0 && best.price <= want.targetPrice;
      const diff = want.targetPrice - best.price;

      const cardEl = document.createElement("div");
      cardEl.className = "card-item";

      let statusBadge = "";
      if (isDeal) {
        statusBadge = `<span class="target-status-badge deal">Affare! -${formatEuro(diff)}</span>`;
      } else {
        statusBadge = `<span class="target-status-badge over">+${formatEuro(Math.abs(diff))}</span>`;
      }

      const cmTrendInfo = getPlatformTrend(want.cmMin, want.cmTrend, want.baseCmMin);
      const ctTrendInfo = getPlatformTrend(want.ctMin, want.ctTrend, want.baseCtMin);
      const ebTrendInfo = getPlatformTrend(want.ebMin, want.ebTrend, want.baseEbMin);

      cardEl.innerHTML = `
        <div>
          <div class="card-item-header">
            <div>
              <div class="card-item-name">${getGameBadgeHtml(want.game)}<strong>${escapeHtml(want.name)}</strong></div>
              ${want.englishName && want.englishName !== want.name ? `<div class="card-cell-sub" style="color: var(--accent-gold); font-size: 0.75rem;"><span title="Nome ufficiale inglese per ricerche di mercato">🌐 ${escapeHtml(want.englishName)}</span></div>` : ''}
              <div class="card-cell-sub">${escapeHtml(want.expansion)} • <strong>${escapeHtml(want.code)}</strong></div>
            </div>
            ${statusBadge}
          </div>

          <div class="card-item-tags">
            <span class="badge-rarity ${getRarityClass(want.rarity)}">${escapeHtml(want.rarity)}</span>
            <span class="badge-condition ${getConditionClass(want.targetCondition)}">${escapeHtml(want.targetCondition)}</span>
            <span class="badge-condition"><span style="font-size: 0.95rem; vertical-align: middle;">${getLanguageFlag(want.language)}</span> ${escapeHtml(want.language)}</span>
            ${want.updatedAt ? `<span class="card-grid-timestamp" title="Ultima modifica: ${formatFullDate(want.updatedAt)}">🕒 ${formatShortDate(want.updatedAt)}</span>` : ''}
          </div>

          <div class="card-item-prices-grid">
            <div class="cip-col">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <span class="cip-source">Target</span>
              </div>
              <span class="cip-val" style="color: var(--accent-gold);">${formatEuro(want.targetPrice)}</span>
              <span class="cip-sub">Max spesa</span>
            </div>
            <div class="cip-col">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <span class="cip-source">CardTrader</span>
                <span class="platform-trend-tag ${ctTrendInfo.class}" title="Trend CardTrader: ${ctTrendInfo.label}">${ctTrendInfo.symbol}</span>
              </div>
              <span class="cip-val" style="color: #fb923c;">${formatEuro(want.ctMin)}</span>
              <span class="cip-sub">${best.source === 'CardTrader' ? 'Migliore!' : 'Minimo'}</span>
            </div>
            <div class="cip-col">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                <span class="cip-source" style="color: var(--eb-gold);">eBay</span>
                <span class="platform-trend-tag ${ebTrendInfo.class}" title="Trend eBay: ${ebTrendInfo.label}">${ebTrendInfo.symbol}</span>
              </div>
              <span class="cip-val" style="color: var(--eb-gold);">${formatEuro(want.ebMin)}</span>
              <span class="cip-sub">Compralo Subito</span>
            </div>
          </div>
        </div>

        <div class="card-item-footer">
          <button type="button" class="btn btn-secondary btn-buy" data-id="${want.id}" style="padding: 5px 10px; font-size: 0.78rem;">
            ✅ Acquistata
          </button>

          <div class="actions-cell">
            <a href="${cmUrl}" target="_blank" class="action-btn-sm" title="Vedi '${itaName}' su Cardmarket Italia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </a>
            <a href="${ctUrl}" target="_blank" class="action-btn-sm" title="Vedi '${itaName}' su CardTrader Italia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </a>
            <a href="${ebUrl}" target="_blank" class="action-btn-sm" title="Vedi su eBay.it">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </a>
            <button type="button" class="action-btn-sm btn-edit-want" data-id="${want.id}" title="Modifica">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="action-btn-sm btn-del-want" data-id="${want.id}" title="Elimina">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      wantsGridContainer.appendChild(cardEl);
    });
  }

  // ==========================================
  // MASTER RENDER
  // ==========================================
  function render() {
    if (activeTab === "portfolio") {
      const filteredList = getFilteredCards();
      updatePortfolioKPIs(filteredList);

      if (filteredList.length === 0) {
        tableViewContainer.style.display = "none";
        gridContainer.style.display = "none";
        emptyState.style.display = "block";
      } else {
        emptyState.style.display = "none";
        if (portfolioFilters.viewMode === "table") {
          tableViewContainer.style.display = "block";
          gridContainer.style.display = "none";
          renderPortfolioTable(filteredList);
        } else {
          tableViewContainer.style.display = "none";
          gridContainer.style.display = "grid";
          renderPortfolioGrid(filteredList);
        }
      }
    } else {
      const filteredWants = getFilteredWants();
      updateWantsKPIs(filteredWants);

      if (filteredWants.length === 0) {
        wantsTableViewContainer.style.display = "none";
        wantsGridContainer.style.display = "none";
        wantsEmptyState.style.display = "block";
      } else {
        wantsEmptyState.style.display = "none";
        if (wantsFilters.viewMode === "table") {
          wantsTableViewContainer.style.display = "block";
          wantsGridContainer.style.display = "none";
          renderWantsTable(filteredWants);
        } else {
          wantsTableViewContainer.style.display = "none";
          wantsGridContainer.style.display = "grid";
          renderWantsGrid(filteredWants);
        }
      }
    }
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  function setupEventListeners() {
    tabPortfolio.addEventListener("click", () => switchTab("portfolio"));
    tabWants.addEventListener("click", () => switchTab("wants"));

    btnRefresh.addEventListener("click", () => triggerMarketRefresh(false));

    // Save to Disk CSV / Download
    btnSaveDisk.addEventListener("click", async () => {
      if (isServerConnected) {
        await syncPortfolioWithDiskCsv(false);
      } else {
        exportToCsv();
        showToast("Scaricamento del file CSV aggiornato in corso...");
      }
    });

    // Reset Baseline
    btnResetBaseline.addEventListener("click", () => {
      if (confirm("Vuoi azzerare le variazioni e ripristinare i prezzi esatti di base del listino?")) {
        resetToBaseline();
      }
    });

    // Portfolio search & filters
    searchInput.addEventListener("input", (e) => {
      portfolioFilters.search = e.target.value;
      searchClearBtn.style.display = portfolioFilters.search ? "block" : "none";
      render();
    });

    searchClearBtn.addEventListener("click", () => {
      searchInput.value = "";
      portfolioFilters.search = "";
      searchClearBtn.style.display = "none";
      render();
    });

    filterRarity.addEventListener("change", (e) => {
      portfolioFilters.rarity = e.target.value;
      render();
    });

    filterSet.addEventListener("change", (e) => {
      portfolioFilters.expansion = e.target.value;
      render();
    });

    filterCondition.addEventListener("change", (e) => {
      portfolioFilters.condition = e.target.value;
      render();
    });

    filterTrend.addEventListener("change", (e) => {
      portfolioFilters.trend = e.target.value;
      render();
    });

    sortBySelect.addEventListener("change", (e) => {
      portfolioFilters.sortBy = e.target.value;
      render();
    });

    btnViewTable.addEventListener("click", () => {
      portfolioFilters.viewMode = "table";
      btnViewTable.classList.add("active");
      btnViewCards.classList.remove("active");
      render();
    });

    btnViewCards.addEventListener("click", () => {
      portfolioFilters.viewMode = "cards";
      btnViewCards.classList.add("active");
      btnViewTable.classList.remove("active");
      render();
    });

    btnResetFilters.addEventListener("click", () => {
      searchInput.value = "";
      searchClearBtn.style.display = "none";
      filterRarity.value = "all";
      filterSet.value = "all";
      filterCondition.value = "all";
      filterTrend.value = "all";
      sortBySelect.value = "num-asc";

      portfolioFilters = {
        search: "",
        rarity: "all",
        expansion: "all",
        condition: "all",
        trend: "all",
        sortBy: "num-asc",
        viewMode: portfolioFilters.viewMode
      };
      render();
    });

    // Wants search & filters
    searchWantsInput.addEventListener("input", (e) => {
      wantsFilters.search = e.target.value;
      searchWantsClearBtn.style.display = wantsFilters.search ? "block" : "none";
      render();
    });

    searchWantsClearBtn.addEventListener("click", () => {
      searchWantsInput.value = "";
      wantsFilters.search = "";
      searchWantsClearBtn.style.display = "none";
      render();
    });

    filterWantsStatus.addEventListener("change", (e) => {
      wantsFilters.status = e.target.value;
      render();
    });

    filterWantsRarity.addEventListener("change", (e) => {
      wantsFilters.rarity = e.target.value;
      render();
    });

    sortWantsBySelect.addEventListener("change", (e) => {
      wantsFilters.sortBy = e.target.value;
      render();
    });

    btnViewWantsTable.addEventListener("click", () => {
      wantsFilters.viewMode = "table";
      btnViewWantsTable.classList.add("active");
      btnViewWantsCards.classList.remove("active");
      render();
    });

    btnViewWantsCards.addEventListener("click", () => {
      wantsFilters.viewMode = "cards";
      btnViewWantsCards.classList.add("active");
      btnViewWantsTable.classList.remove("active");
      render();
    });

    if (btnAddFirstWant) {
      btnAddFirstWant.addEventListener("click", () => openWantModal(null));
    }

    // Modal triggers
    btnOpenAddModal.addEventListener("click", () => {
      if (activeTab === "portfolio") {
        openCardModal(null);
      } else {
        openWantModal(null);
      }
    });

    btnCloseModal.addEventListener("click", closeCardModal);
    btnCancelModal.addEventListener("click", closeCardModal);
    cardModal.addEventListener("click", (e) => {
      if (e.target === cardModal) closeCardModal();
    });

    btnCloseWantModal.addEventListener("click", closeWantModal);
    btnCancelWantModal.addEventListener("click", closeWantModal);
    wantModal.addEventListener("click", (e) => {
      if (e.target === wantModal) closeWantModal();
    });

    // Auto-fill button and Enter/Paste key in modal inputs
    const btnAutofillFetch = document.getElementById("btn-autofill-fetch");
    const inputAutofillUrl = document.getElementById("form-autofill-url");
    if (btnAutofillFetch) {
      btnAutofillFetch.addEventListener("click", () => triggerAutoFill(false));
    }
    if (inputAutofillUrl) {
      inputAutofillUrl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          triggerAutoFill(false);
        }
      });
      inputAutofillUrl.addEventListener("paste", () => {
        setTimeout(() => triggerAutoFill(false), 100);
      });
    }

    const wantBtnAutofillFetch = document.getElementById("want-btn-autofill-fetch");
    const wantInputAutofillUrl = document.getElementById("want-form-autofill-url");
    if (wantBtnAutofillFetch) {
      wantBtnAutofillFetch.addEventListener("click", () => triggerAutoFill(true));
    }
    if (wantInputAutofillUrl) {
      wantInputAutofillUrl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          triggerAutoFill(true);
        }
      });
      wantInputAutofillUrl.addEventListener("paste", () => {
        setTimeout(() => triggerAutoFill(true), 100);
      });
    }

    // Form submits
    cardForm.addEventListener("submit", handleCardFormSubmit);
    wantForm.addEventListener("submit", handleWantFormSubmit);

    // CardTrader Live Sync All Button
    const btnSyncCardTrader = document.getElementById("btn-sync-cardtrader");
    const ctSyncModal = document.getElementById("ct-sync-modal");
    const btnCloseCtModal = document.getElementById("btn-close-ct-modal");
    const btnCloseCtDone = document.getElementById("btn-close-ct-done");
    const ctLogsBox = document.getElementById("ct-logs-box");
    const ctProgressStatusText = document.getElementById("ct-progress-status-text");
    const ctProgressPctText = document.getElementById("ct-progress-pct-text");
    const ctProgressFill = document.getElementById("ct-progress-fill");

    if (btnSyncCardTrader) {
      btnSyncCardTrader.addEventListener("click", () => {
        startCardTraderSyncAll();
      });
    }

    if (btnCloseCtModal) {
      btnCloseCtModal.addEventListener("click", () => {
        ctSyncModal.style.display = "none";
        ctSyncModal.setAttribute("aria-hidden", "true");
      });
    }

    if (btnCloseCtDone) {
      btnCloseCtDone.addEventListener("click", () => {
        ctSyncModal.style.display = "none";
        ctSyncModal.setAttribute("aria-hidden", "true");
      });
    }

    // Global Delegated Handler
    document.addEventListener("click", (e) => {
      // Market links dropdown toggle
      const mktDropdownBtn = e.target.closest(".market-links-dropdown > button");
      if (mktDropdownBtn) {
        e.stopPropagation();
        const parentDropdown = mktDropdownBtn.closest(".market-links-dropdown");
        const wasOpen = parentDropdown.classList.contains("is-open");
        document.querySelectorAll(".market-links-dropdown.is-open").forEach(d => d.classList.remove("is-open"));
        if (!wasOpen) {
          const rect = parentDropdown.getBoundingClientRect();
          if (rect.bottom + 240 > window.innerHeight && rect.top > 200) {
            parentDropdown.classList.add("dropup");
          } else {
            parentDropdown.classList.remove("dropup");
          }
          parentDropdown.classList.add("is-open");
        }
        return;
      }

      // Close dropdowns on outside click
      if (!e.target.closest(".market-links-dropdown")) {
        document.querySelectorAll(".market-links-dropdown.is-open").forEach(d => d.classList.remove("is-open"));
      }

      const mpSingleBtn = e.target.closest(".btn-marketplaces-single");
      if (mpSingleBtn) {
        syncSingleMarketplaces(Number(mpSingleBtn.dataset.id));
        return;
      }

      const lightboxTrigger = e.target.closest("[data-lightbox-id]");
      if (lightboxTrigger) {
        openCardLightbox(Number(lightboxTrigger.dataset.lightboxId));
        return;
      }

      const artThumb = e.target.closest(".table-art-thumb");
      if (artThumb) {
        openCardLightbox(Number(artThumb.dataset.id));
        return;
      }

      const ctSingleBtn = e.target.closest(".btn-ct-single");
      if (ctSingleBtn) {
        startCardTraderSyncSingle(Number(ctSingleBtn.dataset.id));
        return;
      }

      const editCardBtn = e.target.closest(".btn-edit-card");
      if (editCardBtn) {
        openCardModal(Number(editCardBtn.dataset.id));
        return;
      }

      const delCardBtn = e.target.closest(".btn-del-card");
      if (delCardBtn) {
        deleteCard(Number(delCardBtn.dataset.id));
        return;
      }

      const editWantBtn = e.target.closest(".btn-edit-want");
      if (editWantBtn) {
        openWantModal(Number(editWantBtn.dataset.id));
        return;
      }

      const delWantBtn = e.target.closest(".btn-del-want");
      if (delWantBtn) {
        deleteWant(Number(delWantBtn.dataset.id));
        return;
      }

      const buyBtn = e.target.closest(".btn-buy");
      if (buyBtn) {
        convertWantToPortfolio(Number(buyBtn.dataset.id));
        return;
      }
    });

    // Dynamic dropdown direction on hover
    document.addEventListener("mouseover", (e) => {
      const dropdown = e.target.closest(".market-links-dropdown");
      if (dropdown) {
        const rect = dropdown.getBoundingClientRect();
        if (rect.bottom + 240 > window.innerHeight && rect.top > 200) {
          dropdown.classList.add("dropup");
        } else if (rect.bottom + 240 <= window.innerHeight) {
          dropdown.classList.remove("dropup");
        }
      }
    });

    
    // Multi-Marketplace Sync & API Settings & Lightbox
    if (btnSyncMarketplaces) btnSyncMarketplaces.addEventListener("click", startMarketplacesSyncAll);
    if (btnCloseMpModal) btnCloseMpModal.addEventListener("click", () => { mpSyncModal.style.display = "none"; });
    if (btnCloseMpDone) btnCloseMpDone.addEventListener("click", () => { mpSyncModal.style.display = "none"; });

    if (btnOpenApiConfig) btnOpenApiConfig.addEventListener("click", openApiConfigModal);
    const justtcgPill = document.getElementById("justtcg-quota-pill");
    if (justtcgPill) {
      justtcgPill.style.cursor = "pointer";
      justtcgPill.addEventListener("click", openApiConfigModal);
    }
    if (btnCloseApiModal) btnCloseApiModal.addEventListener("click", closeApiConfigModal);
    if (btnCancelApiModal) btnCancelApiModal.addEventListener("click", closeApiConfigModal);
    if (btnSaveApiConfig) btnSaveApiConfig.addEventListener("click", saveApiConfig);

    if (btnCloseLightbox) btnCloseLightbox.addEventListener("click", closeCardLightbox);
    if (cardLightboxModal) {
      cardLightboxModal.addEventListener("click", (e) => {
        if (e.target === cardLightboxModal) closeCardLightbox();
      });
    }
    if (mpSyncModal) {
      mpSyncModal.addEventListener("click", (e) => {
        if (e.target === mpSyncModal) mpSyncModal.style.display = "none";
      });
    }
    if (apiConfigModal) {
      apiConfigModal.addEventListener("click", (e) => {
        if (e.target === apiConfigModal) closeApiConfigModal();
      });
    }

    // CSV Export & Import & Direct Save
    if (btnExportCsv) btnExportCsv.addEventListener("click", exportToCsv);
    if (btnImportCsv) {
      btnImportCsv.addEventListener("click", () => csvFileInput.click());
      csvFileInput.addEventListener("change", handleImportCsv);
    }
    if (btnSaveDisk) {
      btnSaveDisk.addEventListener("click", async () => {
        await syncPortfolioWithDiskCsv(true);
      });
    }

    // Restore Default
    btnRestoreDefault.addEventListener("click", async () => {
      if (confirm("Sei sicuro di voler ripristinare il database e il file CSV alle 29 carte originali del file?")) {
        cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
        wants = JSON.parse(JSON.stringify(DEFAULT_WANTS));
        savePortfolioData();
        saveWantsData();
        await syncPortfolioWithDiskCsv(true);
        populateFilterDropdowns();
        populateWantsFilterDropdowns();
        render();
        showToast("Database e File CSV ripristinati alle 29 carte originali!");
      }
    });
  }

  // ==========================================
  // CARDTRADER LIVE API SYNC LOGIC
  // ==========================================
  
  // ==========================================
  // MULTI-MARKETPLACE & HD ARTWORK ENGINE
  // ==========================================
  async function startMarketplacesSyncAll() {
    if (!mpSyncModal) return;
    mpSyncModal.style.display = "flex";
    mpSyncModal.setAttribute("aria-hidden", "false");
    if (btnCloseMpDone) btnCloseMpDone.style.display = "none";
    if (mpLogsBox) mpLogsBox.innerHTML = "";
    if (mpProgressFill) mpProgressFill.style.width = "15%";
    if (mpProgressPctText) mpProgressPctText.textContent = "15%";
    if (mpProgressStatusText) mpProgressStatusText.textContent = `Interrogazione YGOPRODeck & Mercati per ${cards.length} carte...`;

    try {
      const response = await fetch("/api/marketplaces/sync-all", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ cards: cards, wants: wants })
      });

      if (!response.ok) {
        throw new Error(`Errore Server HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Sincronizzazione non riuscita");
      }

      if (mpProgressFill) mpProgressFill.style.width = "100%";
      if (mpProgressPctText) mpProgressPctText.textContent = "100%";
      if (mpProgressStatusText) mpProgressStatusText.textContent = `✅ Sincronizzazione completata! ${result.cards.length} carte arricchite con immagini e quotazioni.`;
      if (btnCloseMpDone) btnCloseMpDone.style.display = "inline-flex";

      // Render logs
      if (mpLogsBox && Array.isArray(result.logs)) {
        mpLogsBox.innerHTML = result.logs.map(log => {
          if (log.error) {
            return `
              <div class="ct-log-row error">
                <span class="ct-log-name">${escapeHtml(log.cardName)} (${escapeHtml(log.code)})</span>
                <span class="ct-log-diff" style="color: var(--trend-down);">Errore: ${escapeHtml(log.error)}</span>
              </div>`;
          }
          const sources = (log.sources || []).join(" • ") || "Dati aggiornati";
          return `
            <div class="ct-log-row ok">
              <span class="ct-log-name">${escapeHtml(log.cardName)} (${escapeHtml(log.code)})</span>
              <span class="ct-log-diff" style="color: #38bdf8;">${escapeHtml(sources)}</span>
            </div>`;
        }).join("");
      }

      // Update state
      cards = result.cards.map(c => ({ ...c, updatedAt: c.updatedAt || new Date().toISOString() }));
      savePortfolioData();
      populateFilterDropdowns();
      render();
      if (result.usage) {
        updateJustTcgQuotaUi(result.usage);
      } else {
        await checkJustTcgQuota();
      }
      showToast(`🎉 ${result.cards.length} carte sincronizzate con successo con YGOPRODeck e Mercati!`);
    } catch(err) {
      if (mpProgressStatusText) mpProgressStatusText.textContent = `❌ Errore: ${err.message}`;
      if (mpLogsBox) {
        mpLogsBox.innerHTML = `<div class="ct-log-row error"><span class="ct-log-name">Errore durante la sincronizzazione: ${escapeHtml(err.message)}</span></div>`;
      }
      if (btnCloseMpDone) btnCloseMpDone.style.display = "inline-flex";
    }
  }

  async function syncSingleMarketplaces(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    showToast(`🌐 Sincronizzazione "${card.name}" con YGOPRODeck & Mercati...`);
    try {
      const response = await fetch("/api/marketplaces/sync-single", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ card: card })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Impossibile aggiornare");

      const idx = cards.findIndex(c => c.id === id);
      if (idx !== -1) {
        cards[idx] = { ...result.card, updatedAt: new Date().toISOString() };
        savePortfolioData();
        await syncPortfolioWithDiskCsv(true);
        render();
        if (result.usage) {
          updateJustTcgQuotaUi(result.usage);
        } else {
          await checkJustTcgQuota();
        }
        showToast(`✅ "${card.name}" aggiornata con successo!`);
      }
    } catch(err) {
      console.error("Errore sync carta:", err);
      showToast(`❌ Errore sincronizzazione: ${err.message}`, "error");
    }
  }

  // ==========================================
  // CARD DETAIL LIGHTBOX
  // ==========================================
  function openCardLightbox(cardId) {
    const card = cards.find(c => c.id === cardId) || wants.find(w => w.id === cardId);
    if (!card || !cardLightboxModal) return;

    if (lightboxImg) {
      lightboxImg.src = card.imageUrlLarge || card.imageUrl || "https://images.ygoprodeck.com/images/cards/placeholder.jpg";
      lightboxImg.alt = card.name;
    }
    if (lightboxName) lightboxName.textContent = card.name;
    if (lightboxSub) {
      lightboxSub.innerHTML = `${escapeHtml(card.code || '')} • ${escapeHtml(card.expansion || '')} • ${getLanguageFlag(card.language)} ${escapeHtml(card.language || '')}`;
    }
    if (lightboxTags) {
      lightboxTags.innerHTML = `
        <span class="badge-rarity ${getRarityClass(card.rarity)}">${escapeHtml(card.rarity)}</span>
        <span class="badge-condition ${getConditionClass(card.condition || card.targetCondition)}">${escapeHtml(card.condition || card.targetCondition || 'Near Mint')}</span>
        ${card.cardType ? `<span class="badge-cardtype">${escapeHtml(card.cardType)}</span>` : ''}
        ${card.archetype ? `<span class="badge-condition" style="color:var(--accent-gold);">Archetipo: ${escapeHtml(card.archetype)}</span>` : ''}
      `;
    }
    const lbTs = document.getElementById("lightbox-timestamp");
    if (lbTs) {
      lbTs.innerHTML = `🕒 <strong>Ultima Modifica:</strong> ${formatFullDate(card.updatedAt)}`;
    }
    if (lightboxDesc) {
      lightboxDesc.textContent = card.desc || "Dettagli effetto disponibili sincronizzando la carta con il database YGOPRODeck.";
    }

    if (lightboxPricesGrid) {
      lightboxPricesGrid.innerHTML = `
        <div class="lpg-item">
          <div class="lpg-name">Cardmarket Trend</div>
          <div class="lpg-val" style="color: #38bdf8;">${formatEuro(card.cmTrend)}</div>
        </div>
        <div class="lpg-item">
          <div class="lpg-name">CardTrader Trend</div>
          <div class="lpg-val" style="color: #fb923c;">${formatEuro(card.ctTrend)}</div>
        </div>
        <div class="lpg-item">
          <div class="lpg-name">eBay Monitor</div>
          <div class="lpg-val" style="color: var(--eb-gold);">${formatEuro(card.ebTrend)}</div>
        </div>
      `;
    }

    if (lightboxLinksRow) {
      const urls = getCardUrls(card);
      lightboxLinksRow.innerHTML = `
        <a href="${urls.cmBestUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex:1; font-size:0.8rem;" title="Cerca su Cardmarket Italia">
          <span style="color:#0284c7;">●</span> Cardmarket
        </a>
        <a href="${urls.ctBestUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex:1; font-size:0.8rem;" title="Cerca su CardTrader">
          <span style="color:#f97316;">●</span> CardTrader
        </a>
        <a href="${urls.ebUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex:1; font-size:0.8rem;" title="Cerca su eBay.it Compralo Subito">
          <span style="color:#eab308;">●</span> eBay.it
        </a>
        <a href="${urls.ygoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex:1; font-size:0.8rem;" title="Vedi scheda completa e tutti i set su YGOPRODeck">
          <span style="color:#10b981;">🃏</span> YGOPRODeck
        </a>
      `;
    }

    cardLightboxModal.style.display = "flex";
    cardLightboxModal.setAttribute("aria-hidden", "false");
  }

  function closeCardLightbox() {
    if (cardLightboxModal) {
      cardLightboxModal.style.display = "none";
      cardLightboxModal.setAttribute("aria-hidden", "true");
    }
  }

  // ==========================================
  // API CONFIGURATION & JUSTTCG QUOTA MONITOR
  // ==========================================
  async function checkJustTcgQuota() {
    try {
      const res = await fetch("/api/justtcg/usage", { headers: getAuthHeaders() });
      if (res.ok) {
        const usage = await res.json();
        updateJustTcgQuotaUi(usage);
      }
    } catch(e) {}
  }

  function updateJustTcgQuotaUi(usage) {
    if (!usage) return;
    const pill = document.getElementById("justtcg-quota-pill");
    const pillRemaining = document.getElementById("jqp-remaining");
    const pillBadge = document.getElementById("jqp-badge");

    // Header Quota Pill: ALWAYS visible when JustTCG API key is configured!
    if (pill) {
      if (usage.configured) {
        pill.style.display = "inline-flex";
        if (pillRemaining) pillRemaining.textContent = `${usage.remaining}`;
        if (pillBadge) pillBadge.textContent = `${usage.count} / ${usage.monthlyLimit}`;
        pill.classList.remove("warning", "exceeded");
        if (usage.isExceeded) {
          pill.classList.add("exceeded");
          pill.title = `⚠️ Limite mensile JustTCG raggiunto (${usage.count}/${usage.monthlyLimit}). Reset il ${usage.nextResetDate}. Clicca per gestire le API.`;
        } else if (usage.isWarning) {
          pill.classList.add("warning");
          pill.title = `⚠️ Superata la soglia di 500 chiamate JustTCG. Rimaste: ${usage.remaining} (Reset il ${usage.nextResetDate}). Clicca per gestire le API.`;
        } else {
          pill.title = `🌐 JustTCG API attiva: ${usage.count} usate questo mese (${usage.remaining} rimaste). Reset il ${usage.nextResetDate}. Clicca per gestire le API.`;
        }
      } else {
        pill.style.display = "none";
      }
    }

    // Modal JustTCG Quota Box
    const countText = document.getElementById("justtcg-quota-count-text");
    const fillBar = document.getElementById("justtcg-progress-fill");
    const remText = document.getElementById("justtcg-quota-remaining-text");
    const resetText = document.getElementById("justtcg-quota-reset-text");
    const warningBanner = document.getElementById("justtcg-quota-warning-banner");
    const statusBadge = document.getElementById("status-justtcg-badge");

    if (statusBadge) {
      if (usage.configured) {
        statusBadge.textContent = "Attivo";
        statusBadge.className = "badge-status-ok";
      } else {
        statusBadge.textContent = "Opzionale";
        statusBadge.className = "badge-status-opt";
      }
    }

    const pct = Math.min(100, Math.round((usage.count / usage.monthlyLimit) * 100));
    if (countText) countText.textContent = `${usage.count} / ${usage.monthlyLimit} usate (${pct}%)`;
    if (remText) remText.textContent = `${usage.remaining}`;
    if (resetText) resetText.textContent = `Prossimo azzeramento: ${usage.nextResetDate} (${usage.daysUntilReset} gg)`;

    if (fillBar) {
      fillBar.style.width = `${pct}%`;
      if (pct >= 95) fillBar.style.background = "#ef4444";
      else if (pct >= 50) fillBar.style.background = "#f59e0b";
      else fillBar.style.background = "#10b981";
    }

    if (warningBanner) {
      if (usage.isExceeded) {
        warningBanner.style.display = "block";
        warningBanner.style.background = "rgba(239, 68, 68, 0.15)";
        warningBanner.style.borderColor = "rgba(239, 68, 68, 0.3)";
        warningBanner.style.color = "#f87171";
        warningBanner.innerHTML = `⛔ <strong>Limite mensile di 1.000 chiamate raggiunto!</strong> Le interrogazioni automatiche a JustTCG sono sospese fino al <strong>${usage.nextResetDate}</strong> per proteggere il tuo account.`;
      } else if (usage.isWarning) {
        warningBanner.style.display = "block";
        warningBanner.style.background = "rgba(245, 158, 11, 0.15)";
        warningBanner.style.borderColor = "rgba(245, 158, 11, 0.3)";
        warningBanner.style.color = "#fbbf24";
        warningBanner.innerHTML = `⚠️ <strong>Superata la soglia di 500 chiamate (${usage.count}/1.000).</strong> Rimangono <strong>${usage.remaining} richieste</strong> disponibili fino al <strong>${usage.nextResetDate}</strong>.`;
      } else {
        warningBanner.style.display = "none";
      }
    }
  }

  async function openApiConfigModal() {
    if (!apiConfigModal) return;
    try {
      const res = await fetch("/api/config/providers", { headers: getAuthHeaders() });
      if (res.ok) {
        const config = await res.json();
        if (inputCardtraderToken && config.cardTrader && config.cardTrader.tokenMasked) {
          inputCardtraderToken.placeholder = `Attivo: ${config.cardTrader.tokenMasked}`;
        }
        if (inputJusttcgKey && config.justTcg && config.justTcg.keyMasked) {
          inputJusttcgKey.placeholder = `Attivo: ${config.justTcg.keyMasked}`;
        }
        if (config.justTcg && config.justTcg.usage) {
          updateJustTcgQuotaUi(config.justTcg.usage);
        }
      }
    } catch(e) {}

    apiConfigModal.style.display = "flex";
    apiConfigModal.setAttribute("aria-hidden", "false");
  }

  function closeApiConfigModal() {
    if (apiConfigModal) {
      apiConfigModal.style.display = "none";
      apiConfigModal.setAttribute("aria-hidden", "true");
    }
  }

  async function saveApiConfig() {
    const cardTraderToken = inputCardtraderToken ? inputCardtraderToken.value.trim() : "";
    const justTcgKey = inputJusttcgKey ? inputJusttcgKey.value.trim() : "";

    const payload = {};
    if (cardTraderToken) payload.cardTraderToken = cardTraderToken;
    if (justTcgKey) payload.justTcgKey = justTcgKey;

    try {
      const res = await fetch("/api/config/providers", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Impostazioni API salvate con successo!");
        closeApiConfigModal();
        await checkJustTcgQuota();
      } else {
        alert("Errore salvataggio: " + (data.error || "Impossibile salvare"));
      }
    } catch(err) {
      alert("Errore di rete: " + err.message);
    }
  }

  async function startCardTraderSyncAll() {
    const ctSyncModal = document.getElementById("ct-sync-modal");
    const btnCloseCtDone = document.getElementById("btn-close-ct-done");
    const ctLogsBox = document.getElementById("ct-logs-box");
    const ctProgressStatusText = document.getElementById("ct-progress-status-text");
    const ctProgressPctText = document.getElementById("ct-progress-pct-text");
    const ctProgressFill = document.getElementById("ct-progress-fill");

    ctSyncModal.style.display = "flex";
    ctSyncModal.setAttribute("aria-hidden", "false");
    btnCloseCtDone.style.display = "none";
    ctLogsBox.innerHTML = "";
    ctProgressFill.style.width = "15%";
    ctProgressPctText.textContent = "15%";
    ctProgressStatusText.textContent = `Connessione a CardTrader API... Controllo ${cards.length} carte...`;

    try {
      const response = await fetch("/api/cardtrader/sync-all", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ cards: cards })
      });

      if (!response.ok) {
        throw new Error(`Errore Server HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Sincronizzazione non riuscita");
      }

      ctProgressFill.style.width = "100%";
      ctProgressPctText.textContent = "100%";
      ctProgressStatusText.textContent = `✅ Sincronizzazione completata! ${result.cards.length} carte aggiornate e salvate nel CSV.`;
      btnCloseCtDone.style.display = "inline-flex";

      // Render logs
      ctLogsBox.innerHTML = "";
      if (result.logs && result.logs.length) {
        result.logs.forEach(log => {
          const row = document.createElement("div");
          row.className = "ct-log-row" + (log.status === "no_listings" || log.status === "error" ? " unchanged" : "");
          
          if (log.newCtTrend !== undefined) {
            row.innerHTML = `
              <div>
                <div class="ct-log-card-name">${escapeHtml(log.cardName)} <span style="font-size:0.75rem; color:var(--text-muted);">(${escapeHtml(log.code)})</span></div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">${escapeHtml(log.expansion || "")} • <span style="color:#38bdf8; font-weight:500;">${escapeHtml(log.filterLevel || "Filtro")}</span> (${log.matchedListings !== undefined ? log.matchedListings : log.listings} copie)</div>
              </div>
              <div class="ct-log-prices">
                <span class="ct-price-old">Min ${formatEuro(log.oldCtMin)} / Trend ${formatEuro(log.oldCtTrend)}</span>
                ➔
                <span class="ct-price-new">Min ${formatEuro(log.newCtMin)} / Trend ${formatEuro(log.newCtTrend)}</span>
              </div>
            `;
          } else {
            row.innerHTML = `
              <div>
                <div class="ct-log-card-name">${escapeHtml(log.cardName)} <span style="font-size:0.75rem; color:var(--text-muted);">(${escapeHtml(log.code)})</span></div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(log.note || log.error || "")}</div>
              </div>
              <div class="ct-log-prices">
                <span style="color: var(--text-muted);">Prezzi invariati</span>
              </div>
            `;
          }
          ctLogsBox.appendChild(row);
        });
      }

      // Update local dataset
      cards = result.cards.map(c => ({ ...c, updatedAt: c.updatedAt || new Date().toISOString() }));
      savePortfolioData();
      populateFilterDropdowns();
      render();
      showToast(`⚡ ${result.cards.length} carte sincronizzate con successo da CardTrader e salvate nel CSV!`);
    } catch (err) {
      console.error("Errore sync CardTrader:", err);
      ctProgressStatusText.textContent = `❌ Errore durante la sincronizzazione: ${err.message}`;
      ctProgressFill.style.width = "100%";
      ctProgressFill.style.background = "var(--trend-down)";
      btnCloseCtDone.style.display = "inline-flex";
      showToast(`Errore sincronizzazione: ${err.message}`);
    }
  }

  async function startCardTraderSyncSingle(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    showToast(`⚡ Sincronizzazione CardTrader per "${card.name}"...`);

    try {
      const response = await fetch("/api/cardtrader/sync-single", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ card })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const resPrice = await response.json();

      if (resPrice.success && resPrice.listingsCount > 0) {
        card.ctMin = resPrice.minPrice;
        card.ctTrend = resPrice.trendPrice;
        card.baseCtMin = resPrice.minPrice;
        card.baseCtTrend = resPrice.trendPrice;
        card.updatedAt = new Date().toISOString();

        savePortfolioData();
        await syncPortfolioWithDiskCsv(true);
        render();

        showToast(`⚡ "${card.name}" aggiornata: Min ${formatEuro(resPrice.minPrice)} | Trend ${formatEuro(resPrice.trendPrice)} (${resPrice.listingsCount} inserzioni)`);
      } else {
        showToast(`Info CardTrader per "${card.name}": ${resPrice.reason || resPrice.note || 'Nessuna inserzione'}`);
      }
    } catch (err) {
      console.error("Errore sync singola carta:", err);
      showToast(`Errore CardTrader API: ${err.message}`);
    }
  }

  // ==========================================
  // 1-CLICK AUTO-FILL WITH CARDTRADER & YGOPRODECK
  // ==========================================
  async function triggerAutoFill(isWant = false) {
    const inputEl = document.getElementById(isWant ? "want-form-autofill-url" : "form-autofill-url");
    const btnEl = document.getElementById(isWant ? "want-btn-autofill-fetch" : "btn-autofill-fetch");
    const btnTextEl = document.getElementById(isWant ? "want-autofill-btn-text" : "autofill-btn-text");
    const statusMsgEl = document.getElementById(isWant ? "want-autofill-status-msg" : "autofill-status-msg");
    const langSelect = document.getElementById(isWant ? "want-form-lang" : "form-lang");
    const condSelect = document.getElementById(isWant ? "want-form-condition" : "form-condition");

    const rawInput = inputEl ? inputEl.value.trim() : "";
    if (!rawInput) {
      if (statusMsgEl) {
        statusMsgEl.className = "autofill-status-msg error";
        statusMsgEl.textContent = "⚠️ Incolla un link CardTrader o un ID Blueprint numerico prima di procedere.";
        statusMsgEl.style.display = "flex";
      }
      return;
    }

    const currentLang = langSelect ? langSelect.value : "Italiano (ITA)";
    const currentCond = condSelect ? condSelect.value : "Near Mint";

    // Set loading state
    if (btnEl) btnEl.disabled = true;
    if (btnTextEl) btnTextEl.textContent = "⏳ Analisi Blueprint & YGOPRODeck...";
    if (statusMsgEl) {
      statusMsgEl.className = "autofill-status-msg loading";
      statusMsgEl.innerHTML = "🔍 Interrogazione CardTrader API & download artwork YGOPRODeck in corso...";
      statusMsgEl.style.display = "flex";
    }

    try {
      const res = await fetch("/api/cardtrader/lookup-blueprint", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: rawInput,
          language: currentLang,
          condition: currentCond,
          edition: "1st Edition"
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Impossibile recuperare i dati dal Blueprint");
      }

      // Populate Form Fields
      if (isWant) {
        if (data.game) document.getElementById("want-form-game").value = data.game;
        document.getElementById("want-form-name").value = data.name || data.englishName;
        document.getElementById("want-form-english-name").value = data.englishName || "";
        document.getElementById("want-form-set").value = data.expansion || "";
        document.getElementById("want-form-code").value = data.code || "";
        document.getElementById("want-form-rarity").value = data.rarity || "";
        document.getElementById("want-form-edition").value = data.edition || "1ª Edizione";
        document.getElementById("want-form-lang").value = data.language || "Italiano (ITA)";
        document.getElementById("want-form-condition").value = data.condition || "Near Mint";

        // Prezzi
        document.getElementById("want-form-cm-min").value = data.cmMin ? data.cmMin.toFixed(2) : "";
        document.getElementById("want-form-cm-trend").value = data.cmTrend ? data.cmTrend.toFixed(2) : "";
        document.getElementById("want-form-ct-min").value = data.ctMin ? data.ctMin.toFixed(2) : "";
        document.getElementById("want-form-ct-trend").value = data.ctTrend ? data.ctTrend.toFixed(2) : "";
        document.getElementById("want-form-eb-min").value = data.ebMin ? data.ebMin.toFixed(2) : "";
        document.getElementById("want-form-eb-trend").value = data.ebTrend ? data.ebTrend.toFixed(2) : "";

        // Target Budget suggestion if empty
        const targetInput = document.getElementById("want-form-target-price");
        if (targetInput && (!targetInput.value || parseFloat(targetInput.value) === 0)) {
          const suggested = data.ctMin || data.cmMin || data.ebMin || 0;
          if (suggested > 0) targetInput.value = suggested.toFixed(2);
        }

        // Hidden Metadata
        document.getElementById("form-want-blueprint-id").value = data.blueprintId || "";
        document.getElementById("form-want-trader-url").value = data.cardTraderUrl || "";
        document.getElementById("form-want-ygoprodeck-url").value = data.ygoprodeckUrl || "";
        document.getElementById("form-want-image-url").value = data.imageUrl || "";
        document.getElementById("form-want-image-url-large").value = data.imageUrlLarge || "";
        document.getElementById("form-want-image-url-cropped").value = data.imageUrlCropped || "";
        document.getElementById("form-want-card-type").value = data.cardType || "";
        document.getElementById("form-want-desc").value = data.desc || "";
        document.getElementById("form-want-archetype").value = data.archetype || "";
        document.getElementById("form-want-atk").value = data.atk !== null && data.atk !== undefined ? data.atk : "";
        document.getElementById("form-want-def").value = data.def !== null && data.def !== undefined ? data.def : "";
        document.getElementById("form-want-level").value = data.level !== null && data.level !== undefined ? data.level : "";
        document.getElementById("form-want-attribute").value = data.attribute || "";
      } else {
        if (data.game) document.getElementById("form-game").value = data.game;
        document.getElementById("form-name").value = data.name || data.englishName;
        document.getElementById("form-english-name").value = data.englishName || "";
        document.getElementById("form-set").value = data.expansion || "";
        document.getElementById("form-code").value = data.code || "";
        document.getElementById("form-rarity").value = data.rarity || "";
        document.getElementById("form-edition").value = data.edition || "1ª Edizione";
        document.getElementById("form-lang").value = data.language || "Italiano (ITA)";
        document.getElementById("form-condition").value = data.condition || "Near Mint";
        document.getElementById("form-notes").value = data.notes || `Blueprint CT: #${data.blueprintId}`;

        // Prezzi
        document.getElementById("form-cm-min").value = data.cmMin ? data.cmMin.toFixed(2) : "";
        document.getElementById("form-cm-trend").value = data.cmTrend ? data.cmTrend.toFixed(2) : "";
        document.getElementById("form-ct-min").value = data.ctMin ? data.ctMin.toFixed(2) : "";
        document.getElementById("form-ct-trend").value = data.ctTrend ? data.ctTrend.toFixed(2) : "";
        document.getElementById("form-eb-min").value = data.ebMin ? data.ebMin.toFixed(2) : "";
        document.getElementById("form-eb-trend").value = data.ebTrend ? data.ebTrend.toFixed(2) : "";
        document.getElementById("form-trend-status").value = data.trendStatus || "stable";
        document.getElementById("form-trend-pct").value = data.trendPct !== undefined ? data.trendPct : 0;

        // Hidden Metadata
        document.getElementById("form-card-blueprint-id").value = data.blueprintId || "";
        document.getElementById("form-card-trader-url").value = data.cardTraderUrl || "";
        document.getElementById("form-card-ygoprodeck-url").value = data.ygoprodeckUrl || "";
        document.getElementById("form-card-image-url").value = data.imageUrl || "";
        document.getElementById("form-card-image-url-large").value = data.imageUrlLarge || "";
        document.getElementById("form-card-image-url-cropped").value = data.imageUrlCropped || "";
        document.getElementById("form-card-type").value = data.cardType || "";
        document.getElementById("form-card-desc").value = data.desc || "";
        document.getElementById("form-card-archetype").value = data.archetype || "";
        document.getElementById("form-card-atk").value = data.atk !== null && data.atk !== undefined ? data.atk : "";
        document.getElementById("form-card-def").value = data.def !== null && data.def !== undefined ? data.def : "";
        document.getElementById("form-card-level").value = data.level !== null && data.level !== undefined ? data.level : "";
        document.getElementById("form-card-attribute").value = data.attribute || "";
      }

      if (statusMsgEl) {
        statusMsgEl.className = "autofill-status-msg success";
        statusMsgEl.innerHTML = `✅ <strong>"${escapeHtml(data.englishName)}"</strong> [${(data.game || 'TCG').toUpperCase()}] caricata! Set: ${escapeHtml(data.expansion)} (${escapeHtml(data.code)}) • ${escapeHtml(data.rarity)} • CT Min: €${data.ctMin ? data.ctMin.toFixed(2) : '0.00'}`;
        statusMsgEl.style.display = "flex";
      }

      showToast(`✨ Dati e quotazioni caricati con successo da CardTrader & Database TCG!`);
    } catch(err) {
      if (statusMsgEl) {
        statusMsgEl.className = "autofill-status-msg error";
        statusMsgEl.textContent = `❌ Errore auto-fill: ${err.message}`;
        statusMsgEl.style.display = "flex";
      }
    } finally {
      if (btnEl) btnEl.disabled = false;
      if (btnTextEl) btnTextEl.textContent = "⚡ Compila Dati";
    }
  }

  // ==========================================
  // MODAL HANDLERS - PORTFOLIO
  // ==========================================
  function openCardModal(cardId) {
    editingCardId = cardId;
    cardForm.reset();

    const tsEl = document.getElementById("card-modal-timestamp");
    const autofillStatusMsg = document.getElementById("autofill-status-msg");
    if (autofillStatusMsg) autofillStatusMsg.style.display = "none";

    if (cardId) {
      cardModalTitle.textContent = "Modifica Carta nel Portfolio";
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      if (tsEl) {
        tsEl.style.display = "flex";
        tsEl.innerHTML = `🕒 <strong>Ultima modifica:</strong> ${formatFullDate(card.updatedAt)}`;
      }

      document.getElementById("form-game").value = card.game || "yugioh";
      document.getElementById("form-autofill-url").value = card.cardTraderUrl || (card.blueprintId ? String(card.blueprintId) : "");
      document.getElementById("form-card-id").value = card.id;
      document.getElementById("form-card-blueprint-id").value = card.blueprintId || "";
      document.getElementById("form-card-trader-url").value = card.cardTraderUrl || "";
      document.getElementById("form-card-ygoprodeck-url").value = card.ygoprodeckUrl || "";
      document.getElementById("form-card-image-url").value = card.imageUrl || "";
      document.getElementById("form-card-image-url-large").value = card.imageUrlLarge || "";
      document.getElementById("form-card-image-url-cropped").value = card.imageUrlCropped || "";
      document.getElementById("form-card-type").value = card.cardType || "";
      document.getElementById("form-card-desc").value = card.desc || "";
      document.getElementById("form-card-archetype").value = card.archetype || "";
      document.getElementById("form-card-atk").value = card.atk !== null && card.atk !== undefined ? card.atk : "";
      document.getElementById("form-card-def").value = card.def !== null && card.def !== undefined ? card.def : "";
      document.getElementById("form-card-level").value = card.level !== null && card.level !== undefined ? card.level : "";
      document.getElementById("form-card-attribute").value = card.attribute || "";

      document.getElementById("form-name").value = card.name || "";
      document.getElementById("form-english-name").value = card.englishName || "";
      document.getElementById("form-set").value = card.expansion || "";
      document.getElementById("form-code").value = card.code || "";
      document.getElementById("form-rarity").value = card.rarity || "";
      document.getElementById("form-edition").value = card.edition || "";
      document.getElementById("form-lang").value = card.language || "Italiano (ITA)";
      document.getElementById("form-condition").value = card.condition || "Near Mint";
      document.getElementById("form-notes").value = card.notes || "";

      document.getElementById("form-cm-min").value = card.cmMin || "";
      document.getElementById("form-cm-trend").value = card.cmTrend || "";
      document.getElementById("form-ct-min").value = card.ctMin || "";
      document.getElementById("form-ct-trend").value = card.ctTrend || "";
      document.getElementById("form-eb-min").value = card.ebMin || "";
      document.getElementById("form-eb-trend").value = card.ebTrend || "";

      document.getElementById("form-trend-status").value = card.trendStatus || "stable";
      document.getElementById("form-trend-pct").value = card.trendPct !== undefined ? card.trendPct : "";
    } else {
      if (tsEl) {
        tsEl.style.display = "none";
      }
      cardModalTitle.textContent = "Aggiungi Nuova Carta nel Portfolio";
      document.getElementById("form-game").value = currentBrandFilter !== "all" ? currentBrandFilter : "yugioh";
      document.getElementById("form-autofill-url").value = "";
      document.getElementById("form-card-id").value = "";
      document.getElementById("form-card-blueprint-id").value = "";
      document.getElementById("form-card-trader-url").value = "";
      document.getElementById("form-card-ygoprodeck-url").value = "";
      document.getElementById("form-card-image-url").value = "";
      document.getElementById("form-card-image-url-large").value = "";
      document.getElementById("form-card-image-url-cropped").value = "";
      document.getElementById("form-card-type").value = "";
      document.getElementById("form-card-desc").value = "";
      document.getElementById("form-card-archetype").value = "";
      document.getElementById("form-card-atk").value = "";
      document.getElementById("form-card-def").value = "";
      document.getElementById("form-card-level").value = "";
      document.getElementById("form-card-attribute").value = "";

      document.getElementById("form-name").value = "";
      document.getElementById("form-english-name").value = "";
      document.getElementById("form-lang").value = "Italiano (ITA)";
      document.getElementById("form-condition").value = "Near Mint";
      document.getElementById("form-trend-status").value = "stable";
    }

    cardModal.style.display = "flex";
    cardModal.setAttribute("aria-hidden", "false");
  }

  function closeCardModal() {
    cardModal.style.display = "none";
    cardModal.setAttribute("aria-hidden", "true");
    editingCardId = null;
  }

  async function handleCardFormSubmit(e) {
    e.preventDefault();

    const game = document.getElementById("form-game").value || "yugioh";
    const name = document.getElementById("form-name").value.trim();
    const englishName = document.getElementById("form-english-name").value.trim() || name;
    const expansion = document.getElementById("form-set").value.trim();
    const code = document.getElementById("form-code").value.trim();
    const rarity = document.getElementById("form-rarity").value.trim();
    const edition = document.getElementById("form-edition").value.trim();
    const language = document.getElementById("form-lang").value;
    const condition = document.getElementById("form-condition").value;
    const notes = document.getElementById("form-notes").value.trim();

    const blueprintIdVal = document.getElementById("form-card-blueprint-id").value;
    const blueprintId = blueprintIdVal ? parseInt(blueprintIdVal, 10) : (editingCardId ? cards.find(c => c.id === editingCardId)?.blueprintId : null);
    const cardTraderUrl = document.getElementById("form-card-trader-url").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.cardTraderUrl : null);
    const ygoprodeckUrl = document.getElementById("form-card-ygoprodeck-url").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.ygoprodeckUrl : null);
    const imageUrl = document.getElementById("form-card-image-url").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.imageUrl : null);
    const imageUrlLarge = document.getElementById("form-card-image-url-large").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.imageUrlLarge : null);
    const imageUrlCropped = document.getElementById("form-card-image-url-cropped").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.imageUrlCropped : null);
    const cardType = document.getElementById("form-card-type").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.cardType : "");
    const desc = document.getElementById("form-card-desc").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.desc : "");
    const archetype = document.getElementById("form-card-archetype").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.archetype : "");
    const atkVal = document.getElementById("form-card-atk").value;
    const defVal = document.getElementById("form-card-def").value;
    const levelVal = document.getElementById("form-card-level").value;
    const attribute = document.getElementById("form-card-attribute").value || (editingCardId ? cards.find(c => c.id === editingCardId)?.attribute : "");

    const atk = atkVal !== "" ? parseInt(atkVal, 10) : (editingCardId ? cards.find(c => c.id === editingCardId)?.atk : null);
    const def = defVal !== "" ? parseInt(defVal, 10) : (editingCardId ? cards.find(c => c.id === editingCardId)?.def : null);
    const level = levelVal !== "" ? parseInt(levelVal, 10) : (editingCardId ? cards.find(c => c.id === editingCardId)?.level : null);

    const cmMin = parseFloat(document.getElementById("form-cm-min").value) || 0;
    const cmTrend = parseFloat(document.getElementById("form-cm-trend").value) || 0;
    const ctMin = parseFloat(document.getElementById("form-ct-min").value) || 0;
    const ctTrend = parseFloat(document.getElementById("form-ct-trend").value) || 0;
    const ebMin = parseFloat(document.getElementById("form-eb-min").value) || 0;
    const ebTrend = parseFloat(document.getElementById("form-eb-trend").value) || 0;

    const trendStatus = document.getElementById("form-trend-status").value;
    const trendPct = parseFloat(document.getElementById("form-trend-pct").value) || 0;
    const nowIso = new Date().toISOString();

    if (editingCardId) {
      const index = cards.findIndex(c => c.id === editingCardId);
      if (index !== -1) {
        cards[index] = {
          ...cards[index],
          game,
          name, englishName, expansion, code, rarity, edition, language, condition, notes,
          blueprintId, cardTraderUrl, ygoprodeckUrl, imageUrl, imageUrlLarge, imageUrlCropped,
          cardType, desc, archetype, atk, def, level, attribute,
          cmMin, cmTrend, ctMin, ctTrend, ebMin, ebTrend,
          baseCmMin: cmMin, baseCmTrend: cmTrend,
          baseCtMin: ctMin, baseCtTrend: ctTrend,
          baseEbMin: ebMin, baseEbTrend: ebTrend,
          trendStatus, trendPct,
          updatedAt: nowIso
        };
        showToast(`Carta "${name}" modificata con successo!`);
      }
    } else {
      const maxId = cards.reduce((max, c) => Math.max(max, c.id || 0), 0);
      const maxNum = cards.reduce((max, c) => Math.max(max, c.num || 0), 0);
      const newCard = {
        id: maxId + 1,
        num: maxNum + 1,
        game,
        name, englishName, expansion, code, rarity, edition, language, condition, notes,
        blueprintId, cardTraderUrl, ygoprodeckUrl, imageUrl, imageUrlLarge, imageUrlCropped,
        cardType, desc, archetype, atk, def, level, attribute,
        cmMin, cmTrend, ctMin, ctTrend, ebMin, ebTrend,
        baseCmMin: cmMin, baseCmTrend: cmTrend,
        baseCtMin: ctMin, baseCtTrend: ctTrend,
        baseEbMin: ebMin, baseEbTrend: ebTrend,
        trendStatus, trendPct,
        updatedAt: nowIso
      };
      cards.push(newCard);
      showToast(`Carta "${name}" aggiunta al portfolio!`);
    }

    savePortfolioData();
    await syncPortfolioWithDiskCsv(true);
    populateFilterDropdowns();
    render();
    closeCardModal();
  }

  async function deleteCard(id) {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    if (confirm(`Sei sicuro di voler rimuovere "${card.name}" (${card.code}) dal portfolio e dal file?`)) {
      cards = cards.filter(c => c.id !== id);
      savePortfolioData();
      await syncPortfolioWithDiskCsv(true);
      populateFilterDropdowns();
      render();
      showToast(`Carta rimossa dal portfolio.`);
    }
  }

  // ==========================================
  // MODAL HANDLERS - WANTS
  // ==========================================
  function openWantModal(wantId) {
    editingWantId = wantId;
    wantForm.reset();

    const tsEl = document.getElementById("want-modal-timestamp");
    const autofillStatusMsg = document.getElementById("want-autofill-status-msg");
    if (autofillStatusMsg) autofillStatusMsg.style.display = "none";

    if (wantId) {
      wantModalTitle.textContent = "Modifica Want nella Wishlist";
      const want = wants.find(w => w.id === wantId);
      if (!want) return;

      if (tsEl) {
        tsEl.style.display = "flex";
        tsEl.innerHTML = `🕒 <strong>Ultima modifica:</strong> ${formatFullDate(want.updatedAt)}`;
      }

      document.getElementById("want-form-game").value = want.game || "yugioh";
      document.getElementById("want-form-autofill-url").value = want.cardTraderUrl || (want.blueprintId ? String(want.blueprintId) : "");
      document.getElementById("form-want-id").value = want.id;
      document.getElementById("form-want-blueprint-id").value = want.blueprintId || "";
      document.getElementById("form-want-trader-url").value = want.cardTraderUrl || "";
      document.getElementById("form-want-ygoprodeck-url").value = want.ygoprodeckUrl || "";
      document.getElementById("form-want-image-url").value = want.imageUrl || "";
      document.getElementById("form-want-image-url-large").value = want.imageUrlLarge || "";
      document.getElementById("form-want-image-url-cropped").value = want.imageUrlCropped || "";
      document.getElementById("form-want-card-type").value = want.cardType || "";
      document.getElementById("form-want-desc").value = want.desc || "";
      document.getElementById("form-want-archetype").value = want.archetype || "";
      document.getElementById("form-want-atk").value = want.atk !== null && want.atk !== undefined ? want.atk : "";
      document.getElementById("form-want-def").value = want.def !== null && want.def !== undefined ? want.def : "";
      document.getElementById("form-want-level").value = want.level !== null && want.level !== undefined ? want.level : "";
      document.getElementById("form-want-attribute").value = want.attribute || "";

      document.getElementById("want-form-name").value = want.name || "";
      document.getElementById("want-form-english-name").value = want.englishName || "";
      document.getElementById("want-form-set").value = want.expansion || "";
      document.getElementById("want-form-code").value = want.code || "";
      document.getElementById("want-form-rarity").value = want.rarity || "";
      document.getElementById("want-form-edition").value = want.edition || "";
      document.getElementById("want-form-lang").value = want.language || "Italiano (ITA)";
      document.getElementById("want-form-condition").value = want.targetCondition || "Near Mint";
      document.getElementById("want-form-target-price").value = want.targetPrice || "";
      document.getElementById("want-form-notes").value = want.notes || "";

      document.getElementById("want-form-cm-min").value = want.cmMin || "";
      document.getElementById("want-form-cm-trend").value = want.cmTrend || "";
      document.getElementById("want-form-ct-min").value = want.ctMin || "";
      document.getElementById("want-form-ct-trend").value = want.ctTrend || "";
      document.getElementById("want-form-eb-min").value = want.ebMin || "";
      document.getElementById("want-form-eb-trend").value = want.ebTrend || "";
    } else {
      if (tsEl) {
        tsEl.style.display = "none";
      }
      wantModalTitle.textContent = "Aggiungi Carta alla Lista Wants";
      document.getElementById("want-form-game").value = currentBrandFilter !== "all" ? currentBrandFilter : "yugioh";
      document.getElementById("want-form-autofill-url").value = "";
      document.getElementById("form-want-id").value = "";
      document.getElementById("form-want-blueprint-id").value = "";
      document.getElementById("form-want-trader-url").value = "";
      document.getElementById("form-want-ygoprodeck-url").value = "";
      document.getElementById("form-want-image-url").value = "";
      document.getElementById("form-want-image-url-large").value = "";
      document.getElementById("form-want-image-url-cropped").value = "";
      document.getElementById("form-want-card-type").value = "";
      document.getElementById("form-want-desc").value = "";
      document.getElementById("form-want-archetype").value = "";
      document.getElementById("form-want-atk").value = "";
      document.getElementById("form-want-def").value = "";
      document.getElementById("form-want-level").value = "";
      document.getElementById("form-want-attribute").value = "";

      document.getElementById("want-form-english-name").value = "";
      document.getElementById("want-form-lang").value = "Italiano (ITA)";
      document.getElementById("want-form-condition").value = "Near Mint";
    }

    wantModal.style.display = "flex";
    wantModal.setAttribute("aria-hidden", "false");
  }

  function closeWantModal() {
    wantModal.style.display = "none";
    wantModal.setAttribute("aria-hidden", "true");
    editingWantId = null;
  }

  async function handleWantFormSubmit(e) {
    e.preventDefault();

    const game = document.getElementById("want-form-game").value || "yugioh";
    const name = document.getElementById("want-form-name").value.trim();
    const englishName = document.getElementById("want-form-english-name").value.trim() || name;
    const expansion = document.getElementById("want-form-set").value.trim();
    const code = document.getElementById("want-form-code").value.trim();
    const rarity = document.getElementById("want-form-rarity").value.trim();
    const edition = document.getElementById("want-form-edition").value.trim();
    const language = document.getElementById("want-form-lang").value;
    const targetCondition = document.getElementById("want-form-condition").value;
    const targetPrice = parseFloat(document.getElementById("want-form-target-price").value) || 0;
    const notes = document.getElementById("want-form-notes").value.trim();

    const blueprintIdVal = document.getElementById("form-want-blueprint-id").value;
    const blueprintId = blueprintIdVal ? parseInt(blueprintIdVal, 10) : (editingWantId ? wants.find(w => w.id === editingWantId)?.blueprintId : null);
    const cardTraderUrl = document.getElementById("form-want-trader-url").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.cardTraderUrl : null);
    const ygoprodeckUrl = document.getElementById("form-want-ygoprodeck-url").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.ygoprodeckUrl : null);
    const imageUrl = document.getElementById("form-want-image-url").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.imageUrl : null);
    const imageUrlLarge = document.getElementById("form-want-image-url-large").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.imageUrlLarge : null);
    const imageUrlCropped = document.getElementById("form-want-image-url-cropped").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.imageUrlCropped : null);
    const cardType = document.getElementById("form-want-card-type").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.cardType : "");
    const desc = document.getElementById("form-want-desc").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.desc : "");
    const archetype = document.getElementById("form-want-archetype").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.archetype : "");
    const atkVal = document.getElementById("form-want-atk") ? document.getElementById("form-want-atk").value : "";
    const defVal = document.getElementById("form-want-def") ? document.getElementById("form-want-def").value : "";
    const levelVal = document.getElementById("form-want-level") ? document.getElementById("form-want-level").value : "";
    const attribute = document.getElementById("form-want-attribute").value || (editingWantId ? wants.find(w => w.id === editingWantId)?.attribute : "");

    const atk = atkVal !== "" ? parseInt(atkVal, 10) : (editingWantId ? wants.find(w => w.id === editingWantId)?.atk : null);
    const def = defVal !== "" ? parseInt(defVal, 10) : (editingWantId ? wants.find(w => w.id === editingWantId)?.def : null);
    const level = levelVal !== "" ? parseInt(levelVal, 10) : (editingWantId ? wants.find(w => w.id === editingWantId)?.level : null);

    const cmMin = parseFloat(document.getElementById("want-form-cm-min").value) || 0;
    const cmTrend = parseFloat(document.getElementById("want-form-cm-trend").value) || 0;
    const ctMin = parseFloat(document.getElementById("want-form-ct-min").value) || 0;
    const ctTrend = parseFloat(document.getElementById("want-form-ct-trend").value) || 0;
    const ebMin = parseFloat(document.getElementById("want-form-eb-min").value) || 0;
    const ebTrend = parseFloat(document.getElementById("want-form-eb-trend").value) || 0;
    const nowIso = new Date().toISOString();

    if (editingWantId) {
      const index = wants.findIndex(w => w.id === editingWantId);
      if (index !== -1) {
        wants[index] = {
          ...wants[index],
          game,
          name, englishName, expansion, code, rarity, edition, language, targetCondition, targetPrice, notes,
          blueprintId, cardTraderUrl, ygoprodeckUrl, imageUrl, imageUrlLarge, imageUrlCropped,
          cardType, desc, archetype, atk, def, level, attribute,
          cmMin, cmTrend, ctMin, ctTrend, ebMin, ebTrend,
          baseCmMin: cmMin, baseCtMin: ctMin, baseEbMin: ebMin,
          updatedAt: nowIso
        };
        showToast(`Want "${name}" modificato con successo!`);
      }
    } else {
      const maxId = wants.reduce((max, w) => Math.max(max, w.id || 0), 100);
      const newWant = {
        id: maxId + 1,
        game,
        name, englishName, expansion, code, rarity, edition, language, targetCondition, targetPrice, notes,
        blueprintId, cardTraderUrl, ygoprodeckUrl, imageUrl, imageUrlLarge, imageUrlCropped,
        cardType, desc, archetype, atk, def, level, attribute,
        cmMin, cmTrend, ctMin, ctTrend, ebMin, ebTrend,
        baseCmMin: cmMin, baseCtMin: ctMin, baseEbMin: ebMin,
        trendStatus: "stable",
        trendPct: 0,
        updatedAt: nowIso
      };
      wants.push(newWant);
      showToast(`Carta "${name}" aggiunta alla Lista Wants!`);
    }

    saveWantsData();
    await syncPortfolioWithDiskCsv(true);
    populateWantsFilterDropdowns();
    render();
    closeWantModal();
  }

  async function deleteWant(id) {
    const want = wants.find(w => w.id === id);
    if (!want) return;

    if (confirm(`Sei sicuro di voler rimuovere "${want.name}" dai tuoi Wants?`)) {
      wants = wants.filter(w => w.id !== id);
      saveWantsData();
      await syncPortfolioWithDiskCsv(true);
      populateWantsFilterDropdowns();
      render();
      showToast(`Carta rimossa dai Wants.`);
    }
  }

  // Convert Want to Owned Card (Moved to Portfolio + Synced to CSV)
  async function convertWantToPortfolio(wantId) {
    const want = wants.find(w => w.id === wantId);
    if (!want) return;

    if (confirm(`🎉 Complimenti per l'acquisto! Vuoi spostare "${want.name}" (${want.code}) direttamente nel tuo Portfolio delle carte possedute e salvarla nel file?`)) {
      const maxId = cards.reduce((max, c) => Math.max(max, c.id || 0), 0);
      const maxNum = cards.reduce((max, c) => Math.max(max, c.num || 0), 0);

      const newCard = {
        id: maxId + 1,
        num: maxNum + 1,
        name: want.name,
        englishName: want.englishName || want.name,
        expansion: want.expansion,
        code: want.code,
        rarity: want.rarity,
        edition: want.edition,
        language: want.language,
        condition: want.targetCondition || "Near Mint",
        cmMin: want.cmMin || want.targetPrice,
        cmTrend: want.cmTrend || (want.targetPrice * 1.15),
        ctMin: want.ctMin || want.targetPrice,
        ctTrend: want.ctTrend || (want.targetPrice * 1.15),
        ebMin: want.ebMin || want.targetPrice,
        ebTrend: want.ebTrend || (want.targetPrice * 1.15),
        baseCmMin: want.cmMin || want.targetPrice,
        baseCmTrend: want.cmTrend || (want.targetPrice * 1.15),
        baseCtMin: want.ctMin || want.targetPrice,
        baseCtTrend: want.ctTrend || (want.targetPrice * 1.15),
        baseEbMin: want.ebMin || want.targetPrice,
        baseEbTrend: want.ebTrend || (want.targetPrice * 1.15),
        trendStatus: "up",
        trendPct: 5.0,
        notes: want.notes ? `Acquistata da Wants (${want.notes})` : "Acquistata da Wants",
        updatedAt: new Date().toISOString()
      };

      cards.push(newCard);
      wants = wants.filter(w => w.id !== wantId);

      savePortfolioData();
      saveWantsData();
      await syncPortfolioWithDiskCsv(true);
      populateFilterDropdowns();
      populateWantsFilterDropdowns();
      render();

      showToast(`🎉 "${want.name}" aggiunta al Portfolio e al file CSV!`);
    }
  }

  // ==========================================
  // CSV EXPORT & IMPORT
  // ==========================================
  function exportToCsv() {
    const isWants = activeTab === "wants";

    if (isWants) {
      const headers = [
        "ID", "Nome Carta", "Espansione", "Codice Carta", "Rarità", "Edizione Desiderata",
        "Lingua", "Condizione Minima", "Prezzo Target (€)", "Cardmarket Min (€)", "Cardmarket Trend (€)",
        "CardTrader Min (€)", "CardTrader Trend (€)", "eBay Min (€)", "eBay Trend (€)",
        "Miglior Prezzo (€)", "Miglior Bacino", "Note d'Acquisto"
      ];

      const rows = wants.map((w, i) => {
        const best = getBestWantOffer(w);
        return [
          w.id || (i + 1),
          `"${(w.name || '').replace(/"/g, '""')}"`,
          `"${(w.expansion || '').replace(/"/g, '""')}"`,
          `"${(w.code || '').replace(/"/g, '""')}"`,
          `"${(w.rarity || '').replace(/"/g, '""')}"`,
          `"${(w.edition || '').replace(/"/g, '""')}"`,
          `"${(w.language || '').replace(/"/g, '""')}"`,
          `"${(w.targetCondition || '').replace(/"/g, '""')}"`,
          (w.targetPrice || 0).toFixed(2).replace('.', ','),
          (w.cmMin || 0).toFixed(2).replace('.', ','),
          (w.cmTrend || 0).toFixed(2).replace('.', ','),
          (w.ctMin || 0).toFixed(2).replace('.', ','),
          (w.ctTrend || 0).toFixed(2).replace('.', ','),
          (w.ebMin || 0).toFixed(2).replace('.', ','),
          (w.ebTrend || 0).toFixed(2).replace('.', ','),
          best.price.toFixed(2).replace('.', ','),
          best.source,
          `"${(w.notes || '').replace(/"/g, '""')}"`
        ].join(";");
      });

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
      downloadCsvFile(csvContent, `Lista_Wants_YuGiOh_${new Date().toISOString().slice(0, 10)}.csv`);
    } else {
      const headers = [
        "N°", "Nome Carta", "Espansione", "Codice Carta", "Rarità", "Edizione / Artwork",
        "Lingua", "Stato / Condizione", "Cardmarket Min (€)", "Cardmarket Trend (€)",
        "CardTrader Min (€)", "CardTrader Trend (€)", "Media Min (€)", "Media Trend (€)", "Note"
      ];

      let totalCmMin = 0, totalCmTrend = 0, totalCtMin = 0, totalCtTrend = 0, totalMedMin = 0, totalMedTrend = 0;

      const rows = cards.map((c, i) => {
        const cmMin = c.cmMin || 0;
        const cmTrend = c.cmTrend || 0;
        const ctMin = c.ctMin || 0;
        const ctTrend = c.ctTrend || 0;
        const medMin = (cmMin > 0 && ctMin > 0) ? (cmMin + ctMin) / 2 : (cmMin || ctMin);
        const medTrend = (cmTrend > 0 && ctTrend > 0) ? (cmTrend + ctTrend) / 2 : (cmTrend || ctTrend);

        totalCmMin += cmMin;
        totalCmTrend += cmTrend;
        totalCtMin += ctMin;
        totalCtTrend += ctTrend;
        totalMedMin += medMin;
        totalMedTrend += medTrend;

        return [
          c.num || (i + 1),
          c.name || "",
          c.expansion || "",
          c.code || "",
          c.rarity || "",
          c.edition || "",
          c.language || "",
          c.condition || "",
          cmMin.toFixed(2).replace('.', ','),
          cmTrend.toFixed(2).replace('.', ','),
          ctMin.toFixed(2).replace('.', ','),
          ctTrend.toFixed(2).replace('.', ','),
          medMin.toFixed(2).replace('.', ','),
          medTrend.toFixed(2).replace('.', ','),
          c.notes || ""
        ].join(";");
      });

      const totalRow = [
        "",
        `TOTALE LOTTO (${cards.length} Carte)`,
        "-", "-", "-", "-", "-",
        "Somma Carte",
        totalCmMin.toFixed(2).replace('.', ','),
        totalCmTrend.toFixed(2).replace('.', ','),
        totalCtMin.toFixed(2).replace('.', ','),
        totalCtTrend.toFixed(2).replace('.', ','),
        totalMedMin.toFixed(2).replace('.', ','),
        totalMedTrend.toFixed(2).replace('.', ','),
        "Totale valore lotto completo sincronizzato da CardVault TCG"
      ].join(";");

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows, "", totalRow].join("\r\n");
      downloadCsvFile(csvContent, `Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv`);
    }
  }

  function downloadCsvFile(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleImportCsv(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
      const text = evt.target.result;
      await parseAndLoadCsv(text);
      csvFileInput.value = "";
    };
    reader.readAsText(file, "UTF-8");
  }

  async function parseAndLoadCsv(text) {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        alert("Il file CSV selezionato è vuoto o non contiene dati validi.");
        return;
      }

      const separator = lines[0].includes(";") ? ";" : ",";
      const newCards = [];

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

          const card = {
            id: i,
            num: parseInt(tokens[0]) || i,
            name: tokens[1] || "Sconosciuta",
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
            notes: tokens[18] || tokens[14] || "",
            updatedAt: new Date().toISOString()
          };

          newCards.push(card);
        }
      }

      if (newCards.length > 0) {
        if (confirm(`Trovate ${newCards.length} carte nel CSV. Vuoi aggiornare il portfolio con queste carte?`)) {
          cards = newCards;
          savePortfolioData();
          await syncPortfolioWithDiskCsv(true);
          populateFilterDropdowns();
          render();
          showToast(`Portfolio aggiornato con ${cards.length} carte!`);
        }
      } else {
        alert("Non è stato possibile estrarre carte valide dal file CSV.");
      }
    } catch (err) {
      console.error("Errore importazione CSV:", err);
      alert("Errore durante la lettura del CSV: " + err.message);
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // 2FA AUTHENTICATION CLIENT LOGIC
  // ==========================================
  let currentSetupSecret = "";

  async function check2FAStatus() {
    try {
      const res = await fetch("/api/auth/status", { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();

      const authModal = document.getElementById("auth-modal");
      const authLoginCard = document.getElementById("auth-login-card");
      const authSetupCard = document.getElementById("auth-setup-card");
      if (!authModal) return;

      if (!data.isSetup) {
        // 2FA non ancora configurato -> Mostra la schermata per impostare PIN e associare Google Authenticator con QR Code
        authModal.style.display = "flex";
        authModal.setAttribute("aria-hidden", "false");
        if (authLoginCard) authLoginCard.style.display = "none";
        if (authSetupCard) authSetupCard.style.display = "block";
        await load2FASetupData();
      } else if (!data.isAuthenticated) {
        // 2FA configurato, autenticazione richiesta -> Mostra schermata di Login PIN + Codice Authenticator
        authModal.style.display = "flex";
        authModal.setAttribute("aria-hidden", "false");
        if (authLoginCard) authLoginCard.style.display = "block";
        if (authSetupCard) authSetupCard.style.display = "none";
        const pwdInput = document.getElementById("auth-input-password");
        if (pwdInput) setTimeout(() => pwdInput.focus(), 150);
      } else {
        // Autenticato!
        authModal.style.display = "none";
        authModal.setAttribute("aria-hidden", "true");
      }
    } catch (e) {
      console.log("Auth check skipped in offline mode");
    }
  }

  async function load2FASetupData() {
    try {
      const res = await fetch("/api/auth/setup-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        currentSetupSecret = data.secret;
        const qrImg = document.getElementById("auth-qr-image");
        const manualSecret = document.getElementById("auth-manual-secret");

        if (manualSecret) manualSecret.textContent = data.formattedSecret || data.secret;
        if (qrImg) {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.otpAuthUrl)}`;
        }
      }
    } catch (err) {
      console.error("Errore inizializzazione setup 2FA:", err);
    }
  }

  function init2FAEvents() {
    const authLoginForm = document.getElementById("auth-login-form");
    const authSetupForm = document.getElementById("auth-setup-form");
    const btnTogglePwd = document.getElementById("btn-toggle-pwd");
    const btnCopySecret = document.getElementById("btn-copy-secret");
    const btnLockSession = document.getElementById("btn-lock-session");
    const authErrorMsg = document.getElementById("auth-error-msg");
    const setupErrorMsg = document.getElementById("setup-error-msg");

    // Toggle Password Visibility
    if (btnTogglePwd) {
      btnTogglePwd.addEventListener("click", () => {
        const pwdInput = document.getElementById("auth-input-password");
        if (pwdInput.type === "password") {
          pwdInput.type = "text";
          btnTogglePwd.textContent = "🙈";
        } else {
          pwdInput.type = "password";
          btnTogglePwd.textContent = "👁️";
        }
      });
    }

    // Copy Manual Secret
    if (btnCopySecret) {
      btnCopySecret.addEventListener("click", () => {
        if (currentSetupSecret) {
          navigator.clipboard.writeText(currentSetupSecret);
          btnCopySecret.textContent = "Copiato!";
          setTimeout(() => btnCopySecret.textContent = "Copia", 2000);
        }
      });
    }

    // URL Parameter 1-Click Access Token Capture (e.g. ?token=... or ?key=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get("token") || urlParams.get("key") || urlParams.get("auth");
      if (tokenParam && tokenParam.trim()) {
        localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, tokenParam.trim());
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
        showToast("🔑 Access Token memorizzato sul dispositivo!");
      }
    } catch(e) {}

    // Login Form Submit (PIN + Authenticator OTP)
    if (authLoginForm) {
      authLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwd = document.getElementById("auth-input-password").value;
        const otpInput = document.getElementById("auth-input-otp");
        const rawOtp = otpInput ? otpInput.value : "";
        const otp = rawOtp.replace(/\s+/g, "");
        const rememberMeEl = document.getElementById("auth-remember-me");
        const rememberMe = rememberMeEl ? rememberMeEl.checked : true;
        const btnSubmit = document.getElementById("btn-submit-login");

        authErrorMsg.style.display = "none";
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Verifica in corso...";

        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pwd, otpCode: otp, rememberMe })
          });

          const data = await res.json();
          if (data.success && data.token) {
            localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, data.token);
            document.getElementById("auth-modal").style.display = "none";
            document.getElementById("auth-modal").setAttribute("aria-hidden", "true");
            showToast("🔓 Accesso 2FA effettuato con successo!");
            await checkServerConnection();
            await syncFromServer();
            render();
          } else {
            throw new Error(data.error || "PIN o Codice Authenticator non validi");
          }
        } catch (err) {
          authErrorMsg.textContent = err.message;
          authErrorMsg.style.display = "block";
          if (otpInput && otpInput.value) otpInput.value = "";
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = "<span>🔒 Sblocca CardVault</span>";
        }
      });
    }

    // Setup Form Submit
    if (authSetupForm) {
      authSetupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwd = document.getElementById("setup-input-password").value;
        const rawOtp = document.getElementById("setup-input-otp").value;
        const otp = rawOtp.replace(/\s+/g, "");
        const btnSubmit = document.getElementById("btn-submit-setup");

        setupErrorMsg.style.display = "none";
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Attivazione in corso...";

        try {
          const res = await fetch("/api/auth/setup-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pwd, secret: currentSetupSecret, otpCode: otp })
          });

          const data = await res.json();
          if (data.success && data.token) {
            localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, data.token);
            document.getElementById("auth-modal").style.display = "none";
            document.getElementById("auth-modal").setAttribute("aria-hidden", "true");
            showToast("🛡️ Protezione 2FA configurata ed attivata con successo!");
            await checkServerConnection();
            render();
          } else {
            throw new Error(data.error || "Codice OTP non valido");
          }
        } catch (err) {
          setupErrorMsg.textContent = err.message;
          setupErrorMsg.style.display = "block";
          document.getElementById("setup-input-otp").value = "";
          document.getElementById("setup-input-otp").focus();
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = "<span>Attiva Protezione 2FA</span>";
        }
      });
    }

    // Switch to Setup View
    const btnSwitchToSetup = document.getElementById("btn-switch-to-setup");
    if (btnSwitchToSetup) {
      btnSwitchToSetup.addEventListener("click", async () => {
        const authLoginCard = document.getElementById("auth-login-card");
        const authSetupCard = document.getElementById("auth-setup-card");
        authLoginCard.style.display = "none";
        authSetupCard.style.display = "block";
        await load2FASetupData();
      });
    }

    // Switch to Login View
    const btnSwitchToLogin = document.getElementById("btn-switch-to-login");
    if (btnSwitchToLogin) {
      btnSwitchToLogin.addEventListener("click", () => {
        const authLoginCard = document.getElementById("auth-login-card");
        const authSetupCard = document.getElementById("auth-setup-card");
        authSetupCard.style.display = "none";
        authLoginCard.style.display = "block";
        const pwdInput = document.getElementById("auth-input-password");
        if (pwdInput) setTimeout(() => pwdInput.focus(), 150);
      });
    }

    // Lock Session Button
    if (btnLockSession) {
      btnLockSession.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
        showToast("🔒 Sessione bloccata");
        check2FAStatus();
      });
    }
  }

  function initBrandFilterEvents() {
    const pills = document.querySelectorAll(".brand-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentBrandFilter = pill.getAttribute("data-brand") || "all";
        render();
      });
    });
  }

  function startApplication() {
    init();
    initBrandFilterEvents();
    init2FAEvents();
    check2FAStatus();
    checkJustTcgQuota();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication);
  } else {
    startApplication();
  }
})();
