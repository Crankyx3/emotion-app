import { OPENAI_API_KEY } from "@env";
console.log("Geladener API-Key:", OPENAI_API_KEY ? "gefunden ✅" : "FEHLT ❌");

// Streaming-Funktion für Chat (zeigt Antwort Wort für Wort)
export async function getAiResponseStreaming(userEmotion, userText, onChunk) {
  try {
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
        stream: true, // Aktiviere Streaming
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(fullText); // Callback mit aktuellem Text
            }
          } catch (e) {
            // Parsing-Fehler ignorieren
          }
        }
      }
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
