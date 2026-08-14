const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    // هل الفرع فيه قسم حضانة، قسم كتاب، أو الاثنين
    hasNursery: { type: Boolean, default: true },
    hasQuran: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);
