const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const mongoose = require("mongoose");
const { loadFilesSync } = require("@graphql-tools/load-files");
const { mergeTypeDefs } = require("@graphql-tools/merge");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const cohere = require("cohere-ai");
cohere.init(process.env.COHERE_API);
const hfApi = process.env.HF_API;

// Initialize Express app
const app = express();
// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({}));


// Route for generating feedback #20Feb2024
app.post("/dev/generate-feedback", async (req, res) => {
  try {
    const { prompt } = req.body;
    const client = new HfInference(hfApi);
    const chatCompletion = await client.chatCompletion({
      //model: "Qwen/QwQ-32B-Preview",
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000
    });
    res.json({ feedback: chatCompletion.choices[0].message.content.replace(/\n/g, "<br>") });
  } catch (error) {
    console.error("Error with Hugging Face API:", error);
    res.status(500).json({ error: "Failed to generate feedback." });
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

