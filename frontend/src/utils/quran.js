// المصحف الشريف = 604 صفحة، 30 جزء (كل جزء تقريبًا 20.13 صفحة)
export const QURAN_TOTAL_PAGES = 604;
export const JUZ_PAGES = QURAN_TOTAL_PAGES / 30;

// خيارات مقدار الحفظ/المراجعة اليومي (بالصفحات) - مبنية على افتراض 15 سطر في الصفحة تقريبًا
export const DAILY_AMOUNT_OPTIONS = [
  { label: "سطر", value: 1 / 15 },
  { label: "سطرين", value: 2 / 15 },
  { label: "نص صفحة", value: 0.5 },
  { label: "صفحة", value: 1 },
  { label: "صفحة ونص", value: 1.5 },
  { label: "صفحتين", value: 2 },
  { label: "جزء", value: JUZ_PAGES },
  { label: "جزئين", value: 2 * JUZ_PAGES },
  { label: "مقدار آخر (تحديد يدوي)", value: "custom" },
];

// يحدد أقرب خيار من القائمة لقيمة رقمية معينة، أو "custom" لو مفيهاش تطابق
export const findAmountOption = (pages) => {
  if (!pages) return "";
  const match = DAILY_AMOUNT_OPTIONS.find((o) => typeof o.value === "number" && Math.abs(o.value - pages) < 0.05);
  return match ? match.value : "custom";
};

export const pagesToJuz = (pages) => (pages ? (pages / JUZ_PAGES).toFixed(2) : "0");

// يحوّل قيمة مُدخلة (بالصفحات أو بالأجزاء) لعدد صفحات فعلي
export const unitToPages = (value, unit) => {
  const num = Number(value) || 0;
  return unit === "juz" ? num * JUZ_PAGES : num;
};

// يعرض إجمالي الصفحات بصياغة عربية واضحة:
// أقل من 20 صفحة -> "X صفحة"
// 20 فأكثر -> "X جزء" أو "X جزء وY صفحة"
export const formatPages = (pages) => {
  const total = Math.round((pages || 0) * 100) / 100;
  if (total < 20) {
    return `${total} صفحة`;
  }
  const juz = Math.floor(total / JUZ_PAGES);
  let remainder = Math.round((total - juz * JUZ_PAGES) * 10) / 10;
  // لو الباقي قريب جدًا من جزء كامل (زي ما لو كمّل 21 صفحة) اعتبره جزء كامل
  if (remainder >= JUZ_PAGES - 1) {
    return `${juz + 1} جزء`;
  }
  if (remainder <= 0.4) {
    return `${juz} جزء`;
  }
  return `${juz} جزء و${remainder} صفحة`;
};
