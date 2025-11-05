# RevenueCat Integration - Setup Guide

Diese App nutzt **RevenueCat** für In-App-Käufe und Subscriptions.

## 📋 Was ist bereits implementiert?

✅ **RevenueCat SDK** ist installiert (`react-native-purchases`)
✅ **Paywall Screen** ist fertig designt
✅ **Premium Provider** mit Trial-System (5 Tage)
✅ **Purchase Flow** komplett implementiert
✅ **Restore Purchases** Funktion

## 🚀 Setup-Schritte

### 1. RevenueCat Account erstellen

1. Gehe zu: **https://app.revenuecat.com/**
2. Erstelle einen kostenlosen Account
3. Klicke auf **"Create new project"**
   - Project name: `KI-Stimmungshelfer`

### 2. Android App hinzufügen

1. Im Dashboard: **"Apps" → "Add new"**
2. Wähle **Android (Google Play)**
3. Trage ein:
   - **App name:** `KI-Stimmungshelfer`
   - **Bundle ID:** `com.ki.stimmungshelfer` ⚠️ (muss exakt passen!)
   - **Store:** `Google Play Store`

### 3. Google Play Console verbinden

#### A) Service Account erstellen

1. Gehe zu **Google Play Console**: https://play.google.com/console
2. Wähle deine App (oder erstelle sie)
3. Navigiere zu: **Setup → API access**
4. Klicke **"Create new service account"**
5. Folge dem Link zur **Google Cloud Console**
6. Erstelle einen Service Account:
   - Name: `revenuecat-api`
   - Role: **Keine Rolle** (RevenueCat braucht nur Billing-Zugriff)
7. Klicke auf den Service Account → **Keys** → **Add Key** → **Create new key**
8. Wähle **JSON** und lade die Datei herunter

#### B) Service Account mit RevenueCat verbinden

1. Zurück in **Google Play Console** → **API access**
2. Finde deinen Service Account in der Liste
3. Klicke **"Grant access"** und setze folgende Rechte:
   - ✅ **View financial data**
   - ✅ **Manage orders and subscriptions**
4. Speichern

5. In **RevenueCat**:
   - Gehe zu deiner App → **Service Credentials**
   - Klicke **"Upload service account credentials"**
   - Lade die JSON-Datei hoch

### 4. In-App-Produkte erstellen

#### A) In Google Play Console

1. Navigiere zu: **Monetization → Products → In-app products**
2. Klicke **"Create product"**

**Monatliches Abo:**
- **Product ID:** `premium_monthly`
- **Name:** Premium Monatlich
- **Description:** Voller Zugriff auf alle Premium-Features
- **Preis:** 8,99 €
- **Subscription period:** 1 Monat
- Status: **Active**

**Jährliches Abo:**
- **Product ID:** `premium_yearly`
- **Name:** Premium Jährlich
- **Description:** Voller Zugriff auf alle Premium-Features (spare 15%)
- **Preis:** 91,70 € (entspricht 7,64 €/Monat)
- **Subscription period:** 1 Jahr
- Status: **Active**

#### B) In RevenueCat importieren

1. Gehe zu **Products** in RevenueCat
2. Klicke **"Import from app stores"**
3. RevenueCat synchronisiert automatisch deine Produkte

### 5. Entitlement erstellen

1. Gehe zu **Entitlements** in RevenueCat
2. Klicke **"Create new entitlement"**
3. Trage ein:
   - **Identifier:** `premium`
   - **Name:** Premium Access
4. Speichern

### 6. Offering erstellen

1. Gehe zu **Offerings** in RevenueCat
2. Klicke **"Create new offering"**
3. Trage ein:
   - **Identifier:** `default`
   - **Name:** Default Offering
4. Füge Packages hinzu:
   - **Monthly:** `premium_monthly` → Entitlement: `premium`
   - **Annual:** `premium_yearly` → Entitlement: `premium`
5. Setze als **"Current offering"**

### 7. API Key in App eintragen

1. Gehe zu **Project Settings → API Keys** in RevenueCat
2. Kopiere den **"Google Play Public API Key"** (NICHT Secret Key!)
3. Öffne `revenuecat.config.js` in deinem Projekt
4. Ersetze `YOUR_ANDROID_API_KEY_HERE` mit deinem API Key:

```javascript
const REVENUECAT_CONFIG = {
  androidApiKey: 'goog_xxxxxxxxxxxxxxxxxxxx', // Dein echter Key
  // ...
};
```

## ✅ Fertig!

Die App ist jetzt bereit für echte In-App-Käufe!

## 🧪 Testen

### Test-Modus aktivieren (Google Play Console)

1. **License Testing** aktivieren:
   - Google Play Console → **Setup → License testing**
   - Füge deine Test-Email hinzu
   - Wähle **"Allow test purchases with no charge"**

2. **Internal Testing Track** nutzen:
   - Erstelle einen Internal Testing Track
   - Lade Tester ein
   - Teste Käufe ohne echte Zahlung

### In der App testen

1. Baue die App: `eas build --platform android --profile production`
2. Installiere auf einem Test-Gerät
3. Gehe zum Paywall Screen
4. Teste den Kauf-Flow

**Console-Logs beachten:**
- ✅ `RevenueCat initialisiert` = Alles gut
- ⚠️ `RevenueCat API Key nicht konfiguriert` = API Key fehlt
- 🛒 `Kaufe Package: ...` = Purchase-Flow gestartet

## 🔧 Fallback-Modus

Die App funktioniert auch **ohne** RevenueCat-Konfiguration:
- Käufe werden simuliert (nur AsyncStorage)
- Trial-System bleibt aktiv
- Premium-Status wird lokal gespeichert

Das ist nützlich für lokale Entwicklung!

## 📱 Features

✅ **5-Tage Trial** (device-gebunden)
✅ **Monatliche & Jährliche Abos**
✅ **Käufe wiederherstellen**
✅ **Premium-Status automatisch synchronisiert**
✅ **Offline-Support** (AsyncStorage Backup)

## 🆘 Troubleshooting

### "Keine Packages verfügbar"
→ Prüfe ob Products in RevenueCat importiert wurden
→ Prüfe ob Offering als "Current" markiert ist

### "Service Account Fehler"
→ Stelle sicher, dass der Service Account die richtigen Rechte hat
→ Prüfe ob die JSON-Datei korrekt hochgeladen wurde

### "Purchase schlägt fehl"
→ Prüfe ob die Product IDs übereinstimmen
→ Stelle sicher, dass du einen Test-Account verwendest
→ Prüfe die Console-Logs für Details

## 📚 Weitere Infos

- **RevenueCat Docs:** https://docs.revenuecat.com/
- **React Native Integration:** https://docs.revenuecat.com/docs/reactnative
- **Google Play Billing:** https://developer.android.com/google/play/billing

---

**Viel Erfolg! 🚀**

Bei Fragen schau in die Logs oder kontaktiere den Support.
