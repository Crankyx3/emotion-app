# Installation Guide - Neue Features

## 📦 Benötigte Packages installieren

Die neuen Features benötigen zusätzliche Packages. Bitte führe folgende Befehle aus:

```bash
# Push Notifications
npx expo install expo-notifications

# Falls noch nicht installiert (sollte aber vorhanden sein):
npx expo install @react-native-async-storage/async-storage
```

## 🔔 Push Notifications Setup

### iOS
1. Öffne `app.json`
2. Füge hinzu (falls noch nicht vorhanden):
```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#007AFF",
      "androidMode": "default"
    },
    "ios": {
      "bundleIdentifier": "com.yourdomain.emotionapp"
    }
  }
}
```

### Android
- Notifications sollten automatisch funktionieren
- Keine zusätzliche Konfiguration nötig

### Testen
1. App starten
2. Zu Settings → Erinnerungen gehen
3. Erinnerung aktivieren
4. Zeit auswählen
5. App schließen und zur eingestellten Zeit auf Notification warten

## 🏆 Features Overview

### 1. Emergency/SOS Screen ✅
- **Kein zusätzliches Setup nötig**
- Erreichbar über SOS-Tab (rotes medical Icon)
- Enthält:
  - Telefonseelsorge & Krisenchat Links
  - Sofort-Strategien (5-4-3-2-1, Box-Atmung, etc.)
  - 112 Notruf-Button

### 2. Push Notifications ✅
- **Benötigt: `expo-notifications`**
- Features:
  - Tägliche Erinnerungen (anpassbare Zeit)
  - Streak-Glückwünsche (3, 7, 14, 30, 100 Tage)
  - Achievement-Benachrichtigungen
- Einstellungen: Settings → 🔔 Erinnerungen

### 3. Achievement System ✅
- **Kein zusätzliches Setup nötig**
- Features:
  - 15+ Achievements (Streaks, Einträge, Analysen, etc.)
  - Fortschritts-Tracking
  - Visuelle Achievement-Galerie
- Erreichbar: HomeScreen → "Deine Erfolge" Button

## 🧪 Testing Checklist

### Emergency Screen
- [ ] SOS-Tab ist sichtbar (rot)
- [ ] Hotline-Nummern sind klickbar
- [ ] 112-Button funktioniert
- [ ] Strategien sind expandierbar

### Notifications
- [ ] Permission-Dialog erscheint beim Aktivieren
- [ ] Zeit-Picker öffnet sich
- [ ] Notification erscheint zur eingestellten Zeit
- [ ] Toggle an/aus funktioniert

### Achievements
- [ ] Button auf HomeScreen ist sichtbar
- [ ] Screen öffnet sich
- [ ] Fortschrittsbalken zeigt korrekte Prozente
- [ ] Achievements werden freigeschaltet (teste mit Streak)

## 🐛 Troubleshooting

### Notifications funktionieren nicht
1. Permissions prüfen:
   ```bash
   # iOS: Einstellungen → App → Mitteilungen
   # Android: Einstellungen → Apps → Deine App → Benachrichtigungen
   ```
2. App neu builden:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios
   # oder
   npx expo run:android
   ```

### Achievements werden nicht freigeschaltet
- Prüfe ob `checkAndAwardAchievements()` aufgerufen wird
- Check AsyncStorage: `achievements_${userId}` Key
- Lösung: Achievement Service wird beim nächsten Streak-Update automatisch getriggert

## 📱 Build für Production

Wenn alles getestet ist:

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 🚀 Nächste Schritte (Optional)

Weitere Verbesserungen die du später hinzufügen könntest:
- [ ] Foto-Tagebuch (Bilder zu Einträgen)
- [ ] Audio-Journaling (Sprachnachrichten)
- [ ] Widgets (iOS/Android Homescreen)
- [ ] Siri Shortcuts
- [ ] Meditation Timer mit Sounds
- [ ] Export verbessern (Charts für Therapeut)

## ⚠️ Wichtig

Die Notifications funktionieren nur auf echten Geräten oder Simulatoren, **NICHT im Expo Go**! Du musst einen Development Build erstellen:

```bash
npx expo run:ios
# oder
npx expo run:android
```
