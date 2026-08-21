// المصحف الشريف = 604 صفحة، 30 جزء (كل جزء تقريبًا 20.13 صفحة)
export const QURAN_TOTAL_PAGES = 604;
export const JUZ_PAGES = QURAN_TOTAL_PAGES / 30;

// خيارات مقدار الحفظ/المراجعة اليومي (بالصفحات) - مبنية على افتراض 15 سطر في الصفحة تقريبًا
export const DAILY_AMOUNT_OPTIONS = [
  // { label: "سطر", value: 1 / 15 },
  // { label: "سطرين", value: 2 / 15 },
  { label: "نص صفحة", value: 0.5 },
  { label: "صفحة", value: 1 },
  { label: "صفحة ونص", value: 1.5 },
  { label: "صفحتين", value: 2 },
  { label: "مقدار آخر (تحديد يدوي)", value: "custom" },
];

// يحدد أقرب خيار من القائمة لقيمة رقمية معينة، أو "custom" لو مفيهاش تطابق
export const findAmountOption = (pages) => {
  if (!pages) return "";
  const match = DAILY_AMOUNT_OPTIONS.find((o) => typeof o.value === "number" && Math.abs(o.value - pages) < 0.001);
  return match ? match.value : "custom";
};

export const pagesToJuz = (pages) => (pages ? (pages / JUZ_PAGES).toFixed(2) : "0");
