// server/controllers/chatbotController.js (UPDATED WITH DEBUGGING)

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Google Gemini with your API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const handleMessage = async (req, res) => {
  // <<< --- DEBUGGING STEP 1 --- >>>
  // Check if the API key is being loaded correctly from your .env file.
  console.log("--- New Chatbot Request ---");
  console.log("Attempting to use Gemini API Key:", process.env.GEMINI_API_KEY ? "Key Found!" : "ERROR: KEY NOT FOUND / UNDEFINED");

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: "You are Nexus AI, a helpful and friendly assistant integrated into the Nexus Chat application for college students. Keep your responses concise, helpful, and slightly informal." }],
            },
            {
                role: "model",
                parts: [{ text: "Got it! I'm Nexus AI, ready to help the students of this college. How can I assist you today?" }],
            },
        ],
    });

    const result = await chat.sendMessage(message);
    const botResponse = await result.response;
    const text = botResponse.text();
    
    console.log("Successfully got a reply from Gemini:", text);
    res.json({ reply: text });

  } catch (error) {
    // <<< --- DEBUGGING STEP 2 --- >>>
    // Log the FULL error from Google's library to see the real problem.
    console.error("!!! FULL ERROR FROM GOOGLE GEMINI API:", error);
    res.status(500).json({ error: "Sorry, I'm having trouble thinking right now. Please try again later." });
  }
};

module.exports = {
  handleMessage,
};