// models/TCFWriting.js
const mongoose = require("mongoose");

// Simplified TCF Writing schema
const tcfWritingSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Title of the writing test
  level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], required: true },
  exercise1: { type: String, required: true }, // Question text for Exercise 1
  exercise2: { type: String, required: true }, // Question text for Exercise 2
  exercise3: { type: String, required: true }, // Question text for Exercise 3
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TCFWriting", tcfWritingSchema);