const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../utils/constants");

const GRADES = ["excellent", "very_good", "good", "acceptable", "weak"];
const HIFZ_STATUS = ["normal", "khatm", "review_only"];

// سجل الحفظ الشهري: حفظ جديد + مراجعة + متون، لطالب أو موظف (مدرس بيحفظ هو كمان)
const hifzSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    department: { type: String, enum: Object.values(DEPARTMENTS), default: "quran" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    month: { type: String, required: true }, // "YYYY-MM"

    // حالة خاصة: عادي / ختم القرآن / مراجعة فقط (بدون حفظ جديد)
    status: { type: String, enum: HIFZ_STATUS, default: "normal" },

    // معدل الحفظ اليومي (صفحة) وأيام الحضور، لحساب "المتوقع" مقابل "المحفوظ فعليًا"
    dailyRatePages: { type: Number, min: 0, default: null },
    presentDays: { type: Number, min: 0, default: null },
    // ملاحظة: expectedPages و totalMemPages هما الإجمالي (فترة 1 + فترة 2 لو مفعّلة)
    expectedPages: { type: Number, min: 0, default: null },

    // الحفظ الجديد - الفترة الأولى (مثلاً: الصباحية)
    period1Label: { type: String, trim: true, default: "" },
    memFromSurah: { type: String, trim: true, default: "" },
    memFromAyah: { type: Number, default: null },
    memToSurah: { type: String, trim: true, default: "" },
    memToAyah: { type: Number, default: null },
    memPages1: { type: Number, min: 0, default: 0 },

    // الحفظ الجديد - الفترة الثانية (اختيارية، مثلاً: المسائية) - نفس فكرة الفترة الأولى بمسمى تاني
    hasPeriod2: { type: Boolean, default: false },
    period2Label: { type: String, trim: true, default: "" },
    dailyRatePages2: { type: Number, min: 0, default: null },
    expectedPages2: { type: Number, min: 0, default: null },
    memFromSurah2: { type: String, trim: true, default: "" },
    memFromAyah2: { type: Number, default: null },
    memToSurah2: { type: String, trim: true, default: "" },
    memToAyah2: { type: Number, default: null },
    memPages2: { type: Number, min: 0, default: 0 },

    totalMemPages: { type: Number, min: 0, default: 0 },

    // المراجعة (بالسور - من سورة لسورة، مش بالآية) - الفترة الأولى
    revPeriod1Label: { type: String, trim: true, default: "" },
    revFromSurah: { type: String, trim: true, default: "" },
    revFromAyah: { type: Number, default: null },
    revToSurah: { type: String, trim: true, default: "" },
    revToAyah: { type: Number, default: null },
    // معدل المراجعة اليومي (صفحة) - زي معدل الحفظ اليومي بالظبط، بيتحسب بيه
    // المتوقع مراجعته = revDailyRatePages × أيام الحضور
    revDailyRatePages: { type: Number, min: 0, default: null },
    // ملاحظة: expectedRevisionPages و totalRevisionPages هما الإجمالي (فترة 1 + فترة 2 لو مفعّلة)
    expectedRevisionPages: { type: Number, min: 0, default: null },
    revPages1: { type: Number, min: 0, default: 0 },

    // المراجعة - الفترة الثانية (اختيارية)
    hasRevPeriod2: { type: Boolean, default: false },
    revPeriod2Label: { type: String, trim: true, default: "" },
    revDailyRatePages2: { type: Number, min: 0, default: null },
    expectedRevisionPages2: { type: Number, min: 0, default: null },
    revFromSurah2: { type: String, trim: true, default: "" },
    revToSurah2: { type: String, trim: true, default: "" },
    revPages2: { type: Number, min: 0, default: 0 },

    totalRevisionPages: { type: Number, min: 0, default: 0 },
    revGrade: { type: String, enum: [...GRADES, null], default: null }, // تقييم المراجعة (منفصل عن تقييم الحفظ)

    // المتون (لبعض الحلقات بتحفظ متون بجانب القرآن)
    mutoonFrom: { type: String, trim: true, default: "" },
    mutoonTo: { type: String, trim: true, default: "" },

    grade: { type: String, enum: [...GRADES, null], default: null }, // تقييم الحفظ الجديد
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

hifzSchema.index({ student: 1, month: 1 }, { unique: true, sparse: true });
hifzSchema.index({ employee: 1, month: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Hifz", hifzSchema);
module.exports.GRADES = GRADES;
module.exports.HIFZ_STATUS = HIFZ_STATUS;
