const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    month: { type: String, required: true }, // "2026-08"
    baseSalary: { type: Number, required: true, default: 0 },
    bonuses: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    paid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

salarySchema.pre("save", function (next) {
  this.netSalary = (this.baseSalary || 0) + (this.bonuses || 0) - (this.deductions || 0);
  next();
});

salarySchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);
