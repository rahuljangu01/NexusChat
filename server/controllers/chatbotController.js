// server/controllers/chatbotController.js (FINAL FREE VERSION - NO BILLING)

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Yeh .env file se seedhe GEMINI_API_KEY utha lega
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const handleMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Hum Google AI Studio ka model use kar rahe hain, jiske liye billing nahi chahiye
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
    });

    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: "You are Nexus AI..." }] },
            { role: "model", parts: [{ text: "Got it! I'm Nexus AI..." }] },
        ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0 || !response.text()) {
        return res.json({ reply: "I can't respond to that. Let's talk about something else!" });
    }

    const text = response.text();
    res.json({ reply: text });

  } catch (error) {
    console.error("Error with Google AI Studio API:", error);
    res.status(500).json({ error: "Sorry, I'm having trouble thinking right now. Please try again later." });
  }
};

module.exports = {
  handleMessage,
};