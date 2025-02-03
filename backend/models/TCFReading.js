// models/TCFReading.js
const mongoose = require("mongoose");

// Schema for individual questions
const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true }, // Question text
  options: [{ type: String, required: true }],    // Array of answer options
  correctAnswer: { type: String, required: true },// Correct answer (one of the options)
});

// Schema for a single document
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },        // Title of the document
  type: {
    type: String,
    enum: ["messages", "letters", "menus", "articles", "literary texts"],
    required: true,
  },                                              // Type of the document
  content: { type: String, required: true },      // Full content of the document
});

// Wrapper schema combining a document with its questions
const documentSetSchema = new mongoose.Schema({
  document: { type: documentSchema, required: true },
  questions: { type: [questionSchema], required: true },
});

// Schema for the TCF reading exam (with 5–8 documents)
const tcfReadingSchema = new mongoose.Schema({
  title: { type: String, required: true },  // An overall title for the exam
  documents: {
    type: [documentSetSchema],
    validate: (docs) => docs.length >= 5 && docs.length <= 8,
    required: true,
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TCFReading", tcfReadingSchema);
