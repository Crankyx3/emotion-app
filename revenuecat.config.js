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
  // FÜR LOKALE ENTWICKLUNG: Test-Key verwenden (unten)
  // FÜR PRODUCTION BUILD: Echten Key eintragen von https://app.revenuecat.com/
  //                       Project Settings → API Keys → "Google Play Public API Key"
  //
  // androidApiKey: 'test_IjrjYiLROwkENkSZeERxRZMTJwW',  // Test-Key nur für Entwicklung
  androidApiKey: 'goog_HUKpbgYqweutwSTgFvNHOOdZQNR',  // ← PRODUCTION KEY HIER EINTRAGEN!

  // iOS Public API Key (falls später benötigt)
  iosApiKey: 'YOUR_IOS_API_KEY_HERE',

  // Product IDs (müssen mit Google Play Console übereinstimmen)
  products: {
    monthly: 'premium_monthly',
    yearly: 'premium_yearly',
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
