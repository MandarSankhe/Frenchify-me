const mongoose = require("mongoose");

const WritingMatchSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "TCFWriting" },
  examTitle: String,
  examQuestion: String,
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  opponent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  initiatorAnswer: String,
  opponentAnswer: String,
  initiatorFeedback: String,
  opponentFeedback: String,
  status: { type: String, default: "pending" }, // "pending", "active", "completed"
  opponentScore: Number,
  totalScore: {
    initiator: { type: Number, default: 0 },
    opponent: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("WritingMatch", WritingMatchSchema);
