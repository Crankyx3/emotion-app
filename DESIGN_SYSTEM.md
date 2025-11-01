# Design System - Anleitung

## 📦 Übersicht

Das Design System bietet einheitliche Komponenten und Styles für die gesamte App.

## 🎨 Theme (`theme.js`)

### Farben

```javascript
import { Colors } from './theme';

// Primary
Colors.primary        // #007AFF (Blau)
Colors.primaryLight   // #E3F2FD
Colors.primaryDark    // #0056B3

// Status
Colors.success        // #34a853 (Grün)
Colors.warning        // #fbbc05 (Gelb)
Colors.error          // #E03131 (Rot)
Colors.info           // #a142f4 (Lila)

// Backgrounds
Colors.background     // #EAF4FF
Colors.surface        // #FFFFFF (Cards)
Colors.surfaceLight   // #F7F9FC (Paragraph-Container)

// Text
Colors.text           // #1C1C1E (Haupttext)
Colors.textSecondary  // #666666
Colors.textMuted      // #8E8E93

// Borders
Colors.border         // #E5E5EA
Colors.borderLight    // #F2F2F7
```

### Spacing

```javascript
import { Spacing } from './theme';

Spacing.xs    // 8px
Spacing.sm    // 12px
Spacing.md    // 16px
Spacing.lg    // 20px
Spacing.xl    // 24px
Spacing.xxl   // 32px
Spacing.xxxl  // 40px

// Verwendung in Styles:
padding: Spacing.md,
marginTop: Spacing.lg,
```

### Typography

```javascript
import { Typography } from './theme';

// In Styles verwenden:
...Typography.h1,        // Heading 1 (28px, bold)
...Typography.h2,        // Heading 2 (24px, bold)
...Typography.h3,        // Heading 3 (20px, semi-bold)
...Typography.h4,        // Heading 4 (18px, semi-bold)
...Typography.body,      // Body Text (16px)
...Typography.bodyBold,  // Body Text fett
...Typography.caption,   // Caption (14px)
...Typography.small,     // Small Text (12px)
```

### Border Radius

```javascript
import { BorderRadius } from './theme';

borderRadius: BorderRadius.sm,    // 8px
borderRadius: BorderRadius.md,    // 12px
borderRadius: BorderRadius.lg,    // 16px
borderRadius: BorderRadius.xl,    // 20px
borderRadius: BorderRadius.round, // 50px (Circles)
```

### Shadows

```javascript
import { Shadows } from './theme';

// In Styles verwenden:
...Shadows.small,   // Dezente Shadow
...Shadows.medium,  // Standard Shadow
...Shadows.large,   // Starke Shadow
```

## 🃏 Card Component

### Basic Card

```javascript
import { Card, CardHeader, CardContent } from '../components/Card';

<Card>
  <CardHeader
    icon="heart"
    iconColor={Colors.error}
    title="Titel"
    subtitle="Untertitel"
  />
  <CardContent>
    <Text>Inhalt hier...</Text>
  </CardContent>
</Card>
```

### MenuCard (für Navigation)

```javascript
import { MenuCard } from '../components/Card';

<MenuCard
  icon="settings-outline"
  iconColor={Colors.primary}
  title="Einstellungen"
  subtitle="App-Konfiguration"
  badge={<Badge />}  // Optional
  onPress={() => navigation.navigate('Settings')}
/>
```

### InfoCard (für Hinweise)

```javascript
import { InfoCard } from '../components/Card';

<InfoCard
  type="success"  // info, success, warning, error
  icon="checkmark-circle"
  title="Erfolg!"
  message="Deine Daten wurden gespeichert."
/>
```

### Card Variants

```javascript
<Card variant="base">      // Standard
<Card variant="compact">   // Weniger Padding
<Card variant="elevated">  // Stärkere Shadow
```

## 🔘 Button Component

### Basic Button

```javascript
import Button from '../components/Button';

<Button
  variant="primary"
  onPress={handlePress}
>
  Klick mich
</Button>
```

### Variants

```javascript
<Button variant="primary">   // Blau, weiße Schrift
<Button variant="secondary"> // Grauer Hintergrund
<Button variant="outline">   // Transparent mit Border
<Button variant="success">   // Grün
<Button variant="error">     // Rot
<Button variant="ghost">     // Komplett transparent
```

### Sizes

```javascript
<Button size="small">   // Klein
<Button size="medium">  // Standard
<Button size="large">   // Groß
```

### Mit Icon

```javascript
<Button
  icon="checkmark"
  iconPosition="left"  // oder "right"
>
  Speichern
</Button>
```

### States

```javascript
<Button disabled={true}>        // Deaktiviert
<Button loading={true}>         // Loading Spinner
<Button fullWidth={true}>       // Volle Breite
```

## 📝 Verwendung in Screens

### Beispiel: Einheitlicher Screen

```javascript
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, CardHeader, CardContent, MenuCard } from '../components/Card';
import Button from '../components/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme';

export default function MyScreen({ navigation }) {
  return (
    <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header Card */}
        <Card>
          <CardHeader
            icon="analytics"
            iconColor={Colors.primary}
            title="Übersicht"
            subtitle="Deine Statistiken"
          />
          <CardContent>
            <Text style={styles.bodyText}>
              Content hier...
            </Text>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <MenuCard
          icon="settings"
          iconColor={Colors.info}
          title="Einstellungen"
          subtitle="App konfigurieren"
          onPress={() => navigation.navigate('Settings')}
        />

        {/* Button */}
        <Button
          variant="primary"
          size="large"
          icon="save"
          fullWidth
          onPress={handleSave}
        >
          Speichern
        </Button>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.text,
  },
});
```

## ✅ Best Practices

### DO ✅

- **Immer Theme-Farben verwenden**: `Colors.primary` statt `#007AFF`
- **Spacing-System nutzen**: `Spacing.md` statt `16`
- **Typography nutzen**: `...Typography.body` statt manuelle Font-Definition
- **Komponenten wiederverwenden**: `MenuCard` statt eigene Card bauen
- **Shadows nutzen**: `...Shadows.medium` statt manuell

### DON'T ❌

- **Keine Hardcoded-Farben**: ~~`color: '#007AFF'`~~
- **Keine Hardcoded-Spacing**: ~~`padding: 16`~~
- **Keine doppelten Komponenten**: Nutze existierende Cards/Buttons
- **Keine Custom Shadows**: Nutze vordefinierte Shadows

## 🔄 Migration Guide

### Alte Styles → Neue Styles

```javascript
// VORHER ❌
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
});

// NACHHER ✅
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  title: {
    ...Typography.h4,
  },
});
```

### Alte Cards → MenuCard

```javascript
// VORHER ❌
<TouchableOpacity style={styles.card} onPress={...}>
  <View style={styles.iconContainer}>
    <Ionicons name="settings" size={24} color="#007AFF" />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={styles.cardTitle}>Einstellungen</Text>
    <Text style={styles.cardSubtitle}>App konfigurieren</Text>
  </View>
  <Ionicons name="chevron-forward" size={22} color="#ccc" />
</TouchableOpacity>

// NACHHER ✅
<MenuCard
  icon="settings"
  iconColor={Colors.primary}
  title="Einstellungen"
  subtitle="App konfigurieren"
  onPress={...}
/>
```

## 🎯 Nächste Schritte

Für weitere Screens:
1. Theme importieren
2. Alte Styles durch Theme-Tokens ersetzen
3. Eigene Card-Komponenten durch MenuCard/Card ersetzen
4. Eigene Buttons durch Button-Komponente ersetzen
5. Konsistente Abstände mit Spacing-System

**Viel Erfolg! 🚀**
