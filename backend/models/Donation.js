const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    message: { type: String },
    invoiceNumber: { type: String, required: true }
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

module.exports = mongoose.model("Donation", donationSchema);
