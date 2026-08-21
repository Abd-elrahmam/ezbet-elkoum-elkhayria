const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const hifzSchema = new mongoose.Schema(
  {
    // إما طالب أو موظف (واحد منهم فقط)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), required: true },
    month: { type: String, required: true }, // "2026-08"

    // ==== الحفظ الجديد ====
    // مقدار الحفظ اليومي بالصفحات (نص صفحة = 0.5، سطر ~ 0.067 ... إلخ)
    dailyMemPages: { type: Number, default: 0 },
    memFromSurah: { type: String, trim: true, default: "" },
    memFromAyah: { type: Number, default: null },
    memToSurah: { type: String, trim: true, default: "" },
    memToAyah: { type: Number, default: null },

    // ==== المراجعة ====
    dailyRevisionPages: { type: Number, default: 0 },
    revFromSurah: { type: String, trim: true, default: "" },
    revFromAyah: { type: Number, default: null },
    revToSurah: { type: String, trim: true, default: "" },
    revToAyah: { type: Number, default: null },

    // المتون (نص حر لأنها مش موحّدة زي سور القرآن)
    mutoonFrom: { type: String, trim: true, default: "" },
    mutoonTo: { type: String, trim: true, default: "" },

    // عدد أيام الحضور المستخدمة في حساب الحفظ/المراجعة (نسخة وقت الحفظ، عشان التقرير يفضل صحيح حتى لو الحضور اتعدل بعدين)
    attendedDays: { type: Number, default: 0 },

    // النتائج المحسوبة تلقائيًا (بالصفحات)
    totalMemPages: { type: Number, default: 0 },
    totalRevisionPages: { type: Number, default: 0 },

    grade: {
      type: String,
      enum: ["excellent", "very_good", "good", "acceptable", "weak", ""],
      default: "",
    },

    notes: { type: String, trim: true, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// يحسب إجمالي الحفظ والمراجعة تلقائيًا (أيام الحضور × المقدار اليومي)
hifzSchema.pre("save", function (next) {
  const days = this.attendedDays || 0;
  this.totalMemPages = Math.round((days * (this.dailyMemPages || 0)) * 100) / 100;
  this.totalRevisionPages = Math.round((days * (this.dailyRevisionPages || 0)) * 100) / 100;
  next();
});

hifzSchema.index({ student: 1, month: 1 });
hifzSchema.index({ employee: 1, month: 1 });

module.exports = mongoose.model("Hifz", hifzSchema);
