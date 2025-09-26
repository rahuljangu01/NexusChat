// server/test-gemini.js

// Load environment variables from the .env file in the same directory
require('dotenv').config(); 

const { GoogleGenerativeAI } = require("@google/generative-ai");

// This will read the GEMINI_API_KEY from your server/.env file
const apiKey = process.env.GEMINI_API_KEY;

// --- Step 1: Check if the API key is loaded ---
console.log("--- Starting Gemini Test Script ---");
if (!apiKey) {
    console.error("!!! ERROR: GEMINI_API_KEY not found in .env file.");
    console.log("Please make sure your server/.env file contains the line: GEMINI_API_KEY=YOUR_KEY_HERE");
    return; // Stop the script
}
console.log("API Key loaded successfully!");

// --- Step 2: Initialize the AI Client ---
const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
    try {
        console.log("Initializing model 'gemini-pro'...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("Sending prompt 'Hello, world!' to the model...");
        const prompt = "Hello, world!";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // --- Step 3: Check the result ---
        console.log("\n--- SUCCESS! ---");
        console.log("Gemini API responded successfully.");
        console.log("Response:", text);

    } catch (error) {
        // --- Step 4: If it fails, show the exact error ---
        console.error("\n--- FAILED! ---");
        console.error("The test script failed to get a response from Google Gemini.");
        console.error("Full Error Details:", error);
    }
}

runTest();