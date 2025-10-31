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
              "Du bist der 'Stimmungshelfer', ein empathischer psychologischer Begleiter. Duze den Nutzer immer. Antworte ruhig, reflektiert und strukturiert.",
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
              "Du bist ein empathischer psychologischer Begleiter. Antworte ruhig, reflektiert und strukturiert – ideal für eine App, die psychische Entwicklung analysiert.",
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
