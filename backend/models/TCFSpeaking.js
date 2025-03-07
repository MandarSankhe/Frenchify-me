// models/TCFSpeaking.js
const mongoose = require("mongoose");

const tcfspeakingSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  mainQuestion1: { type: String, required: true },
  mainQuestion2: { type: String, required: true },
  mainQuestion3: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TCFSpeaking", tcfspeakingSchema);
