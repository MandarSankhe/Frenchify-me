// models/ImageMatch.js
const mongoose = require("mongoose");

const imageMatchSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "ImageExam" },
  examTitle: String,
  //currentQuestion: Number,
  initiatorCurrent: { type: Number, default: 0 },
  opponentCurrent: { type: Number, default: 0 },
  questions: [{
    imageUrl: String,
    correctWord: String,
    revealedLetters: [{
      position: Number,
      char: String
    }],
    initiatorAnswer: String,
    opponentAnswer: String,
    initiatorScore: Number,
    opponentScore: Number
  }],
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  opponent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "pending" },
  totalScore: {
    initiator: { type: Number, default: 0 },
    opponent: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImageMatch", imageMatchSchema);