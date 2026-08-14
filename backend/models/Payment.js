const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const paymentSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true }, // مثال: "2026-08"
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ["cash", "transfer", "other"], default: "cash" },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
