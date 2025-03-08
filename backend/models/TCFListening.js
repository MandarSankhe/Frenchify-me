const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  audioText: { type: String, required: true },
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
});

const TCFListeningSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    required: true,
  },
  questions: { type: [QuestionSchema], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TCFListening", TCFListeningSchema);
