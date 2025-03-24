// models/ImageExam.js
const mongoose = require("mongoose");

const imageQuestionSchema = new mongoose.Schema({
  imageUrl: String,
  correctWord: String,
  revealedLetters: [{
    position: Number,
    char: String
  }],
  hints: [String]
});

const imageExamSchema = new mongoose.Schema({
  title: String,
  level: String,
  questions: [imageQuestionSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImageExam", imageExamSchema);