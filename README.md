# 🃏 CardVault TCG - Yu-Gi-Oh! Portfolio & Market Monitor

Applicazione web professionale e dashboard finanziaria per il tracciamento, monitoraggio delle quotazioni in tempo reale e gestione della collezione di carte collezionabili **Yu-Gi-Oh!**.

---

## ✨ Funzionalità Principali

- ⚡ **CardTrader API v2 & Blueprints Certificati**: Integrazione ufficiale con le API di CardTrader tramite Blueprint ID univoci per prezzi minimi reali ed estrazione istantanea delle copie in vendita.
- 🃏 **YGOPRODeck HD Artworks & Metadati**: Download automatico degli artwork ufficiali in HD, tipo mostro, statistiche e testi completi degli effetti.
- 🌐 **Multi-Marketplace Sync**: Monitoraggio coordinato su **Cardmarket** (tramite JustTCG per superare blocchi Cloudflare), **CardTrader** ed **eBay.it**.
- 🖼️ **Collector Grid & Lightbox Ingrandito**: Visualizzazione a schede con effetto olografico (*foil*) e modale Lightbox per visualizzare la carta e la descrizione dell'effetto a schermo intero.
- 🎯 **Wants & Deal Finder**: Tracciamento delle carte desiderate con budget target e notifiche visive di convenienza.
- 🔒 **Sicurezza 2FA TOTP**: Protezione a due fattori con password cifrata (PBKDF2) e codici a 6 cifre compatibili con Google/Microsoft Authenticator.
- 💾 **Sincronizzazione CSV Locale**: Scrittura e lettura trasparente del file `Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv`.

---

## 🚀 Avvio Rapido

### In Locale (Windows)
1. Fai doppio clic su `CardVault_TCG.bat` (oppure esegui `npm start`).
2. Apri `http://localhost:3000` nel browser.

### Su Cloud / Render.com
1. Carica il repository su GitHub collegato al tuo account Render.
2. Render eseguirà il deploy automatico in modalità zero-config tramite `render.yaml`.

---

## 📑 Documentazione Completa & Roadmap

Per la guida dettagliata all'architettura, all'uso delle API e alla **Roadmap di sviluppo (inclusa la revisione della logica di inserimento nuove carte)**, consulta:
👉 **[DOCUMENTAZIONE_E_GUIDA.md](DOCUMENTAZIONE_E_GUIDA.md)**
