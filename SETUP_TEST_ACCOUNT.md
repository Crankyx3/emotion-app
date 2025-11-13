# Test-Account Einrichtung für Google Play / Test Account Setup for Google Play

## Schritt-für-Schritt Anleitung / Step-by-Step Guide

### 1. Firebase Test-Account erstellen / Create Firebase Test Account

**Option A: Über die App (empfohlen) / Via App (recommended)**

1. App im Debug-Modus auf einem Gerät starten
2. "Registrieren" / "Sign Up" auswählen
3. Folgende Daten eingeben:
   - E-Mail: `googleplay.reviewer@emotion-app.test`
   - Passwort: `ReviewTest2025!`
4. Account erstellen

**Option B: Über Firebase Console**

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Projekt auswählen: `emotionapp-35448`
3. Navigiere zu "Authentication" → "Users"
4. Klicke "Add user"
5. Eingeben:
   - Email: `googleplay.reviewer@emotion-app.test`
   - Password: `ReviewTest2025!`
6. Speichern

---

### 2. Test-Daten hinzufügen / Add Test Data

Nach der Account-Erstellung sollten Sie Beispieldaten hinzufügen, damit Prüfer die App vollständig testen können:

After creating the account, add sample data so reviewers can fully test the app:

```bash
# In der App als Test-User anmelden und:
# Login to the app as test user and:

1. Füge 5-10 Stimmungseinträge über mehrere Tage hinzu
   Add 5-10 mood entries across several days

2. Teste die KI-Analyse Funktion
   Test the AI analysis feature

3. Erstelle einige Notizen
   Create some notes

4. Überprüfe dass alle Features funktionieren
   Verify all features work
```

---

### 3. Google Play Console: Anmeldedaten hinzufügen / Google Play Console: Add Credentials

1. Gehe zu [Google Play Console](https://play.google.com/console/)
2. Wähle deine App aus
3. Navigiere zu: **"App-Inhalte"** → **"App-Zugriff"**
4. Wähle: **"Alle Funktionen sind ohne spezielle Zugangsdaten verfügbar"** ODER **"Alle oder einige Funktionen sind eingeschränkt"**
5. Falls eingeschränkt, füge folgendes hinzu:

**Anmeldedaten für Prüfer / Credentials for Reviewers:**

```
Benutzername / Username: googleplay.reviewer@emotion-app.test
Passwort / Password: ReviewTest2025!

Anleitung:
1. App öffnen
2. "Anmelden" auswählen
3. Oben genannte Zugangsdaten eingeben
4. Der Account hat Zugriff auf alle Features einschließlich Premium-Funktionen

Instructions:
1. Open app
2. Select "Sign In"
3. Enter credentials above
4. Account has access to all features including premium functions
```

6. Speichern und zur Überprüfung einreichen

---

### 4. Wichtige Überprüfungen vor Einreichung / Important Checks Before Submission

- [ ] Test-Account funktioniert in der App
      Test account works in the app

- [ ] Test-Account hat Beispieldaten
      Test account has sample data

- [ ] Alle Features sind zugänglich
      All features are accessible

- [ ] Premium-Features funktionieren (RevenueCat Test-Mode)
      Premium features work (RevenueCat Test Mode)

- [ ] Anmeldedaten sind in Google Play Console eingetragen
      Credentials are entered in Google Play Console

- [ ] Privacy Policy und Terms sind aktuell
      Privacy Policy and Terms are current

---

### 5. Alternative: Gast-Modus / Alternative: Guest Mode

Falls Google Play den Gast-Modus akzeptiert, kannst du auch angeben:

If Google Play accepts Guest Mode, you can also specify:

```
Die App kann ohne Anmeldung im Gast-Modus getestet werden.
Einfach die App öffnen und "Als Gast fortfahren" auswählen.

The app can be tested in Guest Mode without login.
Simply open the app and select "Continue as Guest".
```

⚠️ **Hinweis:** Gast-Modus hat eingeschränkte Features. Empfehlung ist ein vollständiger Test-Account.

⚠️ **Note:** Guest Mode has limited features. Recommendation is a full test account.

---

### 6. Support und Kontakt / Support and Contact

Falls die Prüfer Probleme haben:

If reviewers have issues:

**Kontakt-Email für Support:** finn_bauermeister@web.de

**Antwortzeit / Response Time:** Innerhalb von 24 Stunden / Within 24 hours

---

## Troubleshooting

### Problem: Account kann sich nicht anmelden / Cannot login

**Lösung / Solution:**
1. Überprüfe Firebase Authentication ist aktiviert
   Check Firebase Authentication is enabled
2. Überprüfe E-Mail/Passwort Provider ist aktiviert
   Check Email/Password provider is enabled
3. Teste Account in Firebase Console
   Test account in Firebase Console

### Problem: Premium Features funktionieren nicht / Premium features don't work

**Lösung / Solution:**
1. Überprüfe RevenueCat Test-API Key ist konfiguriert
   Check RevenueCat Test API Key is configured
2. File: `/android/app/src/main/java/com/emotionapp/MainApplication.kt`
3. Test Key sollte sein: `test_IjrjYiLROwkENkSZeERxRZMTJwW`
   Test Key should be: `test_IjrjYiLROwkENkSZeERxRZMTJwW`

### Problem: Firebase Fehler / Firebase errors

**Lösung / Solution:**
1. Stelle sicher Firebase Config ist korrekt
   Ensure Firebase config is correct
2. Überprüfe `firebaseconfig.js`
   Check `firebaseconfig.js`
3. API Key: `AIzaSyD6_uq0RO7CPlTbZ-WbOM012rspn3awmxU`

---

**Erstellt am / Created:** 2025-01-13
**Für / For:** Google Play Store App Review
