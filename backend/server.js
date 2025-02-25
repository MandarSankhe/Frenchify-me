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

const together = new Together();

// Initialize Express app
const app = express();
// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({}));

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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
 * This endpoint generates the very first interview question.
 * It instructs the AI (via a system prompt) that it is a software developer interviewer.
 * It then converts the text to speech using a Hugging Face TTS model.
 */
app.post("/api/initial-question", async (req, res) => {
  try {
     const client = new HfInference(hfApi);
    // // Generate the initial interview question with instructions
    // const chatCompletion = await client.chatCompletion({
    //   model: "Qwen/Qwen2.5-Coder-32B-Instruct",
    //   messages: [
    //     { role: "system", 
    //       content: "You are a software developer interviewer. Ask your very first Job interview question to start the interview. Start with basic personal questions like professional interview" }
    //   ],
    //   provider: "nebius",
    //   max_tokens: 200,
    // });
    // const question = chatCompletion.choices[0].message.content;

    const response = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an IELTS speaking test examiner. Ask your first question as if you are conducting the IELTS Speaking Test. Start with typical introductory questions used in Part 1 of the exam."
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
    
    const question = feedback.replace(/\n/g, " ...");
    console.log("completed first part ", question);

    // Convert the question to speech using a TTS model
    // (Assuming that client.textToSpeech returns a Buffer)
    const ttsResult = await client.textToSpeech({
      model: "espnet/kan-bayashi_ljspeech_vits", // Use an appropriate TTS model
      inputs: question.replace("undefined", " ..."),
    });
    // Convert Blob to ArrayBuffer then to Buffer
    const arrayBuffer = await ttsResult.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString("base64");


    res.json({ question, audio: audioBase64 });
  } catch (error) {
    console.error("Error generating initial question:", error);
    res.status(500).json({ error: "Failed to generate initial question." });
  }
});

/**
 * Endpoint: /api/ai-response
 * Modified to include a system instruction for a software developer interview.
 * It now converts the AI’s response to speech.
 */
app.post("/api/ai-response", async (req, res) => {
  try {
    const { prompt } = req.body;
    const client = new HfInference(hfApi);
    // const chatCompletion = await client.chatCompletion({
    //   model: "Qwen/Qwen2.5-Coder-32B-Instruct",
    //   messages: [
    //     { role: "system", content: "You are a software developer interviewer. After the candidate answers, ask a follow-up question related to their answer." },
    //     { role: "user", content: prompt }
    //   ],
    //   provider: "nebius",
    //   max_tokens: 350,
    // });
    // const aiText = chatCompletion.choices[0].message.content;
    

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
    const aiText = feedback.replace(/\n/g, " ...");

    // Convert AI text to speech
    const ttsResult = await client.textToSpeech({
      model: "espnet/kan-bayashi_ljspeech_vits",
      inputs: aiText.replace("undefined", " ..."),
    });
    const arrayBuffer = await ttsResult.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString("base64");

    res.json({ response: aiText, audio: audioBase64 });
  } catch (error) {
    console.error("Error with Hugging Face API:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

/**
 * Endpoint: /api/speech-to-text
 * (Unchanged)
 */
app.post("/api/speech-to-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const client = new HfInference(hfApi);
    const audioBuffer = req.file.buffer;

    if (!req.file.mimetype.includes("audio")) {
      return res.status(400).json({ error: "Invalid file type. Please upload an audio file." });
    }

    const result = await client.automaticSpeechRecognition({
      data: audioBuffer,
      model: "openai/whisper-large-v3-turbo",
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
});

//#20Feb2024

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