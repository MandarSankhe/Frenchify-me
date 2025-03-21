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
const graphqlUploadExpress = require('graphql-upload').graphqlUploadExpress;
const PDFDocument = require("pdfkit");
const Donation = require("./models/Donation");
const { ApiError, CheckoutPaymentIntent, Client: PPClient, Environment, LogLevel, OrdersController } = require("@paypal/paypal-server-sdk");

const together = new Together();

// Initialize Express app
const app = express();

// Add the graphql-upload middleware
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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

// Retrieve PayPal credentials from env
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

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
}); 

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

/**
 Endpoint: /api/listening-question
 Expects { examId, questionIndex } in the request body.
 Fetches the corresponding question from TCFListening,
 uses MeloTTS via Gradio Client to convert the audioText to speech,
 and returns the audio URL along with the question text and options.
*/
app.post("/api/listening-question", async (req, res) => {
  try {
    const { examId, questionIndex } = req.body;
    if (examId === undefined || questionIndex === undefined) {
      return res.status(400).json({ error: "examId and questionIndex are required." });
    }
    const TCFListening = require("./models/TCFListeningTraining");
    const exam = await TCFListening.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (questionIndex < 0 || questionIndex >= exam.questions.length) {
      return res.status(400).json({ error: "Invalid question index." });
    }
    const question = exam.questions[questionIndex];
    const fullText = question.audioText;
    // Use MeloTTS via Gradio Client (reuse similar logic as in /api/initial-question)
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
      text: fullText,
      speaker: selectedSpeaker,
      speed: 1,
      language: "FR",
    });
    console.log("Converting audio response...", ttsResponse);
    res.json({
      audio: ttsResponse,
      questionText: question.questionText,
      options: question.options,
    });
  } catch (error) {
    console.error("Error in listening question endpoint:", error);
    res.status(500).json({ error: "Failed to generate listening question." });
  }
});


app.post("/api/mock-listening-question", async (req, res) => {
  try {
    const { examId, passageIndex, questionIndex } = req.body;
    if (examId === undefined || passageIndex === undefined || questionIndex === undefined) {
      return res.status(400).json({ error: "examId, passageIndex, and questionIndex are required." });
    }
    // Use the new model for TCF mock listening exam
    const TCFListening = require("./models/TCFListening");
    const exam = await TCFListening.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (passageIndex < 0 || passageIndex >= exam.passages.length) {
      return res.status(400).json({ error: "Invalid passage index." });
    }
    const passage = exam.passages[passageIndex];
    if (questionIndex < 0 || questionIndex >= passage.questions.length) {
      return res.status(400).json({ error: "Invalid question index." });
    }
    const question = passage.questions[questionIndex];
    // For the audio, we use the passage text (the spoken content)
    const fullText = passage.passageText;
    // Use MeloTTS via Gradio Client (similar to /api/initial-question)
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
      text: fullText,
      speaker: selectedSpeaker,
      speed: 1,
      language: "FR",
    });
    console.log("Converting audio response...", ttsResponse);
    res.json({
      audio: ttsResponse,
      questionText: question.questionText,
      options: question.options,
    });
  } catch (error) {
    console.error("Error in mock listening question endpoint:", error);
    res.status(500).json({ error: "Failed to generate mock listening question." });
  }
});

// Create a PayPal client (using Sandbox)
const paypalClient = new PPClient({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment: Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: { logBody: true },
    logResponse: { logHeaders: true },
  },
});

// Create the OrdersController instance
const ordersController = new OrdersController(paypalClient);

/**
 * Create a PayPal order. TODO
 * Here, "cart" can be used to compute the order details.
 * For now, it returns a static order with an amount of USD 100.00.
 */
const createOrder = async (cart) => {
  const orderRequest = {
    body: {
      intent: CheckoutPaymentIntent.CAPTURE,
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: "100.00",
          },
        },
      ],
    },
    prefer: "return=minimal",
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersCreate(orderRequest);
    return {
      jsonResponse: JSON.parse(body),
      httpStatusCode: httpResponse.statusCode,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
  }
};


// Capture a PayPal order after approval
const captureOrder = async (orderID) => {
  const captureRequest = {
    id: orderID,
    prefer: "return=minimal",
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersCapture(captureRequest);
    return {
      jsonResponse: JSON.parse(body),
      httpStatusCode: httpResponse.statusCode,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Error(error.message);
    }
  }
};

// PayPal integration
app.post("/api/orders", async (req, res) => {
  try {
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

// Capture PayPal order
app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to capture order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

// Generate invoice
app.get("/api/invoice/:donationId", async (req, res) => {
  try {
    const { donationId } = req.params;
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ error: "Donation not found." });
    }

    // Set response headers for PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${donation.invoiceNumber}.pdf`);

    // Create a PDF document and pipe it to the response
    const doc = new PDFDocument();
    doc.pipe(res);

    // Design your invoice PDF
    doc.fontSize(20).text("Donation Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice Number: ${donation.invoiceNumber}`);
    doc.text(`Date: ${new Date(donation.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    doc.text(`Donor Name: ${donation.fullName}`);
    doc.text(`Email: ${donation.email}`);
    doc.moveDown();

    doc.text(`Donation Amount: $${donation.amount.toFixed(2)}`);
    if (donation.message) {
      doc.moveDown();
      doc.text(`Message: ${donation.message}`);
    }

    doc.moveDown();
    doc.text("Thank you for your donation!", { align: "center" });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({ error: "Failed to generate invoice PDF." });
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