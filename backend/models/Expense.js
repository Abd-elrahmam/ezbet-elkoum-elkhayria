const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const expenseSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: [...Object.values(DEPARTMENTS), "general"], default: "general" },
    category: { type: String, required: true, trim: true }, // مثال: إيجار، صيانة، أدوات
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
