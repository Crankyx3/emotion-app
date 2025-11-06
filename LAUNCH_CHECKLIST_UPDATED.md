# 🚀 LAUNCH CHECKLIST - KI-Stimmungshelfer (AKTUALISIERT)

Basierend auf dem aktuellen Stand nach RevenueCat-Integration.

---

## ✅ BEREITS ERLEDIGT

- ✅ RevenueCat SDK installiert & implementiert
- ✅ Paywall Screen komplett fertig
- ✅ Trial-System (5 Tage, device-based)
- ✅ EAS Build Pipeline funktioniert
- ✅ Android-Konfiguration (Kotlin 1.9.25, Expo Prebuild)
- ✅ Datenschutzerklärung vorhanden
- ✅ Premium-Features implementiert
- ✅ Firestore Security Rules erstellt (`firestore.rules`)

---

## 🔴 PHASE 1: KRITISCH (Muss vor Launch)

### 1. ⚠️ Firestore Security Rules deployen (15 Min) - HÖCHSTE PRIORITÄT!

**Status:** Rules erstellt ✅, muss deployed werden ❌

**Schritte:**
1. Gehe zu: https://console.firebase.google.com/
2. Projekt: `emotionapp-35448` → Firestore Database → Rules
3. Kopiere Inhalt von `firestore.rules`
4. Klicke "Publish"

**Anleitung:** `FIREBASE_SECURITY_SETUP.md`

**Risiko wenn nicht gemacht:** 🔥 Deine Datenbank ist öffentlich lesbar/schreibbar!

---

### 2. 🔑 RevenueCat Setup (2-3 Stunden)

**Status:** SDK integriert ✅, Setup pending ❌

**Schritte:**
1. RevenueCat Account erstellen
2. Google Play Console verbinden (Service Account JSON)
3. Products erstellen:
   - `premium_monthly` (8,99€/Monat)
   - `premium_yearly` (91,70€/Jahr)
4. Entitlement erstellen: `premium`
5. Offering erstellen: `default`
6. API Key in `revenuecat.config.js` eintragen

**Anleitung:** `REVENUECAT_SETUP.md`

**Kann später gemacht werden wenn:** Du erst Beta-Testen willst ohne Payments

---

### 3. 🤖 OpenAI API Key absichern (Optional aber empfohlen, 2-3 Stunden)

**Status:** Key liegt in `.env` ⚠️

**Problem:** API Key kann aus APK extrahiert werden → Missbrauch möglich

**Lösung A: Schnell (für Launch):**
- OpenAI Usage Limits setzen
- Alerts bei ungewöhnlichem Traffic
- Monitoring aktivieren

**Lösung B: Professionell (für Production):**
- Firebase Cloud Function erstellen
- OpenAI Calls über Backend
- Rate Limiting pro User

**Empfehlung:** Lösung A für jetzt, Lösung B nach Launch

---

### 4. 📄 Legal Texte vervollständigen (1-2 Stunden)

**Status:**
- ✅ Datenschutzerklärung vorhanden
- ❌ Impressum fehlt (Pflicht in Deutschland!)
- ❌ AGB fehlen
- ❌ Widerrufsbelehrung fehlt

**Schnell-Lösung:**
- Generator nutzen: https://www.e-recht24.de/
- Impressum & AGB generieren (kostenlos)
- In App einbauen (z.B. unter Settings)

**Hinweis:** Für RevenueCat-Subscriptions brauchst du AGB + Widerrufsbelehrung!

---

### 5. 📱 Google Play Console Setup (3-5 Stunden)

**Status:** Nicht gestartet ❌

**Schritte:**
1. Google Play Developer Account ($25 einmalig)
2. App erstellen
3. Store Listing:
   - **Titel:** KI-Stimmungshelfer
   - **Kurzbeschreibung** (80 Zeichen)
   - **Lange Beschreibung** (4000 Zeichen)
   - **Screenshots** (min. 2, empfohlen 8)
   - **Feature Graphic** (1024x500px)
   - **App Icon** (512x512px)
4. Kategorien: Health & Fitness / Medical
5. Content Rating Fragebogen ausfüllen
6. Datenschutzerklärung-Link angeben
7. APK/AAB hochladen

**Tipp:** Screenshots kannst du mit Expo Go auf iPhone machen!

---

### 6. 🎨 Paywall Features bereinigen (10 Min) - WICHTIG!

**Problem:** Paywall zeigt Features die nicht implementiert sind:
- "Export-Funktion (PDF/CSV)"
- "Cloud-Backup"

**Lösung A: Schnell (10 Min)**
```javascript
// In PaywallScreen.js, Features-Array anpassen:
const features = [
  // ... andere Features
  { icon: 'download', text: 'Export-Funktion', color: Colors.success }, // "PDF/CSV" entfernen
  { icon: 'cloud-done', text: 'Cloud-Synchronisation', color: Colors.info }, // Statt "Backup"
];
```

**Lösung B: Features implementieren (2-4 Stunden)**
- CSV Export relativ einfach
- PDF Export aufwändiger
- Cloud-Backup = Firestore (läuft schon!)

**Empfehlung:** Lösung A für jetzt, Features später hinzufügen

---

### 7. ✅ Finale Code-Checks (30 Min)

**Durchgehen:**
- [ ] Keine `console.log()` mit sensiblen Daten
- [ ] Alle API Keys in `.env` (nicht im Code)
- [ ] Error Handling überall vorhanden
- [ ] Loading States überall gesetzt
- [ ] Keine TODO-Kommentare mehr im Code

---

### 8. 🏗️ Production Build erstellen (1 Stunde)

```powershell
# Production Build
npx eas-cli build --profile production --platform android

# Download AAB
# Test auf echtem Gerät (von Freund/Familie)
```

**Was wird erstellt:**
- AAB-Datei für Google Play Store
- Signiert mit Production-Key
- Optimiert & minimiert

---

## 🟡 PHASE 2: WICHTIG (Sollte vor Launch)

### 9. 🧪 Beta Testing (1-2 Wochen)

**Schritte:**
1. Internal Testing Track in Google Play Console
2. 5-10 Tester einladen (Freunde, Familie, Kollegen)
3. Test-Checklist erstellen:
   - [ ] Registrierung funktioniert
   - [ ] Tageseintrag erstellen
   - [ ] KI-Analyse funktioniert
   - [ ] Paywall wird angezeigt
   - [ ] Trial-System funktioniert
   - [ ] (Testmodus) Kauf durchführen
   - [ ] Premium-Features werden freigeschaltet
   - [ ] Käufe wiederherstellen funktioniert
4. Feedback sammeln
5. Kritische Bugs fixen

**Minimum:** 1 Woche Closed Testing empfohlen

---

### 10. 📊 Analytics einrichten (1-2 Stunden)

**Firebase Analytics:**
```javascript
import analytics from '@react-native-firebase/analytics';

// Wichtige Events tracken:
await analytics().logEvent('trial_started');
await analytics().logEvent('paywall_viewed');
await analytics().logEvent('purchase_initiated', { plan: 'yearly' });
await analytics().logEvent('purchase_completed');
await analytics().logEvent('premium_feature_used', { feature: 'chat' });
```

**Vorteile:**
- Conversion-Rate messen
- Wo brechen User ab?
- Welche Features werden genutzt?

---

### 11. 💥 Crash Reporting (1 Stunde)

**Firebase Crashlytics oder Sentry:**
```powershell
# Sentry installieren
npm install @sentry/react-native

# Initialisieren
npx sentry-wizard -i reactNative -p ios android
```

**Wichtig für:**
- Produktions-Crashes finden
- User-Feedback bei Problemen
- App-Stabilität monitoren

---

## 🟢 PHASE 3: NICE-TO-HAVE (Kann nach Launch)

### 12. 🔔 Push Notifications (2-3 Stunden)

**Use Cases:**
- Tägliche Erinnerung: "Wie geht es dir heute?"
- Wöchentliche Analyse verfügbar
- Premium-Trial läuft bald ab

**Firebase Cloud Messaging:**
- Relativ einfach zu implementieren
- Gute User-Retention

---

### 13. ⚡ Performance Optimierung (2-4 Stunden)

**Später optimieren:**
- Lazy Loading für lange Listen
- Image Caching
- Bundle Size reduzieren
- Startup Time verbessern

---

### 14. 🎛️ Admin Dashboard (Optional, 1-2 Tage)

**Was es kann:**
- User-Übersicht
- Subscription Analytics
- Support-Anfragen bearbeiten

**Tools:**
- Firebase Console reicht meist
- Oder: Custom Web-Dashboard mit Next.js

---

## ⏱️ AKTUALISIERTER ZEITAUFWAND

### Minimum Launch (nur Kritisches):

**Ohne Payments (nur Trial & Simulation):**
- Firestore Rules: 15 Min ⚠️
- Legal Texte: 1-2h
- Store Listing: 3-5h
- Code Cleanup: 30 Min
- Build & Upload: 1h
- **Total: ~6-9 Stunden** + Beta-Testing (1 Woche)

**Mit echten Payments:**
- + RevenueCat Setup: 2-3h
- + Payment Testing: 1h
- **Total: ~9-13 Stunden** + Beta-Testing (1-2 Wochen)

### Empfohlen (Kritisch + Wichtig):
- **Total: 15-20 Stunden** + Beta-Testing (2 Wochen)

---

## 🎯 MEINE EMPFEHLUNG: Reihenfolge

### Heute/Diese Woche:

1. ⚠️ **SOFORT: Firestore Rules deployen** (15 Min)
2. Legal Texte vervollständigen (1-2h)
3. Paywall Features bereinigen (10 Min)
4. Code Cleanup (30 Min)

### Nächste Woche:

5. Google Play Developer Account ($25)
6. Store Listing vorbereiten (Screenshots, Texte)
7. RevenueCat Setup (falls Payments gewünscht)
8. Beta-Build erstellen & hochladen

### Woche 3+:

9. Closed Testing mit 5-10 Testern
10. Feedback einarbeiten
11. Production Release! 🚀

---

## ✅ Quick Wins für heute:

**In 1 Stunde kannst du erledigen:**
1. ✅ Firestore Rules deployen (15 Min)
2. ✅ Paywall Features anpassen (10 Min)
3. ✅ Code Cleanup (console.logs entfernen) (20 Min)
4. ✅ Impressum-Generator nutzen (15 Min)

**Danach ist die App deutlich sicherer!** 🛡️

---

## 📞 Hilfe benötigt?

Ich kann dir helfen mit:
- [ ] Firestore Rules deployment
- [ ] RevenueCat Setup Schritt-für-Schritt
- [ ] Store Description schreiben
- [ ] Screenshots schön machen
- [ ] Code-Reviews
- [ ] Beta-Testing Checkliste

**Was möchtest du als nächstes angehen?**

