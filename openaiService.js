import { OPENAI_API_KEY } from "@env";
console.log("Geladener API-Key:", OPENAI_API_KEY ? "gefunden ✅" : "FEHLT ❌");

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
