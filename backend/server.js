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
//app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

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

// Remove "/prod" from the URL if present (workaround)
app.use((req, res, next) => {
  if (req.url.startsWith('/prod')) {
    req.url = req.url.slice(5); // Remove the first 5 characters, i.e. "/prod"
  }
  next();
});

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
 * Endpoint: /api/calculate-speaking-score
 * Expects { userResponses, topic, aiResponses } in the request body.
 * Constructs a prompt for the AI model to rate the provided user responses based on grammar and content.
 * The AI is instructed to return only a number (score) between 0 and 10.
 * The endpoint extracts the score from the AI response and returns it.
 */
app.post("/api/calculate-speaking-score", async (req, res) => {
  try {
    const { userResponses, topic, aiResponses } = req.body;
    if (!userResponses) {
      return res.status(400).json({ error: "userResponses are required." });
    }
    
    // Convert userResponses into a string format
    let responsesString = "";
    Object.entries(userResponses).forEach(([key, value]) => {
      responsesString += `Response ${key}: ${value}\n`;
    });

    // Build the prompt instructing the AI to rate the responses
    const ratingPrompt = `Vous êtes un examinateur de français. Évaluez les réponses du candidat en tenant compte de leur grammaire, de leur contenu, du sujet, ainsi que des retours fournis (feedback : ${aiResponses} - prendre seulment la partie après "role":"ai","text"). Si les retours indiquent une performance faible, ajustez la note en conséquence. Veuillez répondre uniquement par un nombre entre 0 et 10, sans explication. Par exemple, si vous estimez que la performance est de 5/10, répondez simplement "5".\n\nSujet : ${topic || "N/A"}\n${responsesString}`;

    // Call the Together AI model with the prompt
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: ratingPrompt
        }
      ],
      model: "meta-llama/Llama-Vision-Free",
      max_tokens: 100,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stream: true
    });
    
    // Accumulate the response tokens into a string
    let ratingText = "";
    for await (const token of response) {
      ratingText += token.choices[0]?.delta?.content;
    }
    
    // Use a regex to extract a number (score) from the response
    const match = ratingText.match(/(\d+(\.\d+)?)/);
    if (!match) {
      return res.status(500).json({ error: "Could not extract score from AI response." });
    }
    const score = parseFloat(match[1]);
    res.json({ score });
  } catch (error) {
    console.error("Error calculating speaking score:", error);
    res.status(500).json({ error: "Failed to calculate speaking score." });
  }
});

/**
 * Endpoint: /api/generate-speaking-final-feedback
 * Expects { userResponses, topic, aiResponses } in the request body.
 * Constructs a prompt for the AI model to rate the provided user responses based on grammar and content.
 * The AI is instructed to return only a feedback.
 */
app.post("/api/generate-speaking-final-feedback", async (req, res) => {
  try {
    const { userResponses, topic, aiResponses } = req.body;
    if (!userResponses) {
      return res.status(400).json({ error: "userResponses are required." });
    }
    
    // Convert userResponses into a string format
    let responsesString = "";
    Object.entries(userResponses).forEach(([key, value]) => {
      responsesString += `Response ${key}: ${value}\n`;
    });

    // Build the prompt instructing the AI to generate detailed final feedback
    const ratingPrompt = `Vous êtes un examinateur de français. Évaluez les réponses du candidat en tenant compte de leur grammaire, de leur contenu, du sujet, ainsi que des retours fournis (feedback : ${aiResponses} - prendre seulment la partie après "role":"ai","text"). En vous basant sur ces éléments, donnez un retour final détaillé et constructif pour aider le candidat à s'améliorer. Veuillez répondre uniquement par un retour pour le candidat.\n\nSujet : ${topic || "N/A"}\n${responsesString}`;

    // Call the Together AI model with the prompt
    const response = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: ratingPrompt
        }
      ],
      model: "meta-llama/Llama-Vision-Free",
      max_tokens: 200, // Increased tokens if necessary for detailed feedback
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stream: true
    });
    
    // Accumulate the response tokens into a string
    let feedbackText = "";
    for await (const token of response) {
      feedbackText += token.choices[0]?.delta?.content;
    }
    
    console.log("feedback: " + feedbackText);
    // Return the complete feedback text
    res.json({ feedback: feedbackText });
  } catch (error) {
    console.error("Error generating final feedback:", error);
    res.status(500).json({ error: "Failed to generate final feedback." });
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

    const frenchBlue = "#0055A4";
    const frenchRed = "#EF4135";
    const fadedFrenchRed = "#FF9999";

    // PDF response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${donation.invoiceNumber}.pdf`);

    // Create PDFKit doc
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // 1) Company Info + Logo
    // Load logo image from URL using arrayBuffer
    let logoBuffer;
    try {
      const logoResponse = await fetch("https://frenchify-me-6yik.vercel.app/Logo.png");
      logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
    } catch (err) {
      console.error("Logo loading error:", err);
    }

    if (logoBuffer) {
      doc.image(logoBuffer, 50, 45, { width: 90 });
    }
    doc
      .fontSize(16)
      .text("Frenchify Team", 150, 60)
      .fontSize(10)
      .text("200 University Ave W\nWaterloo, Ontario N2L 3G1", 150, 80)
      .moveDown();
      
    // 2) "DONATION INVOICE" in French Blue
    doc
      .moveDown()
      .fontSize(20)
      .fillColor(frenchBlue)
      .text("DONATION INVOICE", { align: "right" })
      .moveDown();

    // 3) Colored "Invoice no." in Bold + Red Outline
    // Capture the current Y offset
    const invoiceY = doc.y;

    // Draw an outline rectangle behind the invoice info
    doc
      .strokeColor(frenchRed)
      .lineWidth(1)
      .rect(370, invoiceY - 4, 185, 16)
      .stroke();

    // Bold + red for "Invoice no."
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(frenchRed)
      .text(`Invoice no: ${donation.invoiceNumber}`, 380, invoiceY);
    // Normal font & black color for the invoice date
    doc
      .font("Helvetica")
      .fillColor("black")
      .text(`Invoice date: ${new Date(donation.createdAt).toLocaleDateString()}`, 380, doc.y + 15)
      .moveDown();

    // 4) Donor details to the left
    //doc.moveDown(2); // Move down a bit from the invoice date
    const donorInfoX = 50; // Same as x-position for company logo
    let donorInfoY = doc.y; // Capture the current y position

    // Donor details heading
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("black")
      .text("Donor Information", donorInfoX, donorInfoY);

    // Switch back to a normal font style
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("black")
      .moveDown(0.5);

    donorInfoY = doc.y;

    // Display each donor field
    doc.text(`${donation.fullName}`, donorInfoX, donorInfoY);
    doc.text(`${donation.street}`, donorInfoX);
    doc.text(`${donation.city}, ${donation.state}`, donorInfoX);
    doc.text(`${donation.postalCode}`, donorInfoX);
    doc.text(`${donation.country}`, donorInfoX);
    doc.moveDown(0.5);
    doc.text(`Donor email: ${donation.email}`, donorInfoX);

    // 5) Table Headers
    doc.moveDown(3);
    let tableTop = doc.y;
    const tableLeft = 50;

    // Optionally color the headers in French Blue:
    doc.fontSize(10).fillColor(frenchBlue).text("QTY", tableLeft, tableTop);
    doc.text("Description", tableLeft + 50, tableTop);
    doc.text("Currency", tableLeft + 250, tableTop, { width: 90, align: "right" });
    doc.text("Amount", tableLeft + 350, tableTop, { width: 90, align: "right" });

    // Horizontal line below headers
    doc
      .moveTo(tableLeft, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // 6) Table Row(s) in black
    const rowY = tableTop + 30;
    doc.fontSize(10).fillColor("black").text("1", tableLeft, rowY); // QTY
    doc.text("Monetary Donation", tableLeft + 50, rowY); // Description
    doc.text(`USD`, tableLeft + 250, rowY, {
      width: 90,
      align: "right",
    }); // Currency
    doc.text(`$${donation.amount.toFixed(2)}`, tableLeft + 350, rowY, {
      width: 90,
      align: "right",
    }); // Amount donated

    // 7) Subtotal, Total
    const subtotalY = rowY + 30;
    doc.fillColor(fadedFrenchRed).text("Subtotal", tableLeft + 250, subtotalY, {
      width: 90,
      align: "right",
    });
    doc.text(`$${donation.amount.toFixed(2)}`, tableLeft + 350, subtotalY, {
      width: 90,
      align: "right",
    });
    
    const totalY = subtotalY + 20;
    const total = donation.amount; // Total equals donation amount since no tax
    doc.fillColor("black").text("Total (USD)", tableLeft + 250, totalY, {
      width: 90,
      align: "right",
    });
    doc.text(`$${total.toFixed(2)}`, tableLeft + 350, totalY, {
      width: 90,
      align: "right",
    });

    // Extra space before the thank you note
    doc.moveDown(2);

    // 8) Thank you note
    doc
      .fontSize(10)
      .fillColor("gray")
      .text("Thank you for your donation!", { align: "center" })
      .moveDown(1);

    // 9) Footer
    const footerY = doc.page.height - 60;
    const lineY = footerY - 10;
    const leftMargin = 50;
    const rightMargin = doc.page.width - 50;

    // Draw a red line above the footer text
    doc
      .strokeColor("red")
      .lineWidth(1)
      .moveTo(leftMargin, lineY)
      .lineTo(rightMargin, lineY)
      .stroke();

    // Footer text in two parts (partially hyperlinked):
    doc
      .fontSize(8)
      .fillColor("gray")
      .text("Frenchify Team - ", leftMargin, footerY, {
        continued: true // stay on the same line
      })
      .fillColor("blue")
      .text("Visit our website", {
        link: "https://frenchify-me-6yik.vercel.app/",
        underline: true,
        continued: false
      });

    // 10) End the PDF
    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({ error: "Failed to generate invoice PDF." });
  }
});

// endpoint for generating the transcript PDF
app.post("/api/transcript", async (req, res) => {
  try {
    const { userId, username, testHistories, writingMatches, imageMatches } = req.body;
    
    // Filter completed matches
    const completedWriting = writingMatches.filter(m => m.status === 'completed');
    const completedImage = imageMatches.filter(m => m.status === 'completed');
    
    // Calculate skill progress with original names
    const skillProgress = testHistories.reduce((acc, history) => {
      const skill = history.testModelName.replace('Tcf', '');
      acc[skill] = history.score;
      return acc;
    }, {});

    // Overall average percentage
    const totalMarks = testHistories.reduce((sum, h) => sum + h.score, 0);
    const overallPercentage = testHistories.length > 0 
      ? ((totalMarks / (testHistories.length * 10)) * 100).toFixed(1) 
      : 0;

    // Calculate H2H performance
    const calculateH2H = (matches) => matches.reduce((acc, match) => {
      const score = match.initiator.id === userId ? match.totalScore.initiator : match.totalScore.opponent;
      const opponentScore = match.initiator.id === userId ? match.totalScore.opponent : match.totalScore.initiator;
      if (score > opponentScore) acc.wins++;
      else if (score < opponentScore) acc.losses++;
      else acc.draws++;
      return acc;
    }, { wins: 0, losses: 0, draws: 0 });
    
    const writingH2H = calculateH2H(completedWriting);
    const imageH2H = calculateH2H(completedImage);

    // Set PDF headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=transcript-${username}.pdf`);

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true, // Required for multi-page handling
      layout: "portrait",
      info: {
        Title: `${username} Transcript`,
        Author: "Language Learning Platform"
      }
    });
    doc.pipe(res);

    // Styling constants
    const primaryColor = "#2A5C82";
    const secondaryColor = "#E8E8E8";
    const accentColor = "#5BA4E6";
    const marginVal = 40;
    const headerHeight = 100;

    // Pre-load watermark images
    let stampBuffer, logoWatermarkBuffer, logoHeaderBuffer;
    try {
      const stampResponse = await fetch("https://i.imgur.com/4MSkH9o.png");
      stampBuffer = Buffer.from(await stampResponse.arrayBuffer());
    } catch (err) {
      console.error("Stamp loading error:", err);
    }
    try {
      const logoResponse = await fetch("https://frenchify-me-6yik.vercel.app/Logo.png");
      const logoArrayBuffer = await logoResponse.arrayBuffer();
      logoWatermarkBuffer = Buffer.from(logoArrayBuffer);
      // Keep a copy for header usage as well
      logoHeaderBuffer = logoWatermarkBuffer;
    } catch (err) {
      console.error("Logo loading error:", err);
    }

    // --- HEADER SECTION ---
    // Draw header background
    doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);
    
    // Draw header logo (tilted)
    if (logoHeaderBuffer) {
      doc.save();
      // Tilt logo slightly (e.g., -10 degrees)
      doc.rotate(-10, { origin: [marginVal + 40, 20 + 40] });
      doc.image(logoHeaderBuffer, marginVal, 20, { width: 80 });
      doc.restore();
    }
    
    // Header text
    doc.fillColor("white")
       .fontSize(24)
       .text(`${username}'s Transcript`, marginVal, 40, { align: 'right' })
       .fontSize(12)
       .text("Official Learning Record", marginVal, 70, { align: 'right' });
    
    // Decorative line
    doc.moveTo(marginVal, headerHeight + 20)
       .lineTo(doc.page.width - marginVal, headerHeight + 20)
       .lineWidth(2)
       .stroke(accentColor);

    // --- SKILL MASTERY SECTION ---
    let yPosition = headerHeight + 40;
    doc.fontSize(18).fillColor(primaryColor).text('Skill Mastery', marginVal, yPosition);
    yPosition += 30;

    Object.entries(skillProgress).forEach(([skill, score]) => {
      const percent = score * 10;
      doc.fontSize(12)
         .fillColor('#444')
         .text(skill, marginVal, yPosition, { width: 250 });
      
      // Progress bar background
      doc.rect(marginVal + 260, yPosition - 4, 150, 12)
         .fill(secondaryColor);
      // Progress bar fill
      doc.rect(marginVal + 260, yPosition - 4, 150 * (percent/100), 12)
         .fill(accentColor);
      doc.text(`${percent}%`, marginVal + 420, yPosition);
      yPosition += 25;
    });

    // --- COMBINED H2H & OVERALL PERFORMANCE SECTION ---
    yPosition += 20;
    const columnWidth = (doc.page.width - marginVal * 2) / 2;

    // Left Column: Head-to-Head Performance
    doc.fontSize(14).fillColor('black').text('Head-to-Head Performance', marginVal, yPosition);
    let h2hY = yPosition + 30;
    
    const createH2HBox = (title, stats, y) => {
      const boxWidth = columnWidth - 20;
      doc.rect(marginVal, y, boxWidth, 80)
         .fill(secondaryColor);
      doc.fontSize(12).fillColor(primaryColor).text(title, marginVal + 10, y + 15);
      doc.fontSize(18).fillColor(accentColor).text(`${stats.wins}-${stats.losses}-${stats.draws}`, marginVal + 10, y + 35);
      doc.fontSize(10).fillColor('#666').text(`Wins • Losses • Draws`, marginVal + 10, y + 60);
      return y + 90;
    };

    h2hY = createH2HBox('Writing Matches', writingH2H, h2hY);
    h2hY = createH2HBox('Image Matches', imageH2H, h2hY);

    // Right Column: Overall Performance
    const perfY = yPosition + 30;
    doc.fontSize(14).fillColor('black').text('Overall Performance', marginVal + columnWidth + 20, perfY);
    
    // Circular progress indicator
    const centerX = marginVal + columnWidth + 20 + (columnWidth / 2);
    const centerY = perfY + 80;
    const radius = 40;
    
    doc.circle(centerX, centerY, radius)
       .fill(secondaryColor);
    const endAngle = (overallPercentage / 100) * Math.PI * 2 - Math.PI / 2;
    doc.moveTo(centerX, centerY)
       .arc(centerX, centerY, radius, -Math.PI / 2, endAngle)
       .lineTo(centerX, centerY)
       .fill(accentColor);
    doc.fontSize(24).fillColor(primaryColor)
       .text(`${overallPercentage}%`, centerX - 20, centerY - 15);
    doc.fontSize(12).fillColor('#666')
       .text('Overall Score', centerX - 30, centerY + 20);

    // --- DETAILED EXAM RECORDS TABLE ---
    let tableY = Math.max(h2hY, centerY + 50) + 30;
    if (tableY + 100 > doc.page.height - marginVal) {
      doc.addPage();
      tableY = marginVal;
    }
    
    doc.fillColor(primaryColor).fontSize(18).text('Detailed Exam Records', marginVal, tableY);
    tableY += 30;

    // Table setup
    const rowHeight = 30;
    const colWidth = {
      exam: 200,
      date: 100,
      marks: 80,
      percent: 80
    };

    // Table header background and text (ensure consistent font)
    doc.font('Helvetica-Bold')
       .fillColor('white')
       .rect(marginVal, tableY, doc.page.width - marginVal * 2, rowHeight)
       .fill(primaryColor);
    doc.font('Helvetica-Bold').fillColor('white')
       .text('Exam', marginVal + 10, tableY + 8)
       .text('Date', marginVal + colWidth.exam + 20, tableY + 8)
       .text('Marks', marginVal + colWidth.exam + colWidth.date + 30, tableY + 8)
       .text('% Score', marginVal + colWidth.exam + colWidth.date + colWidth.marks + 40, tableY + 8);

    let currentY = tableY + rowHeight;
    testHistories.forEach((history, index) => {
      if (currentY + rowHeight > doc.page.height - marginVal) {
        doc.addPage();
        currentY = marginVal + rowHeight;
        // Recreate header on new page
        doc.font('Helvetica-Bold')
           .fillColor('white')
           .rect(marginVal, marginVal, doc.page.width - marginVal * 2, rowHeight)
           .fill(primaryColor);
        doc.font('Helvetica-Bold').fillColor('white')
           .text('Exam', marginVal + 10, marginVal + 8)
           .text('Date', marginVal + colWidth.exam + 20, marginVal + 8)
           .text('Marks', marginVal + colWidth.exam + colWidth.date + 30, marginVal + 8)
           .text('% Score', marginVal + colWidth.exam + colWidth.date + colWidth.marks + 40, marginVal + 8);
      }

      // Row background
      doc.fillColor(index % 2 === 0 ? '#F8F8F8' : 'white')
         .rect(marginVal, currentY, doc.page.width - marginVal * 2, rowHeight)
         .fill();
      
      // Row content
      const exam = history.testModelName.replace("Tcf", "");
      const date = new Date(Number(history.createdAt)).toLocaleDateString();
      const marks = `${history.score}/10`;
      const percent = `${(history.score * 10).toFixed(1)}%`;

      doc.font('Helvetica').fillColor('#333')
         .text(exam, marginVal + 10, currentY + 8, { width: colWidth.exam })
         .text(date, marginVal + colWidth.exam + 20, currentY + 8)
         .text(marks, marginVal + colWidth.exam + colWidth.date + 30, currentY + 8)
         .text(percent, marginVal + colWidth.exam + colWidth.date + colWidth.marks + 40, currentY + 8);

      currentY += rowHeight;
    });

    // Final footer on the last page
    doc.fontSize(10).fillColor('#666')
       .text('© 2024 Language Learning Platform', marginVal, doc.page.height - 30, { 
         align: 'left',
         lineBreak: false 
       })
       .text(`Page ${doc.bufferedPageRange().count}`, doc.page.width - marginVal - 50, doc.page.height - 30, {
         align: 'right',
         lineBreak: false
       });
    
    // ---- ADD WATERMARKS OVER ALL PAGES ----
    // The logo watermark remains centered and large (same as current),
    // while the stamp watermark is now placed at the right middle corner, small and tilted.
    const addWatermarks = (doc) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      // Save graphics state and set overall opacity
      doc.save();
      
      
      // --- Logo Watermark (centered, big, tilted) ---
      if (logoWatermarkBuffer) {
        doc.opacity(0.03);
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;
        doc.rotate(-15, { origin: [centerX, centerY] });
        doc.image(logoWatermarkBuffer, centerX - 150, centerY - 150, { width: 300 });
        doc.rotate(15, { origin: [centerX, centerY] });
      }
      
      // --- Stamp Watermark (right middle corner, small, tilted) ---
      if (stampBuffer) {
        doc.opacity(0.3);
        const stampWidth = 100;
        // Place at right middle corner with a margin
        const stampX = pageWidth - stampWidth - marginVal;
        const stampY = pageHeight / 3 - stampWidth / 2;
        doc.rotate(-15, { origin: [stampX + stampWidth / 2, stampY + stampWidth / 2] });
        doc.image(stampBuffer, stampX, stampY, { width: stampWidth });
        doc.rotate(15, { origin: [stampX + stampWidth / 2, stampY + stampWidth / 2] });
      }
      
      doc.restore();
    };

    // Loop through buffered pages and add watermarks to each page
    const range = doc.bufferedPageRange(); // { start: 0, count: N }
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      addWatermarks(doc);
    }

    // Finalize the document after adding watermarks
    doc.end();

  } catch (error) {
    console.error("PDF generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate transcript" });
    }
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

  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    serverSelectionTimeoutMS: 5000
  });
  console.log("Connected to MongoDB successfully!");

  // For local development: start listening if not running on Lambda
  if (!process.env.LAMBDA_TASK_ROOT) {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/graphql`);
    });
  }
}

startServer().catch((err) => console.log(err));

// Export the app for Lambda usage
module.exports = app;