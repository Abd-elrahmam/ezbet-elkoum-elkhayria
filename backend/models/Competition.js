const mongoose = require("mongoose");

const competitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    participants: [
      {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        score: { type: Number, default: 0 },
        rank: { type: Number, default: null },
      },
    ],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    prize: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Competition", competitionSchema);
