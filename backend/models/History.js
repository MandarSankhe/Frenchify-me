const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // This field tells Mongoose which model to use for 'testId'
  testModelName: {
    type: String,
    required: true,
    enum: ["TcfReading", "TcfWriting", "TcfListening", "TcfSpeaking"], 
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "testModelName",
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("History", historySchema);
