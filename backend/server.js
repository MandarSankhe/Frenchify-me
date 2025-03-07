const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const { loadFilesSync } = require("@graphql-tools/load-files");
const { mergeTypeDefs } = require("@graphql-tools/merge");
const { HfInference } = require("@huggingface/inference");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const {Together} =  require("together-ai");
const multer = require("multer");
const hfApi = process.env.HF_API;
const TCFSpeaking = require("./models/TCFSpeaking");

const together = new Together();

// Initialize Express app
const app = express();
// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({}));

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configure Gradio Client
let Client;
async function loadGradioClient() {
  if (!Client) {
    const gradioModule = await import("@gradio/client");
    Client = gradioModule.Client;
  }
}


// Route for generating feedback #20Feb2024
app.post("/generate-feedback", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      model: "meta-llama/Llama-Vision-Free",
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stop: ["<|eot_id|>", "<|eom_id|>"],
      stream: true
    });
    
    // Accumulate tokens into a string
    let feedback = "";
    for await (const token of response) {
      feedback += token.choices[0]?.delta?.content;
    }
    res.json({ feedback : feedback.replace(/\n/g, "<br>") });
    
  } catch (error) {
    console.error("Error with Together AI API:", error);
    res.status(500).json({ error: "Failed to generate feedback." });
  }
});

/**
 * Endpoint: /api/initial-question
 * Expects { topic, questionNumber } in the request body.
 * Looks up the main question for the given topic and question number from TCFSpeaking,
 * prepends the topic info, converts it to speech using MeloTTS, and returns both text and audio.
 */
app.post("/api/initial-question", async (req, res) => {
  try {
    const { topic, questionNumber } = req.body;
    if (!topic || !questionNumber) {
      return res.status(400).json({ error: "Topic and questionNumber are required." });
    }
    const speakingTopic = await TCFSpeaking.findOne({ topic: topic });
    if (!speakingTopic) {
      return res.status(404).json({ error: "Topic not found." });
    }
    let question;
    let fullQuestion;
    if (questionNumber === 1) {
      question = speakingTopic.mainQuestion1;
      fullQuestion = `Vous avez choisi le sujet "${topic}". ${question}`;
    } else if (questionNumber === 2) {
      question = speakingTopic.mainQuestion2;
      fullQuestion = `Prochaine question pour le sujet "${topic}". ${question}`;
    } else if (questionNumber === 3) {
      question = speakingTopic.mainQuestion3;
      fullQuestion = `Prochaine question pour le sujet "${topic}". ${question}`;
    } else {
      return res.status(400).json({ error: "Invalid question number." });
    }
    // Use MeloTTS via Gradio Client for TTS
    await loadGradioClient();
    const melottsClient = await Client.connect("mrfakename/MeloTTS");
    const speakers = await melottsClient.predict("/load_speakers", {
      language: "FR",
      text: "Bonjour!",
    });
    if (!speakers || speakers.length === 0) {
      throw new Error("No valid speakers found for MeloTTS.");
    }
    const selectedSpeaker = speakers.data[0]?.value;
    if (!selectedSpeaker) {
      throw new Error("No valid speakers found for MeloTTS.");
    }
    const ttsResponse = await melottsClient.predict("/synthesize", {
      text: fullQuestion,
      speaker: selectedSpeaker,
      speed: 1,
      language: "FR",
    });
    res.json({ question: fullQuestion, audio: ttsResponse });
  } catch (error) {
    console.error("Error in initial question:", error);
    res.status(500).json({ error: "Failed to generate initial question." });
  }
});

/**
 * Endpoint: /api/speech-to-text
*/
app.post("/api/speech-to-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    if (!req.file.mimetype.includes("audio")) {
      return res.status(400).json({ error: "Invalid file type. Please upload an audio file." });
    }

    const client = new HfInference(hfApi);
    const audioBuffer = req.file.buffer;

    const result = await client.automaticSpeechRecognition({
      data: audioBuffer,
      model: "openai/whisper-large-v3-turbo",
      language: "fr"
    });

    if (result.text) {
      res.json({ text: result.text });
    } else {
      res.status(500).json({ error: "Failed to transcribe audio." });
    }
  } catch (error) {
    console.error("Error with Hugging Face API:", error);
    res.status(500).json({ error: "Failed to process the audio." });
  }
}); // /Users/rachna/Desktop/bonjour.m4a

/**
 * Endpoint: /api/ai-response-to-speech
 * Expects { prompt, topic, questionNumber, followupCount }.
 * Constructs a prompt that provides concise feedback (max 2 lines) and always ends with a follow-up question.
 * The prompt is tailored by topic and difficulty (based on followupCount).
 */
app.post("/api/ai-response-to-speech", async (req, res) => {
  try {
    const { prompt, topic, questionNumber, followupCount } = req.body;
    // Determine difficulty level based on followupCount
    let difficulty;
    if (followupCount <= 3) {
      difficulty = "basic";
    } else if (followupCount <= 6) {
      difficulty = "intermediate";
    } else {
      difficulty = "advanced";
    }
    const feedbackPrompt = `Vous êtes un examinateur de français TEF/TCF. Le sujet est : "${topic}". Pour la réponse suivante : "${prompt}",
Fournissez un retour concis en deux lignes maximum, sans mentionner que la réponse est floue si elle est claire. Terminez toujours par une question de suivi relative à ce sujet. Le niveau de difficulté est ${difficulty}.`;

    await loadGradioClient();
    const response = await together.chat.completions.create({
      messages: [{ role: "system", content: feedbackPrompt }],
      model: "meta-llama/Llama-Vision-Free",
      max_tokens: 200,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stop: ["<|eot_id|>", "<|eom_id|>"],
      stream: true,
    });
    let feedback = "";
    for await (const token of response) {
      feedback += token.choices[0]?.delta?.content;
    }
    const aiText = feedback.replace(/\n/g, " ...").replace(/undefined/g, "").trim();
    if (!aiText) {
      throw new Error("AI generated an invalid response.");
    }
    // Placeholder for scoring logic:
    // let updatedScore = computeScore(...);
    const client = await Client.connect("mrfakename/MeloTTS");
    const speakers = await client.predict("/load_speakers", {
      language: "FR",
      text: "Bonjour!",
    });
    if (!speakers || speakers.length === 0) {
      throw new Error("No valid speakers found for MeloTTS.");
    }
    const selectedSpeaker = speakers.data[0]?.value;
    if (!selectedSpeaker) {
      throw new Error("No valid speakers found for MeloTTS.");
    }
    const ttsResponse = await client.predict("/synthesize", {
      text: aiText,
      speaker: selectedSpeaker,
      speed: 1,
      language: "FR",
    });
    console.log("Converting audio response...");
    res.json({ response: aiText, audio: ttsResponse /*, score: updatedScore */ });
  } catch (error) {
    console.error("Error with MeloTTS API:", error);
    res.status(500).json({ error: "Failed to generate AI speech." });
  }
});

// Load and merge GraphQL schema files
const typesArray = loadFilesSync(path.join(__dirname, "./schema"), {
  extensions: ["graphql"]
});
const typeDefs = mergeTypeDefs(typesArray);


async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers: require("./resolvers/resolvers")
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;

  let isConnected;
  async function connectToDatabase() {
    if (isConnected) return;
    try {
      const db = await mongoose.connect(process.env.MONGO_URI, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds if connection fails
      });
      isConnected = db.connections[0].readyState;
      console.log("Connected to MongoDB successfully!");
    } catch (err) {
      console.error("Error connecting to MongoDB:", err);
      throw err;
    }
  }
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => console.log(err));