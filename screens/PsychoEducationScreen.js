import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import ScreenHeader from "../components/ScreenHeader";

const { width } = Dimensions.get("window");

export default function PsychoEducationScreen({ navigation }) {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const educationCards = [
    {
      id: 1,
      title: "Was sind kognitive Verzerrungen?",
      icon: "brain",
      iconType: "MaterialCommunityIcons",
      color: "#007aff",
      category: "Psychologie Grundlagen",
      readTime: "3 Min.",
      summary: "Lerne über häufige Denkfehler, die unsere Wahrnehmung beeinflussen",
      content: `Kognitive Verzerrungen sind systematische Denkfehler, die unsere Wahrnehmung und Entscheidungen beeinflussen.

**Häufige kognitive Verzerrungen:**

1. **Schwarz-Weiß-Denken**
   Alles wird in Extremen gesehen - entweder perfekt oder ein totales Versagen. Es gibt keine Graustufen.

   Beispiel: "Wenn ich nicht perfekt bin, bin ich ein Versager."

2. **Übergeneralisierung**
   Ein einzelnes negatives Ereignis wird als endloses Muster des Versagens gesehen.

   Beispiel: "Ich habe einen Fehler gemacht, ich mache immer alles falsch."

3. **Katastrophisieren**
   Das Schlimmste wird immer erwartet, auch wenn es unwahrscheinlich ist.

   Beispiel: "Wenn ich diese Präsentation vermassel, werde ich gefeuert und mein Leben ist ruiniert."

4. **Gedankenlesen**
   Annahme, dass man weiß, was andere denken - meist negativ.

   Beispiel: "Sie denkt bestimmt, dass ich inkompetent bin."

5. **Emotionales Denken**
   Gefühle werden als Fakten interpretiert.

   Beispiel: "Ich fühle mich dumm, also bin ich dumm."

**Wie kann man damit umgehen?**

• Erkenne die Verzerrung: Bewusstsein ist der erste Schritt
• Hinterfrage deine Gedanken: Sind sie wirklich wahr?
• Suche nach Beweisen: Was spricht dafür? Was dagegen?
• Formuliere um: Finde eine ausgewogenere Perspektive
• Übe Selbstmitgefühl: Sei freundlich zu dir selbst

**Merke dir:**
Gedanken sind nicht immer Fakten. Du kannst lernen, sie zu hinterfragen und realistischer zu denken.`,
    },
    {
      id: 2,
      title: "5 Wege mit Angst umzugehen",
      icon: "heart-circle",
      iconType: "Ionicons",
      color: "#34a853",
      category: "Bewältigungsstrategien",
      readTime: "4 Min.",
      summary: "Praktische Techniken zur Angstbewältigung im Alltag",
      content: `Angst ist eine normale emotionale Reaktion, aber sie kann überwältigend werden. Hier sind 5 bewährte Strategien:

**1. Atemtechniken** 🫁

Die 4-7-8 Technik:
• Atme 4 Sekunden durch die Nase ein
• Halte den Atem 7 Sekunden
• Atme 8 Sekunden durch den Mund aus
• Wiederhole 4x

Warum es hilft: Aktiviert das parasympathische Nervensystem und beruhigt den Körper.

**2. Grounding-Technik (5-4-3-2-1)** 🌍

Bei akuter Angst oder Panik:
• Nenne 5 Dinge, die du SIEHST
• Nenne 4 Dinge, die du FÜHLST (taktil)
• Nenne 3 Dinge, die du HÖRST
• Nenne 2 Dinge, die du RIECHST
• Nenne 1 Ding, das du SCHMECKST

Warum es hilft: Bringt dich zurück in den gegenwärtigen Moment und aus dem Angstzustand.

**3. Progressive Muskelentspannung** 💪

• Spanne einzelne Muskelgruppen für 5-10 Sekunden an
• Löse die Spannung plötzlich
• Spüre die Entspannung für 15-20 Sekunden
• Gehe durch den ganzen Körper (Füße → Kopf)

Warum es hilft: Körperliche Entspannung führt zu mentaler Entspannung.

**4. Gedanken-Stopp-Technik** 🛑

Wenn Angstgedanken kreisen:
• Sage laut oder innerlich "STOPP!"
• Erkenne den Gedanken an: "Das ist nur Angst"
• Ersetze ihn: "Ich bin jetzt sicher"
• Lenke dich ab: Konzentriere dich auf etwas anderes

Warum es hilft: Unterbricht den Angst-Kreislauf und gibt dir Kontrolle zurück.

**5. Akzeptanz statt Kampf** 🤝

Paradoxerweise:
• Akzeptiere, dass du Angst hast
• Kämpfe nicht dagegen an
• Sage: "Ich habe gerade Angst, und das ist okay"
• Lass die Angst da sein, ohne sie zu bewerten

Warum es hilft: Was man bekämpft, wird stärker. Akzeptanz nimmt der Angst ihre Macht.

**Langfristige Strategien:**

✓ Regelmäßige Bewegung (30 Min./Tag)
✓ Ausreichend Schlaf (7-9 Stunden)
✓ Gesunde Ernährung
✓ Koffein und Alkohol reduzieren
✓ Soziale Kontakte pflegen
✓ Professionelle Hilfe suchen, wenn nötig

**Wichtig:**
Diese Techniken ersetzen keine professionelle Therapie bei schweren Angststörungen. Zögere nicht, Hilfe zu suchen!`,
    },
    {
      id: 3,
      title: "Emotionale Regulation verstehen",
      icon: "thermometer",
      iconType: "MaterialCommunityIcons",
      color: "#fbbc05",
      category: "Emotionale Intelligenz",
      readTime: "4 Min.",
      summary: "Wie du deine Emotionen besser verstehen und steuern kannst",
      content: `Emotionale Regulation ist die Fähigkeit, deine Emotionen zu erkennen, zu verstehen und gesund damit umzugehen.

**Was ist emotionale Regulation?**

Es geht NICHT darum, Emotionen zu unterdrücken oder "wegzumachen". Es geht darum:
• Emotionen zu erkennen und zu benennen
• Ihre Intensität zu modulieren
• Konstruktiv mit ihnen umzugehen
• Sie nicht unkontrolliert auszuleben

**Das Emotionsmodell:**

1. **SITUATION** → 2. **BEWERTUNG** → 3. **EMOTION** → 4. **REAKTION**

Du kannst an jedem Punkt eingreifen!

**5 Strategien der Emotionsregulation:**

**1. Situationsselektion** 🎯
Vermeide oder suche bestimmte Situationen bewusst auf.

Beispiel: Wenn dich Nachrichten stressen, reduziere den Konsum.

**2. Situationsmodifikation** 🔧
Verändere die Situation, um Emotionen zu beeinflussen.

Beispiel: Bitte um ein ruhiges Gespräch statt einer hitzigen Diskussion.

**3. Aufmerksamkeitslenkung** 👁️
Lenke deine Aufmerksamkeit auf andere Aspekte.

Beispiel: Fokussiere auf die Lösung, nicht auf das Problem.

**4. Kognitive Umbewertung** 🔄
Bewerte die Situation neu (Reframing).

Beispiel: Statt "Das ist furchtbar!" → "Das ist herausfordernd, aber ich kann es schaffen."

**5. Reaktionsmodulation** 🎭
Beeinflusse die emotionale Reaktion direkt.

Beispiele:
• Atemübungen
• Progressive Muskelentspannung
• Physische Aktivität

**Die STOPP-Technik bei intensiven Emotionen:**

**S**topp - Halte inne
**T**ief durchatmen - 3x tief ein und aus
**O**bservieren - Was fühle ich? Was denke ich?
**P**erspektive - Wie wichtig ist das in 5 Jahren?
**P**roceed - Handle überlegt

**Emotionen vs. Emotionale Reaktionen:**

• Emotionen sind natürlich und wichtig
• Sie geben dir wichtige Informationen
• ABER: Du musst nicht jeder emotionalen Reaktion folgen
• Du kannst wählen, wie du handelst

**Gesunde vs. Ungesunde Regulation:**

✅ GESUND:
• Emotionen zulassen und fühlen
• Über Emotionen sprechen
• Ursachen verstehen
• Konstruktiv handeln
• Selbstmitgefühl praktizieren

❌ UNGESUND:
• Emotionen unterdrücken
• Vermeidung durch Substanzen
• Emotionaler Rückzug
• Impulsive Reaktionen
• Selbstkritik

**Übung: Das Emotions-Tagebuch**

Täglich notieren:
1. Situation: Was ist passiert?
2. Gedanken: Was habe ich gedacht?
3. Emotion: Was habe ich gefühlt? (Intensität 1-10)
4. Körperreaktion: Was habe ich gespürt?
5. Verhalten: Was habe ich getan?
6. Rückblick: War meine Reaktion hilfreich?

**Wichtig zu wissen:**

Emotionale Regulation ist eine FÄHIGKEIT, die man LERNEN und TRAINIEREN kann - wie einen Muskel!

Je mehr du übst, desto leichter wird es. Sei geduldig mit dir.`,
    },
    {
      id: 4,
      title: "Selbstmitgefühl entwickeln",
      icon: "hand-heart",
      iconType: "MaterialCommunityIcons",
      color: "#a142f4",
      category: "Selbstfürsorge",
      readTime: "3 Min.",
      summary: "Sei freundlich zu dir selbst - wie und warum",
      content: `Selbstmitgefühl bedeutet, sich selbst mit der gleichen Freundlichkeit zu behandeln, die man einem guten Freund entgegenbringt.

**Die 3 Komponenten von Selbstmitgefühl (nach Dr. Kristin Neff):**

**1. Selbstfreundlichkeit statt Selbstkritik** 💙

❌ Selbstkritik:
"Ich bin so dumm, ich hätte es besser wissen müssen!"

✅ Selbstfreundlichkeit:
"Ich habe einen Fehler gemacht. Das passiert jedem. Was kann ich daraus lernen?"

**2. Gemeinsame Menschlichkeit statt Isolation** 🤝

❌ Isolation:
"Nur ich mache solche Fehler. Mit mir stimmt etwas nicht."

✅ Gemeinsame Menschlichkeit:
"Fehler zu machen ist Teil des Menschseins. Jeder kämpft manchmal."

**3. Achtsamkeit statt Über-Identifikation** 🧘‍♀️

❌ Über-Identifikation:
"Ich BIN ein Versager." (mit der Emotion verschmelzen)

✅ Achtsamkeit:
"Ich FÜHLE mich gerade wie ein Versager." (Emotion beobachten)

**Warum ist Selbstmitgefühl wichtig?**

Forschung zeigt:
• Weniger Angst und Depression
• Mehr emotionale Resilienz
• Bessere Stressbewältigung
• Höhere Motivation (nicht niedriger!)
• Mehr Lebenszufriedenheit

**Der Mythos:**
"Selbstkritik motiviert mich, besser zu werden."

**Die Wahrheit:**
Selbstkritik führt zu:
• Angst vor Fehlern
• Vermeidung von Herausforderungen
• Prokrastination
• Burnout

Selbstmitgefühl führt zu:
• Lernen aus Fehlern
• Mut, Neues zu versuchen
• Ausdauer bei Schwierigkeiten
• Nachhaltiger Motivation

**Praktische Übungen:**

**1. Die Selbstmitgefühls-Pause** ⏸️

Wenn es schwer wird:
1. Hand aufs Herz legen
2. Sagen: "Das ist ein Moment des Leidens"
3. "Leiden ist Teil des Menschseins"
4. "Möge ich freundlich zu mir selbst sein"

**2. Der Freund-Test** 👥

Frage dich:
• Was würde ich einem guten Freund sagen?
• Wie würde ich mit ihm sprechen?
• Welchen Ton würde ich verwenden?

Dann: Sprich SO mit dir selbst!

**3. Selbstmitgefühls-Brief** ✉️

Schreibe dir selbst einen Brief:
• Aus der Perspektive eines liebevollen Freundes
• Über eine schwierige Situation
• Mit Verständnis und Ermutigung

**4. Mitfühlende Körperhaltung** 🤗

• Hand aufs Herz legen
• Sich selbst umarmen
• Sanft den Arm streicheln

Körperliche Gesten aktivieren das Fürsorgesystem!

**Häufige Einwände:**

"Ist das nicht egoistisch?"
→ Nein! Selbstmitgefühl ermöglicht es dir, für andere da zu sein, ohne auszubrennen.

"Werde ich dann faul?"
→ Nein! Forschung zeigt: Selbstmitgefühl erhöht Motivation und Ausdauer.

"Ich verdiene keine Freundlichkeit nach diesem Fehler."
→ Jeder Mensch verdient Freundlichkeit - auch du!

**Starte heute:**

Wähle EINE Übung und praktiziere sie täglich für eine Woche. Selbstmitgefühl ist wie ein Muskel - es wird stärker mit Übung!

**Erinnerung:**

Du musst nicht perfekt sein, um wertvoll zu sein. Du bist es bereits. 💜`,
    },
    {
      id: 5,
      title: "Stress verstehen und bewältigen",
      icon: "alert-circle",
      iconType: "Ionicons",
      color: "#e74c3c",
      category: "Stressbewältigung",
      readTime: "5 Min.",
      summary: "Was Stress mit deinem Körper macht und wie du ihn reduzierst",
      content: `Stress ist eine natürliche Reaktion, aber chronischer Stress kann schädlich sein. Verstehe ihn, um ihn zu bewältigen.

**Was ist Stress?**

Stress ist die Reaktion deines Körpers auf Anforderungen oder Bedrohungen - real oder wahrgenommen.

**Die Stress-Reaktion:**

1. **Alarm** - Gefahr erkannt!
2. **Widerstand** - Körper mobilisiert Ressourcen
3. **Erschöpfung** - Ressourcen aufgebraucht

**Akuter vs. Chronischer Stress:**

**Akuter Stress** ✓
• Kurzfristig
• Hilft bei Herausforderungen
• Körper erholt sich

Beispiel: Präsentation halten

**Chronischer Stress** ✗
• Langanhaltend
• Keine Erholung
• Gesundheitsschäden

Beispiel: Dauerhafter Arbeitsdruck

**Was Stress mit deinem Körper macht:**

**Kurzfristig:**
• Herzschlag beschleunigt
• Atmung wird schneller
• Muskeln spannen sich an
• Verdauung wird verlangsamt
• Fokus wird schärfer

**Langfristig (chronisch):**
❗ Herz-Kreislauf-Probleme
❗ Schwächeres Immunsystem
❗ Verdauungsprobleme
❗ Schlafstörungen
❗ Konzentrationsprobleme
❗ Angst & Depression
❗ Burnout

**Stresssignale erkennen:**

**Körperlich:**
• Kopfschmerzen
• Verspannungen
• Magenprobleme
• Erschöpfung
• Schlafprobleme

**Emotional:**
• Reizbarkeit
• Angst
• Überforderung
• Stimmungsschwankungen

**Behavioral:**
• Rückzug
• Prokrastination
• Mehr Koffein/Alkohol
• Weniger Selbstfürsorge

**Kognitiv:**
• Gedankenkreisen
• Konzentrationsprobleme
• Vergesslichkeit
• Negativität

**Das Stress-Tagebuch:**

Führe 1 Woche lang:
1. Was waren deine Stressoren?
2. Wie hast du reagiert?
3. Was hat geholfen?
4. Was hat nicht geholfen?

Erkenne Muster!

**5 Säulen der Stressbewältigung:**

**1. Problemlösendes Coping** 🎯
Ändere die Situation

• Identifiziere das Problem
• Brainstorme Lösungen
• Wähle und handle
• Evaluiere

**2. Emotionales Coping** 💙
Ändere deine Reaktion

• Akzeptanz üben
• Perspektive wechseln
• Bedeutung finden
• Humor nutzen

**3. Physiologische Entspannung** 🧘‍♀️
Beruhige den Körper

• Atemübungen (täglich!)
• Progressive Muskelentspannung
• Meditation
• Yoga

**4. Lebensstil-Optimierung** 🌱
Stärke deine Ressourcen

• 7-9 Stunden Schlaf
• Regelmäßige Bewegung
• Gesunde Ernährung
• Soziale Kontakte
• Hobbys & Freude

**5. Grenzen setzen** 🛑
Schütze deine Energie

• Lerne "Nein" zu sagen
• Priorisiere wichtige Dinge
• Delegiere, wo möglich
• Plane Pausen ein

**Schnelle Stress-Stopper (für akute Situationen):**

1. **4-7-8 Atmung** (2 Min.)
2. **Kaltes Wasser** ins Gesicht
3. **5-4-3-2-1 Grounding**
4. **Kurzer Spaziergang** (5 Min.)
5. **Lieblingslied** hören
6. **Jemanden anrufen**

**Langfristige Stress-Resilienz aufbauen:**

✅ **Täglich:**
• 10 Min. Meditation
• 30 Min. Bewegung
• Achtsamkeit praktizieren

✅ **Wöchentlich:**
• Quality Time mit Freunden/Familie
• Hobby oder kreative Aktivität
• Natur-Zeit
• Rückblick & Planung

✅ **Monatlich:**
• Selbstreflexion
• Ziele überprüfen
• Erfolge feiern

**Wann professionelle Hilfe suchen?**

🚨 Wenn:
• Stress dein Leben stark beeinträchtigt
• Du Panikattacken hast
• Schlaf dauerhaft gestört ist
• Du dich hoffnungslos fühlst
• Substanzen zur Bewältigung nutzt

**Wichtig:**

Stress ist nicht der Feind. Es ist dein UMGANG damit, der zählt!

Du hast mehr Kontrolle, als du denkst. Fang klein an - selbst winzige Veränderungen machen einen Unterschied. 🌟`,
    },
    {
      id: 6,
      title: "Gesunde Grenzen setzen",
      icon: "shield-checkmark",
      iconType: "Ionicons",
      color: "#2ecc71",
      category: "Zwischenmenschliche Gesundheit",
      readTime: "4 Min.",
      summary: "Warum Grenzen wichtig sind und wie man sie kommuniziert",
      content: `Grenzen zu setzen ist kein Egoismus - es ist Selbstrespekt und die Basis für gesunde Beziehungen.

**Was sind Grenzen?**

Grenzen sind die Limits, die du setzt, um:
• Deine Energie zu schützen
• Deine Werte zu wahren
• Deine Bedürfnisse zu erfüllen
• Dein Wohlbefinden zu sichern

**Arten von Grenzen:**

**1. Physische Grenzen** 🤚
• Persönlicher Raum
• Körperliche Berührung
• Privatsphäre

**2. Emotionale Grenzen** 💙
• Was du teilst
• Wie viel du mitfühlst
• Verantwortung für Gefühle anderer

**3. Zeitliche Grenzen** ⏰
• Verfügbarkeit
• Prioritäten
• Pausen & Erholung

**4. Mentale Grenzen** 🧠
• Deine Meinungen & Werte
• Respekt für deine Gedanken
• Recht, anderer Meinung zu sein

**5. Materielle Grenzen** 💰
• Geld leihen/schenken
• Besitz teilen
• Finanzielle Hilfe

**Warum fällt Grenzen setzen schwer?**

❌ "Ich will nicht unhöflich sein"
❌ "Sie werden enttäuscht sein"
❌ "Ich sollte helfen können"
❌ "Sie werden mich nicht mehr mögen"
❌ "Ich fühle mich schuldig"

**Die Wahrheit:**

✓ Grenzen sind nicht unhöflich, sondern ehrlich
✓ Du bist nicht verantwortlich für die Gefühle anderer
✓ "Nein" zu anderen ist "Ja" zu dir selbst
✓ Wer dich nur mag, wenn du keine Grenzen hast, respektiert dich nicht
✓ Kurze Schuld ist besser als langfristiger Groll

**Zeichen, dass du mehr Grenzen brauchst:**

🚩 Ständige Erschöpfung
🚩 Groll gegenüber anderen
🚩 Übernahme von Verantwortung, die nicht deine ist
🚩 Gefühl, ausgenutzt zu werden
🚩 Wenig Zeit für dich selbst
🚩 Schwierigkeiten, "Nein" zu sagen
🚩 Beziehungen fühlen sich einseitig an

**Wie setze ich gesunde Grenzen?**

**1. Kenne deine Grenzen** 📝

Frage dich:
• Was ist mir wichtig?
• Was macht mich unwohl?
• Was brauche ich, um mich gut zu fühlen?
• Wo fühle ich mich überfordert?

**2. Kommuniziere klar & direkt** 💬

Formel: **"Ich + Gefühl + Grenze + Grund (optional)"**

Beispiele:
• "Ich kann heute Abend nicht, ich brauche Zeit für mich."
• "Ich fühle mich unwohl, wenn du unangekündigt vorbeikommst."
• "Ich möchte nicht über meine Beziehung sprechen."

**NICHT:**
❌ "Vielleicht..." (unklar)
❌ Ausreden erfinden (unehrlich)
❌ Überentschuldigen (schwächt die Grenze)

**3. Sei konsistent** 🎯

• Bleib bei deinen Grenzen
• Konsequenzen setzen, wenn nötig
• Wiederhole dich, wenn die Grenze ignoriert wird

**4. Bereite dich auf Widerstand vor** 💪

Mögliche Reaktionen:
• Schuldgefühle einreden
• Beleidigt sein
• Diskutieren
• Manipulieren

Deine Antwort:
• Bleib ruhig
• Wiederhole deine Grenze
• Du musst dich nicht rechtfertigen
• Es ist ok, das Gespräch zu beenden

**Praktische Beispiele:**

**Situation 1: Kolleg:in bittet ständig um Hilfe**

❌ "Ja, okay..." (und innerlich seufzen)

✅ "Heute kann ich nicht helfen. Ich habe meine eigenen Deadlines. Vielleicht kann [Name] helfen?"

**Situation 2: Familie erwartet ständige Verfügbarkeit**

❌ Immer erreichbar sein (und ausgebrannt werden)

✅ "Ich bin zwischen 10-12 Uhr erreichbar. Außer Notfällen antworte ich später."

**Situation 3: Freund:in lädt letzte Minute ein**

❌ Eigene Pläne absagen (und sich ärgern)

✅ "Das klingt toll, aber ich habe schon etwas geplant. Lass uns für nächste Woche was ausmachen!"

**Situation 4: Jemand teilt zu viel Negatives**

❌ Emotional überfordert sein

✅ "Ich merke, dass mich das gerade überfordert. Können wir das Thema wechseln?"

**Die "Broken Record" Technik:**

Bei hartnäckigem Druck:
1. Wiederhole deine Grenze ruhig
2. Ohne neue Erklärungen
3. Ohne zu diskutieren

Beispiel:
"Ich kann nicht." - "Aber warum?" - "Ich kann nicht." - "Nur dieses eine Mal!" - "Ich kann nicht."

**Grenzen mit Empathie:**

Du kannst freundlich UND klar sein:

"Ich verstehe, dass das wichtig für dich ist. Gleichzeitig ist das nicht etwas, was ich tun kann/möchte."

**Wichtig zu wissen:**

• Grenzen setzen wird mit Übung leichter
• Anfangs kann es sich komisch anfühlen - das ist normal
• Menschen, die dich respektieren, werden deine Grenzen akzeptieren
• Du darfst deine Grenzen ändern, wenn sich deine Bedürfnisse ändern
• "Nein" ist ein vollständiger Satz (du musst dich nicht rechtfertigen)

**Selbstfürsorge ist kein Luxus, sondern Notwendigkeit:**

Wenn du keine Grenzen setzt, werden andere das für dich tun - und nicht in deinem Interesse.

Starte klein: Setze HEUTE eine kleine Grenze. Du hast das Recht dazu! 🌟`,
    },
  ];

  const openArticle = (article) => {
    setSelectedArticle(article);
  };

  const closeArticle = () => {
    setSelectedArticle(null);
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScreenHeader
          title="🎓 Psycho-Edukation"
          subtitle="Wissen für mentale Gesundheit"
        />

        <View style={styles.introCard}>
          <Ionicons name="school-outline" size={28} color="#007aff" />
          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>Willkommen zur Psycho-Edukation</Text>
            <Text style={styles.introText}>
              Lerne wissenschaftlich fundierte Konzepte über mentale Gesundheit, Emotionen und
              Bewältigungsstrategien. Wissen ist der erste Schritt zur Veränderung.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Artikel & Ressourcen</Text>
          <Text style={styles.sectionSubtitle}>Kurze Artikel zu wichtigen Themen</Text>

          {educationCards.map((card, index) => (
            <MotiView
              key={card.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: index * 100, type: "timing", duration: 500 }}
            >
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => openArticle(card)}
              >
                <View style={[styles.iconContainer, { backgroundColor: card.color + "15" }]}>
                  {card.iconType === "MaterialCommunityIcons" ? (
                    <MaterialCommunityIcons name={card.icon} size={28} color={card.color} />
                  ) : (
                    <Ionicons name={card.icon} size={28} color={card.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.category}>{card.category}</Text>
                    <Text style={styles.readTime}>{card.readTime}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSummary}>{card.summary}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#ccc" />
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Info Box */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 700, type: "timing", duration: 600 }}
          style={styles.infoBox}
        >
          <MaterialCommunityIcons name="information-outline" size={24} color="#007aff" />
          <Text style={styles.infoText}>
            Diese Inhalte basieren auf wissenschaftlichen Erkenntnissen der Psychologie und
            Psychotherapie. Sie ersetzen keine professionelle Beratung oder Therapie.
          </Text>
        </MotiView>
      </ScrollView>

      {/* Article Modal */}
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={closeArticle}
      >
        <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
          <ScrollView style={styles.articleModal}>
            <View style={styles.articleHeader}>
              <TouchableOpacity style={styles.backButton} onPress={closeArticle}>
                <Ionicons name="arrow-back" size={28} color="#007aff" />
              </TouchableOpacity>

              <View
                style={[
                  styles.articleIconContainer,
                  { backgroundColor: selectedArticle?.color + "15" },
                ]}
              >
                {selectedArticle?.iconType === "MaterialCommunityIcons" ? (
                  <MaterialCommunityIcons
                    name={selectedArticle?.icon}
                    size={40}
                    color={selectedArticle?.color}
                  />
                ) : (
                  <Ionicons
                    name={selectedArticle?.icon}
                    size={40}
                    color={selectedArticle?.color}
                  />
                )}
              </View>

              <Text style={styles.articleCategory}>{selectedArticle?.category}</Text>
              <Text style={styles.articleTitle}>{selectedArticle?.title}</Text>
              <Text style={styles.articleReadTime}>📖 {selectedArticle?.readTime} Lesezeit</Text>
            </View>

            <View style={styles.articleContent}>
              <Text style={styles.articleText}>{selectedArticle?.content}</Text>
            </View>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: selectedArticle?.color }]}
              onPress={closeArticle}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.doneButtonText}>Fertig gelesen</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  settingsButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 25,
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  introCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#007aff",
  },
  introTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  introText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  section: {
    width: "100%",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: "100%",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    color: "#007aff",
    textTransform: "uppercase",
  },
  readTime: {
    fontSize: 11,
    color: "#999",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  cardSummary: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#007aff30",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
  },
  // Article Modal Styles
  articleModal: {
    flex: 1,
    paddingTop: 60,
  },
  articleHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  articleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007aff",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  articleReadTime: {
    fontSize: 14,
    color: "#666",
  },
  articleContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  articleText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 26,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginVertical: 30,
    paddingVertical: 16,
    borderRadius: 14,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 10,
  },
});
