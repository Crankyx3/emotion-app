# Firebase Security Setup

## ⚠️ KRITISCH: Firestore Security Rules

Aktuell ist deine Datenbank wahrscheinlich im **Test-Modus** (öffentlich lesbar/schreibbar).
Das ist **GEFÄHRLICH** für Production!

## 🔐 Firestore Rules deployen

### Option 1: Über Firebase Console (Einfach, 2 Minuten)

1. **Gehe zu Firebase Console:**
   - https://console.firebase.google.com/
   - Wähle Projekt: `emotionapp-35448`

2. **Öffne Firestore Database:**
   - Linkes Menü → **Firestore Database**
   - Tab: **Rules**

3. **Kopiere die Rules:**
   - Öffne `firestore.rules` in diesem Projekt
   - Kopiere den kompletten Inhalt
   - Füge ihn in das Rules-Editor-Feld ein

4. **Veröffentlichen:**
   - Klicke **"Publish"**
   - ✅ Fertig!

### Option 2: Via Firebase CLI (Professionell)

```bash
# 1. Firebase CLI installieren (falls noch nicht geschehen)
npm install -g firebase-tools

# 2. Einloggen
firebase login

# 3. Projekt initialisieren
firebase init firestore
# Wähle: "Use an existing project"
# Wähle: emotionapp-35448

# 4. Rules deployen
firebase deploy --only firestore:rules
```

## 📋 Was die Rules machen

### ✅ ERLAUBT:

1. **Eigene Daten lesen/schreiben:**
   - User kann nur seine eigenen `entries`, `chats`, `weeklyAnalyses` sehen
   - Jedes Dokument muss `userId` Feld haben

2. **User-Profil verwalten:**
   - User kann sein eigenes User-Dokument erstellen/bearbeiten

3. **Feedback senden:**
   - Jeder eingeloggte User kann `suggestionFeedback` erstellen

4. **Admin-Zugriff:**
   - Admins können alles lesen (für Support)
   - Admin-Status wird in `/users/{userId}` mit Feld `isAdmin: true` gesetzt

### ❌ BLOCKIERT:

1. **Fremde Daten lesen:**
   - User A kann nicht die Einträge von User B sehen

2. **Ohne Login:**
   - Kein Zugriff ohne Authentication

3. **Falsche userId:**
   - Wenn beim Erstellen eines Dokuments `userId != auth.uid`

## 🧪 Rules testen

### In Firebase Console:

1. **Firestore Database → Rules → Simulator**

2. **Test 1: Eigene Daten lesen** ✅
   ```
   Location: /entries/test123
   Read
   Authenticated: Yes
   Auth UID: user123

   Document data:
   { userId: "user123", text: "Test" }

   Result: ✅ ALLOW
   ```

3. **Test 2: Fremde Daten lesen** ❌
   ```
   Location: /entries/test456
   Read
   Authenticated: Yes
   Auth UID: user123

   Document data:
   { userId: "user999", text: "Secret" }

   Result: ❌ DENY
   ```

### In der App:

```javascript
// Das sollte funktionieren (eigene Daten)
const entriesRef = collection(db, "entries");
const q = query(entriesRef, where("userId", "==", auth.currentUser.uid));
const snapshot = await getDocs(q);
// ✅ Funktioniert

// Das sollte NICHT funktionieren (fremde Daten)
const entriesRef = collection(db, "entries");
const snapshot = await getDocs(entriesRef); // Ohne userId-Filter
// ❌ Permission denied
```

## ⚠️ WICHTIG: Daten-Migration

Falls du **bereits Dokumente ohne `userId`** hast:

### Fehlende `userId` hinzufügen:

```javascript
// Einmalig in Firebase Console → Firestore → Query ausführen
// Oder Node.js Script:

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Beispiel: Entries ohne userId fixen
const entriesSnapshot = await db.collection('entries').get();

for (const doc of entriesSnapshot.docs) {
  if (!doc.data().userId) {
    console.log(`Fixing entry ${doc.id} - missing userId`);
    // ACHTUNG: Du musst die echte userId kennen!
    // await doc.ref.update({ userId: 'CORRECT_USER_ID' });
  }
}
```

**VORSICHT:** Nur ausführen wenn du weißt, welche `userId` zu welchem Dokument gehört!

## 🔍 Überwachen

Nach dem Deploy:

1. **Firestore → Usage Tab:**
   - Checke ob "Permission denied" Errors auftauchen
   - Normal: Ein paar Errors beim Testen
   - Schlecht: Viele Errors in Production

2. **In der App:**
   - Teste alle Features
   - Checke Console-Logs für Permission-Errors

## 📝 Checkliste

- [ ] Rules in Firebase Console eingefügt
- [ ] Rules veröffentlicht
- [ ] In der App getestet:
  - [ ] Einträge lesen funktioniert
  - [ ] Neuen Eintrag erstellen funktioniert
  - [ ] Wochenanalyse erstellen funktioniert
  - [ ] Chat-Nachrichten funktionieren
  - [ ] Settings → Account löschen funktioniert
- [ ] Kein "Permission denied" in Console

## 🆘 Troubleshooting

### Fehler: "Missing or insufficient permissions"

**Ursache:** Dokument hat keine `userId` oder `userId` stimmt nicht überein

**Lösung:**
```javascript
// Stelle sicher, dass JEDES neue Dokument userId hat:
await addDoc(collection(db, "entries"), {
  userId: auth.currentUser.uid,  // ← WICHTIG!
  text: "Mein Eintrag",
  // ...
});
```

### Fehler: "False for 'list' @ L1"

**Ursache:** Versuchst alle Dokumente ohne Filter zu laden

**Lösung:**
```javascript
// FALSCH:
const snapshot = await getDocs(collection(db, "entries"));

// RICHTIG:
const q = query(
  collection(db, "entries"),
  where("userId", "==", auth.currentUser.uid)
);
const snapshot = await getDocs(q);
```

---

## ✅ Nach dem Setup

Deine Datenbank ist jetzt sicher! 🎉

**Nächste Schritte:**
1. OpenAI API Key absichern (siehe `OPENAI_SECURITY_SETUP.md`)
2. RevenueCat einrichten
3. Beta-Testing starten

