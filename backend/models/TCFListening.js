// TCFListening.js
// Mongoose model for TCF mock listening exam.
// Each exam consists of one or more passages, and each passage includes several questions.
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
});

const PassageSchema = new mongoose.Schema({
  passageText: { type: String, required: true },
  questions: { type: [QuestionSchema], required: true },
});

const TCFListeningSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ["beginner", "intermediate", "advanced"], 
    required: true 
  },
  // Array of passages – each passage has a full passage text and an array of questions (8–10 per passage)
  passages: { type: [PassageSchema], required: true },
  // Total questions for the full exam (e.g. 39)
  totalQuestions: { type: Number, default: 39 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TCFListening", TCFListeningSchema);
