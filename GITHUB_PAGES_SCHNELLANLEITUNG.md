# ⚡ GitHub Pages - 15 Minuten Schnellanleitung

## 🎯 Ziel
Eine kostenlose, professionelle Website für deinen Organisations-Account erstellen.

**URL:** https://appbycrank.github.io (oder dein GitHub-Name)

**Zeit:** 15 Minuten
**Kosten:** 0€

---

## 📝 SCHRITT 1: GitHub Repository erstellen (5 Min)

### 1.1 GitHub öffnen
```
→ Gehe zu: https://github.com
→ Anmelden (oder Account erstellen falls nötig - kostenlos)
```

### 1.2 Neues Repository
```
→ Klicke: grüner Button "New" oder "New repository"
```

### 1.3 Repository konfigurieren
```
Repository name*: appbycrank.github.io
(WICHTIG: Muss ".github.io" enden!)

Description: AppByCrank - IT-Dienstleistungen

☑️ Public (nicht Private!)
☑️ Add a README file

→ Klicke: "Create repository" (grüner Button unten)
```

**✅ Repository erstellt!**

---

## 📄 SCHRITT 2: Website-Datei erstellen (5 Min)

### 2.1 Neue Datei erstellen
```
→ Im Repository: Klicke "Add file" → "Create new file"
```

### 2.2 Dateiname eingeben
```
→ Oben bei "Name your file": index.html
```

### 2.3 Website-Code einfügen

Kopiere den folgenden Code und füge ihn in das große Textfeld ein:

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AppByCrank - IT-Dienstleistungen</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        .contact-box {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        ul {
            list-style-type: none;
            padding-left: 0;
        }
        ul li:before {
            content: "✓ ";
            color: #27ae60;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AppByCrank</h1>
        <p><strong>IT-Dienstleistungen & Mobile App Entwicklung</strong></p>

        <h2>Über uns</h2>
        <p>
            Wir sind spezialisiert auf die Entwicklung innovativer Mobile Apps
            für iOS und Android. Mit modernsten Technologien und kreativen
            Lösungen bringen wir Ihre Ideen auf das Smartphone.
        </p>

        <h2>Unsere Leistungen</h2>
        <ul>
            <li>Mobile App Entwicklung (iOS & Android)</li>
            <li>Cross-Platform Development mit React Native & Expo</li>
            <li>Backend-Entwicklung & API-Integration</li>
            <li>KI-Integration (OpenAI, ChatGPT)</li>
            <li>Cloud-Lösungen (Firebase, AWS)</li>
            <li>App-Design & UI/UX</li>
        </ul>

        <h2>Aktuelle Projekte</h2>
        <p>
            <strong>KI-Stimmungshelfer</strong><br>
            Eine innovative Wellness-App für Mood-Tracking und emotionales
            Wohlbefinden. Mit KI-gestützter Analyse und personalisierten
            Empfehlungen hilft die App Nutzern, ihre Stimmung besser zu
            verstehen und zu verbessern.
        </p>

        <div class="contact-box">
            <h2>Kontakt</h2>
            <p>
                <strong>E-Mail:</strong> finn_bauermeister@web.de<br>
                <strong>Verfügbarkeit:</strong> Mo-Fr, 9-18 Uhr
            </p>

            <h3 style="margin-top: 30px;">Impressum</h3>
            <p>
                <strong>AppByCrank</strong><br>
                Inhaber: Finn Bauermeister<br>
                [Deine Straße und Hausnummer]<br>
                [Deine PLZ und Stadt]<br>
                Deutschland<br>
                <br>
                E-Mail: finn_bauermeister@web.de<br>
                <br>
                Kleinunternehmer gemäß § 19 UStG<br>
                Umsatzsteuer-ID: [Falls vorhanden]
            </p>
        </div>

        <p style="text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 14px;">
            © 2025 AppByCrank. Alle Rechte vorbehalten.
        </p>
    </div>
</body>
</html>
```

**⚠️ WICHTIG: Passe das Impressum an!**
```
Ersetze:
[Deine Straße und Hausnummer] → z.B. Musterstraße 123
[Deine PLZ und Stadt] → z.B. 12345 Berlin
[Falls vorhanden] → Deine USt-ID oder lösche die Zeile
```

### 2.4 Datei speichern
```
→ Scrolle nach unten zu "Commit changes"
→ Commit message: "Add website"
→ Klicke: "Commit changes" (grüner Button)
```

**✅ Website-Datei erstellt!**

---

## 🚀 SCHRITT 3: GitHub Pages aktivieren (3 Min)

### 3.1 Settings öffnen
```
→ Im Repository oben: Klicke "Settings" (⚙️)
```

### 3.2 Pages öffnen
```
→ Links im Menü: Scrolle runter zu "Pages"
→ Klicke auf "Pages"
```

### 3.3 Pages konfigurieren
```
Build and deployment:
Source: Deploy from a branch

Branch:
→ Dropdown: "main" auswählen (nicht "None")
→ Folder: "/ (root)" auswählen
→ Klicke: "Save"
```

### 3.4 Warten
```
→ GitHub zeigt: "Your site is ready to be published at..."
→ Warte 1-2 Minuten
→ Seite aktualisieren (F5)
→ Link sollte jetzt grün sein
```

**✅ GitHub Pages aktiviert!**

---

## 🌐 SCHRITT 4: Website testen (2 Min)

### 4.1 URL öffnen
```
→ Deine URL: https://appbycrank.github.io
   (oder: https://[dein-github-name].github.io)

→ Öffne in neuem Browser-Tab
```

### 4.2 Prüfen
```
✅ Website lädt?
✅ Text sichtbar?
✅ Impressum korrekt?
✅ E-Mail richtig?

Alles gut? → Weiter zu Schritt 5!
Etwas falsch? → Datei in GitHub bearbeiten:
   - Gehe zu Repository
   - Klicke auf "index.html"
   - Klicke Stift-Icon (Edit)
   - Ändere Text
   - "Commit changes"
   - Warte 1 Min, dann neuladen
```

**✅ Website funktioniert!**

---

## ✅ FERTIG! Was jetzt?

### Deine Website:
```
URL: https://appbycrank.github.io

→ Notiere diese URL
→ Nutze sie für Google Play Console
```

### Nächste Schritte:

**1. Google Play Console öffnen**
```
→ play.google.com/console
→ Einstellungen → Kontodetails
→ "Als Organisation registrieren"
```

**2. Website eintragen**
```
→ Bei "Website": https://appbycrank.github.io
→ Google zeigt Verifizierungs-Optionen
```

**3. Website verifizieren**
```
Google gibt dir eine von zwei Optionen:

OPTION A: Meta-Tag (EINFACHER!)
→ Code wie: <meta name="google-site-verification" content="ABC123">
→ Füge in index.html ein (im <head> Bereich, nach <meta charset>)
→ In GitHub: index.html bearbeiten → Tag einfügen → Commit
→ Warte 1-2 Min
→ In Google Console: "Verify" klicken
→ ✅ Fertig!

OPTION B: HTML-Datei
→ Google gibt dir Datei (z.B. google123abc.html)
→ In GitHub: "Add file" → "Create new file"
→ Dateiname: google123abc.html (exakt wie von Google)
→ Inhalt: Code von Google
→ Commit
→ Warte 1 Min
→ In Google Console: "Verify" klicken
→ ✅ Fertig!
```

**4. Organisation Account abschließen**
```
→ Alle Felder ausfüllen (Gewerbedaten)
→ $25 zahlen
→ Absenden
→ Fertig! ✅
```

---

## 🔄 Falls etwas nicht funktioniert

### Problem: "404 - There isn't a GitHub Pages site here"
**Lösung:**
```
1. Prüfe: Repository Name endet mit ".github.io"?
2. Prüfe: Repository ist Public (nicht Private)?
3. Prüfe: Datei heißt genau "index.html"?
4. Warte 5 Minuten und versuche nochmal
5. Settings → Pages → Check ob "main" ausgewählt ist
```

### Problem: Website zeigt nur Code/Text
**Lösung:**
```
1. Prüfe: Datei heißt "index.html" (nicht index.txt)
2. Prüfe: HTML-Code wurde vollständig kopiert
3. In GitHub: index.html öffnen → sollte bunt sein (Syntax Highlighting)
4. Falls grau/schwarz: Lösche Datei und erstelle neu
```

### Problem: Impressum falsch
**Lösung:**
```
1. In GitHub: Klicke auf "index.html"
2. Klicke Stift-Icon (Edit this file)
3. Suche Impressum-Bereich
4. Ändere Text
5. Scrolle runter → "Commit changes"
6. Warte 1-2 Min, dann Seite neu laden
```

---

## 📱 Website später bearbeiten

### Änderungen machen:
```
1. Gehe zu: github.com/deinname/appbycrank.github.io
2. Klicke: "index.html"
3. Klicke: Stift-Icon (✏️ Edit)
4. Mache Änderungen
5. Scrolle runter → "Commit changes"
6. Warte 1-2 Minuten
7. Website neu laden → Änderungen sichtbar!
```

### Google Verification Tag hinzufügen:
```
1. Kopiere Tag von Google Console
2. In index.html: Finde <head> Bereich
3. Füge Tag ein nach <meta charset="UTF-8">:

<head>
    <meta charset="UTF-8">
    <meta name="google-site-verification" content="ABC123..." />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ...

4. Commit changes
5. Warte 1-2 Min
6. In Google Console: Verify klicken
```

---

## ✅ Checkliste

- [ ] GitHub Account erstellt/angemeldet
- [ ] Repository erstellt: appbycrank.github.io
- [ ] index.html erstellt
- [ ] HTML-Code eingefügt
- [ ] Impressum mit meinen Daten ausgefüllt
- [ ] Commit gespeichert
- [ ] Settings → Pages aufgerufen
- [ ] Branch "main" ausgewählt
- [ ] Save geklickt
- [ ] 2 Minuten gewartet
- [ ] Website im Browser getestet: https://appbycrank.github.io
- [ ] Alles funktioniert ✅
- [ ] URL notiert für Google Play Console

---

## 🎉 Geschafft!

**Deine Website:**
```
https://appbycrank.github.io
```

**Was du jetzt hast:**
- ✅ Professionelle Website (kostenlos!)
- ✅ URL für Organisations-Account
- ✅ Verifizierbare Website
- ✅ Impressum (rechtlich korrekt)
- ✅ Kann jederzeit bearbeitet werden

**Weiter geht's mit:**
```
→ SCHNELLSTART_KLEINGEWERBE.md
   (Für Organisation Account Registrierung)
```

---

**Gut gemacht! 💪 Jetzt hast du alle Voraussetzungen für den Organisations-Account!**

**Erstellt:** 2025-01-13
**Zeitaufwand:** 15-20 Minuten
**Kosten:** 0€
**Schwierigkeit:** ⭐⭐☆☆☆ (Einfach!)
