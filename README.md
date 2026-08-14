# 🃏 CardVault TCG - Yu-Gi-Oh! Portfolio & Wants Tracker

Applicazione web professionale per il monitoraggio, calcolo del valore e tracciamento in tempo reale di carte collezionabili **Yu-Gi-Oh!** con integrazione ufficiale **CardTrader API v2**, **Cardmarket** ed **eBay**.

---

## ⚡ Caratteristiche Principali

- **Live Market Sync**: Sincronizzazione automatica e autenticata con le API v2 di CardTrader per estrarre in tempo reale prezzi minimi, trend di vendita e numero di inserzioni attive.
- **Micro-Trend Multi-Piattaforma**: Indicatori visuali di tendenza (`↗` Rialzo, `↘` Calo, `↔` Stabile) calcolati singolarmente per ogni mercato (Cardmarket, CardTrader, eBay).
- **Gestione Portfolio & Wants**: Monitoraggio delle carte possedute e gestione della Wishlist con calcolo automatico della convenienza d'acquisto (*Affari sotto il target budget*).
- **Ricerche Localizzate in Italiano (`/it/`)**: Collegamenti rapidi a Cardmarket IT, CardTrader IT ed eBay.it per nome carta, codice set e nome inglese.
- **Sincronizzazione Bidirezionale CSV**: Salvataggio automatico continuo e supporto per import/export del file `Listino_Prezzi_Yugioh_Cardmarket_CardTrader.csv`.

---

## 🚀 Avvio Locale

```bash
# Avvia il server locale
npm start
```

Apri nel browser: `http://localhost:3000`

---

## ☁️ Deploy su Render.com

1. Crea un nuovo repository su GitHub e carica questi file.
2. Vai su [render.com](https://render.com) e accedi con GitHub.
3. Seleziona **New + > Web Service** e scegli questo repository.
4. Render rileverà automaticamente `package.json` ed eseguirà il deploy in 1 minuto.
