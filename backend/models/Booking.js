// models/Booking.js
const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  scheduledTime: { type: String, required: true },
  traineeRSVP: { type: Boolean, default: false },
  trainerRSVP: { type: Boolean, default: false },
  status: { type: String, default: "pending" }, // pending, confirmed, completed
  createdAt: { type: String, default: () => new Date().toISOString() },
});

module.exports = mongoose.model("Booking", BookingSchema);
