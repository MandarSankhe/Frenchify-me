// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  //Tracks the user's proficiency.
  languageLevel: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  progress: {
    type: Map,
    of: Number, // Stores progress for each exercise type, e.g., { reading: 70, writing: 50 }
    default: { reading: 0, writing: 0, listening: 0, speaking: 0 }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
