/**
 * RevenueCat Configuration
 *
 * WICHTIG: Trage hier deine RevenueCat API Keys ein!
 *
 * So findest du die Keys:
 * 1. Gehe zu https://app.revenuecat.com/
 * 2. Wähle dein Projekt
 * 3. Navigiere zu: Project Settings → API Keys
 * 4. Kopiere den "Public App-specific API Key"
 */

const REVENUECAT_CONFIG = {
  // Android Public API Key (NICHT Secret Key!)
  //
  // ⚠️ WICHTIG: Wähle den richtigen Key je nach Umgebung:
  //
  // 🧪 FÜR EXPO GO DEVELOPMENT (npx expo start):
  //    → Test-Key verwenden (aktiv unten)
  //
  // 🚀 FÜR RELEASE BUILD / INTERNER TEST (AAB für Play Store):
  //    → Production Key aktivieren, Test-Key auskommentieren
  //
  // androidApiKey: 'test_IjrjYiLROwkENkSZeERxRZMTJwW',  // ← Test-Key (für Expo Go)
  androidApiKey: 'goog_HUKpbgYqweutwSTgFvNHOOdZQNR',  // ← Production Key (für AAB Build / Internal Testing)

  // iOS Public API Key (falls später benötigt)
  iosApiKey: 'YOUR_IOS_API_KEY_HERE',

  // Product IDs (müssen mit Google Play Console übereinstimmen)
  products: {
    monthly: 'premium_monthly:p1m-monthly-1',
    yearly: 'premium_yearly:p1y-yearly-1',
  },

  // Offering ID (aus RevenueCat Dashboard)
  defaultOffering: 'default',
};

export default REVENUECAT_CONFIG;

/**
 * SETUP-ANLEITUNG:
 *
 * 1. RevenueCat Account erstellen (app.revenuecat.com)
 * 2. Projekt erstellen: "KI-Stimmungshelfer"
 * 3. Android App hinzufügen:
 *    - Package Name: com.ki.stimmungshelfer
 *    - Store: Google Play Store
 * 4. Google Play Console verbinden:
 *    - Service Account erstellen
 *    - JSON hochladen
 * 5. Products in Google Play Console erstellen:
 *    - premium_monthly (z.B. 8,99€/Monat)
 *    - premium_yearly (z.B. 91,70€/Jahr)
 * 6. Products in RevenueCat importieren
 * 7. Offering erstellen: "default"
 * 8. API Key kopieren und oben eintragen
 */
