import { OPENAI_API_KEY } from "@env";
console.log("Geladener API-Key:", OPENAI_API_KEY ? "gefunden ✅" : "FEHLT ❌");

// Pseudo-Streaming-Funktion für Chat (React Native kompatibel)
// Holt die komplette Antwort und zeigt sie dann Wort-für-Wort an
export async function getAiResponseStreaming(userEmotion, userText, onChunk) {
  try {
    // Hole komplette Antwort ohne Streaming (React Native unterstützt kein response.body.getReader())
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Du bist der 'Zwangsgedanken Helfer', ein spezialisierter Coach für Menschen mit Zwangsgedanken und OCD (Zwangsstörung). Duze den Nutzer immer.\n\n" +
              "DEINE AUFGABE:\n" +
              "- Hilf dem Nutzer, Zwangsgedanken zu verstehen und mit ihnen umzugehen\n" +
              "- Fokussiere auf ERP (Expositions- und Reaktionsverhinderung)\n" +
              "- Unterstütze bei ACT-Techniken (Akzeptanz, Defusion)\n" +
              "- Helfe, Unsicherheit auszuhalten statt sie zu eliminieren\n\n" +
              "WICHTIG - Was du NICHT tun darfst:\n" +
              "❌ NIEMALS Beruhigung geben wie 'Das ist bestimmt nicht so' oder 'Das wird nicht passieren'\n" +
              "❌ NIEMALS Gedanken als irrational abtun oder wegreden\n" +
              "❌ NIEMALS zur Kompulsion ermutigen (Checking, Googeln, Fragen)\n\n" +
              "STATTDESSEN:\n" +
              "✅ Erkenne den Gedanken an ohne zu bewerten\n" +
              "✅ Helfe bei Defusion: 'Das ist nur ein Gedanke, kein Fakt'\n" +
              "✅ Fördere Unsicherheitstoleranz: 'Kannst du mit diesem Vielleicht leben?'\n" +
              "✅ Ermutige zu ERP: Dem Drang zu widerstehen\n" +
              "✅ Normalisiere: Jeder hat seltsame Gedanken\n\n" +
              "Antworte empathisch, klar und therapeutisch fundiert.",
          },
          {
            role: "user",
            content: `Kontext: ${userEmotion}\n\nNachricht: ${userText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
        stream: false, // Kein echtes Streaming in React Native
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.choices || data.choices.length === 0) {
      throw new Error("Keine Antwort von OpenAI erhalten");
    }

    const fullText = data.choices[0].message.content.trim();

    // Pseudo-Streaming: Zeige Text Wort-für-Wort an
    const words = fullText.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      onChunk(currentText);

      // Kleines Delay für Streaming-Effekt (schneller als Tippen, aber sichtbar)
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    return fullText;
  } catch (error) {
    console.error("Streaming Error:", error);
    throw error;
  }
}

export async function getAiResponse(userEmotion, userText) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // falls du Zugriff hast, sonst gpt-3.5-turbo
        messages: [
          {
            role: "system",
            content:
              "Du bist der 'Zwangsgedanken Helfer', ein spezialisierter Coach für Menschen mit Zwangsgedanken und OCD (Zwangsstörung). Duze den Nutzer immer.\n\n" +
              "DEINE AUFGABE:\n" +
              "- Hilf dem Nutzer, Zwangsgedanken zu verstehen und mit ihnen umzugehen\n" +
              "- Fokussiere auf ERP (Expositions- und Reaktionsverhinderung)\n" +
              "- Unterstütze bei ACT-Techniken (Akzeptanz, Defusion)\n" +
              "- Helfe, Unsicherheit auszuhalten statt sie zu eliminieren\n\n" +
              "WICHTIG - Was du NICHT tun darfst:\n" +
              "❌ NIEMALS Beruhigung geben wie 'Das ist bestimmt nicht so' oder 'Das wird nicht passieren'\n" +
              "❌ NIEMALS Gedanken als irrational abtun oder wegreden\n" +
              "❌ NIEMALS zur Kompulsion ermutigen (Checking, Googeln, Fragen)\n\n" +
              "STATTDESSEN:\n" +
              "✅ Erkenne den Gedanken an ohne zu bewerten\n" +
              "✅ Helfe bei Defusion: 'Das ist nur ein Gedanke, kein Fakt'\n" +
              "✅ Fördere Unsicherheitstoleranz: 'Kannst du mit diesem Vielleicht leben?'\n" +
              "✅ Ermutige zu ERP: Dem Drang zu widerstehen\n" +
              "✅ Normalisiere: Jeder hat seltsame Gedanken\n\n" +
              "Antworte empathisch, klar und therapeutisch fundiert.",
          },
          {
            role: "user",
            content: `Ich fühle mich ${userEmotion}. Meine Gedanken: ${userText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200, // <--- erhöhtes Limit (vorher 150!)
      }),
    });

    const data = await response.json();
    console.log("OpenAI Antwort:", data);

    if (data?.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else if (data?.error) {
      console.error("OpenAI API Error:", data.error);
      return `Fehler von OpenAI: ${data.error.message}`;
    } else {
      return "Keine Antwort erhalten 😕";
    }
  } catch (error) {
    console.error("OpenAI API Fehler:", error);
    return "Es gab ein Problem beim Abrufen der KI-Antwort 😕";
  }
}
