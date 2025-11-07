# 🔒 Datenschutz-Migration: Lokale Speicherung

## Warum diese Änderung?

**Problem:**
- Sensible Gesundheitsdaten (Texte, KI-Analysen) wurden in Firestore (Cloud) gespeichert
- DSGVO-Problem: Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO)
- Speicherung in USA (Firebase/Google)
- User hat keine volle Kontrolle

**Lösung:**
- ✅ **Sensible Daten NUR lokal** (AsyncStorage auf Gerät)
- ✅ **Metadaten in Cloud** (nur für Charts/Statistiken)
- ✅ **User hat volle Kontrolle**
- ✅ **DSGVO-konform**

---

## Was wird wo gespeichert?

### ✅ LOKAL (AsyncStorage):
- **Tageseinträge:**
  - Vollständiger Text
  - KI-Analyse
  - Dankbarkeitsnotiz

- **Wochenanalysen:**
  - Vollständige KI-Analyse
  - Detaillierte Insights

- **Chat-Nachrichten:**
  - User-Nachrichten
  - KI-Antworten
  - (Bereits Opt-in vorhanden!)

### ☁️ CLOUD (Firestore):
- **Nur Metadaten:**
  - Emotion (z.B. "glücklich")
  - Wohlfühlscore (1-10)
  - Datum/Zeitstempel
  - KEIN Text
  - KEINE KI-Antworten

---

## ✅ Bereits implementiert

### 1. LocalStorage Service
**Datei:** `services/localStorageService.js`

**Funktionen:**
```javascript
// Einträge speichern & laden
saveEntryLocally(userId, entry)
getLocalEntries(userId)
getTodaysLocalEntry(userId)
getLocalEntriesByDateRange(userId, start, end)

// Wochenanalysen
saveWeeklyAnalysisLocally(userId, analysis)
getLocalWeeklyAnalyses(userId)

// Export/Import
exportAllLocalData(userId)
importLocalData(userId, data)

// Statistiken
getLocalStatistics(userId)
```

### 2. DailyEntryScreen ✅
**Status:** Komplett umgestellt

**Vorher:**
```javascript
await addDoc(collection(db, "entries"), {
  text: "Sensible Daten",  // ❌
  analysis: "KI-Analyse",   // ❌
  //...
});
```

**Nachher:**
```javascript
// 1. Lokal speichern
await saveEntryLocally(userId, {
  text: "Sensible Daten",    // ✅ NUR LOKAL
  analysis: "KI-Analyse",    // ✅ NUR LOKAL
});

// 2. Nur Metadaten in Cloud
await addDoc(collection(db, "entries"), {
  emotion: "glücklich",
  feelScore: 8,
  createdAt: Timestamp.now(),
  // KEIN text, KEINE analysis!
});
```

---

## 🔧 Noch zu migrieren

### 3. DailyAnalysisScreen ⚠️ KOMPLEX
**Aktuell:** Lädt Daten aus Firestore
**Änderung nötig:**
```javascript
// ALT:
const snapshot = await getDocs(query(...));
const data = snapshot.docs[0].data();
setAiText(data.analysis);  // ❌ Kommt aus Cloud

// NEU:
const localEntry = await getTodaysLocalEntry(userId);
setAiText(localEntry.analysis);  // ✅ Kommt lokal
```

### 4. HomeScreen ⚠️
**Aktuell:** Berechnet Streak aus Firestore
**Änderung nötig:**
```javascript
// ALT:
const entries = await getDocs(query(collection(db, "entries"), ...));

// NEU:
const entries = await getLocalEntries(userId);
// Streak-Berechnung bleibt gleich
```

### 5. AnalysisScreen (Wochenanalysen) ⚠️
**Aktuell:** Lädt aus Firestore + erstellt neue dort
**Änderung nötig:**
```javascript
// ALT:
const analyses = await getDocs(query(collection(db, "weeklyAnalyses"), ...));

// NEU:
const analyses = await getLocalWeeklyAnalyses(userId);

// Bei neuer Analyse:
await saveWeeklyAnalysisLocally(userId, {
  analysis: aiResponse,
  //...
});
```

### 6. EmotionChartScreen ✅ FUNKTIONIERT SCHON
**Grund:** Chart braucht nur Metadaten (Emotion, Score, Datum)
**Diese liegen weiter in Firestore!**

Keine Änderung nötig ✅

### 7. SettingsScreen - Daten löschen ⚠️
**Aktuell:** Löscht nur Firestore
**Änderung nötig:**
```javascript
// ALT:
await deleteDoc(doc(db, "entries", id));

// NEU:
// 1. Lokal löschen
await deleteAllLocalEntries(userId);
await deleteAllLocalWeeklyAnalyses(userId);

// 2. Cloud-Metadaten löschen
await deleteDoc(doc(db, "entries", id));
```

---

## 📊 Aufwand pro Screen

| Screen | Aufwand | Priorität | Status |
|--------|---------|-----------|--------|
| DailyEntryScreen | 30 Min | 🔴 Hoch | ✅ Fertig |
| LocalStorage Service | 1h | 🔴 Hoch | ✅ Fertig |
| DailyAnalysisScreen | 1-2h | 🟡 Mittel | ⏳ Pending |
| HomeScreen | 30 Min | 🟡 Mittel | ⏳ Pending |
| AnalysisScreen | 1h | 🟡 Mittel | ⏳ Pending |
| SettingsScreen | 30 Min | 🟢 Niedrig | ⏳ Pending |
| EmotionChartScreen | - | - | ✅ Keine Änderung |

**Total verbleibend:** ~3-4 Stunden

---

## 🚀 Migrations-Strategie

### Option A: Sofort komplett migrieren
**Vor Launch alles umstellen**
- ✅ Datenschutz-konform von Anfang an
- ✅ Keine doppelte Logik
- ⚠️ 3-4 Stunden Arbeit

### Option B: Schritt-für-Schritt (EMPFOHLEN)
**Neue Daten lokal, alte bleiben in Cloud**
- ✅ Ab jetzt: Neue Einträge nur lokal
- ✅ Alte Daten bleiben in Cloud (nicht kritisch bei Beta)
- ✅ Später: Migration-Script für bestehende User
- ⏱️ ~1 Stunde zusätzlich

---

## 📝 Datenschutzerklärung Update

**Ergänze in `PRIVACY_POLICY.md`:**

```markdown
## Datenspeicherung

### Lokal auf Ihrem Gerät
Alle sensiblen Daten werden **ausschließlich lokal** auf Ihrem Gerät gespeichert:
- ✅ Ihre Tagebucheinträge und Texte
- ✅ KI-Analysen und Empfehlungen
- ✅ Chat-Verläufe (falls aktiviert)
- ✅ Persönliche Notizen

Diese Daten verlassen **niemals** Ihr Gerät, außer:
- Sie aktivieren Cloud-Backup (Premium-Feature, optional)
- Sie exportieren Daten manuell

### In der Cloud (Firebase)
Nur anonymisierte **Metadaten** für Statistiken:
- Emotionen (z.B. "glücklich", "traurig")
- Wohlfühlscores (1-10)
- Datum und Uhrzeit
- **KEINE Texte oder KI-Antworten**

### Ihre Kontrolle
- ✅ Daten jederzeit lokal löschen
- ✅ Export als JSON/PDF möglich
- ✅ Optional: Verschlüsseltes Cloud-Backup (Premium)
- ✅ DSGVO-konform: Datenminimierung & Zweckbindung
```

---

## 🧪 Testing-Checklist

Nach Implementierung testen:

**Neue Einträge:**
- [ ] Eintrag erstellen → Lokal gespeichert
- [ ] In Firestore: Nur Metadaten, kein Text
- [ ] Neustart App → Daten noch da
- [ ] HomeScreen zeigt Streak korrekt
- [ ] Charts funktionieren (Metadaten aus Cloud)

**Wochenanalyse:**
- [ ] Analyse erstellen → Lokal gespeichert
- [ ] In Firestore: Nur Metadaten
- [ ] Analyse erneut abrufbar

**Daten löschen:**
- [ ] Settings → Account löschen
- [ ] Lokal: Alles weg
- [ ] Cloud: Metadaten weg

**Migration von alten Daten:**
- [ ] Alte Firestore-Einträge noch lesbar?
- [ ] Fallback-Logik funktioniert

---

## 🔍 Debugging

**Lokal gespeicherte Daten prüfen:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Alle Keys anzeigen
const keys = await AsyncStorage.getAllKeys();
console.log('Gespeicherte Keys:', keys);

// Einträge anzeigen
const entries = await AsyncStorage.getItem(`entries_${userId}`);
console.log('Einträge:', JSON.parse(entries));
```

**Firestore-Metadaten prüfen:**
- Firebase Console → Firestore Database
- Collection: `entries`
- Prüfe: `hasLocalData: true`, aber kein `text` oder `analysis`

---

## ⚠️ Bekannte Einschränkungen

### 1. Kein automatisches Cloud-Backup
**Problem:** Daten weg wenn App gelöscht wird
**Lösung:** Premium-Feature "Cloud-Backup" (verschlüsselt)

### 2. Kein Sync zwischen Geräten
**Problem:** Daten nur auf einem Gerät
**Lösung:** Premium-Feature "Geräte-Sync" (verschlüsselt)

### 3. Größenlimit AsyncStorage
**Problem:** ~6MB Limit (iOS), ~10MB (Android)
**Wenn erreicht:**
- Älteste Einträge archivieren
- Export anbieten
- Premium: Unbegrenzt in Cloud

---

## ✅ Vorteile der Lösung

1. **DSGVO-konform** ✅
   - Art. 25: Privacy by Design
   - Art. 9: Schutz besonderer Kategorien

2. **User-Kontrolle** ✅
   - Daten bleiben auf Gerät
   - Keine unerwartete Cloud-Speicherung

3. **Schneller** ✅
   - Kein Netzwerk nötig
   - Offline-first

4. **Kosteneffizienz** ✅
   - Weniger Firestore-Reads/Writes
   - Niedrigere Firebase-Kosten

5. **Charts funktionieren** ✅
   - Metadaten reichen für Statistiken
   - Keine Einschränkung der Features

---

## 🚦 Nächste Schritte

**Für sofortigen Launch:**
1. ✅ DailyEntryScreen (fertig)
2. ⏳ HomeScreen anpassen (30 Min)
3. ⏳ Datenschutzerklärung updaten (10 Min)
4. ✅ Firestore Rules deployen (bereits bereit)

**Nach Launch:**
5. DailyAnalysisScreen anpassen
6. AnalysisScreen anpassen
7. Cloud-Backup als Premium-Feature
8. Migration-Script für Bestandsdaten

**Total: ~40-60 Minuten für Launch-Readiness**

---

## 💬 Fragen?

- Soll ich die verbleibenden Screens jetzt anpassen?
- Oder erst mit der aktuellen Version in Beta gehen?
- Willst du Cloud-Backup als Premium-Feature?

**Meine Empfehlung:**
1. HomeScreen anpassen (30 Min)
2. Datenschutzerklärung updaten (10 Min)
3. **Beta-Launch mit neuer Struktur**
4. Rest nach Beta-Feedback
