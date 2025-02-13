const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",   // or whatever your User model is named
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
  // You might also keep metadata like date/time taken etc.
});

module.exports = mongoose.model("History", historySchema);
