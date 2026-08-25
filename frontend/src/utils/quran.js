// تنسيق عدد الصفحات بصيغة عربية مقروءة للعرض في التقارير
export function formatPages(n) {
  const num = Math.round((Number(n) || 0) * 100) / 100;
  if (!num) return "٠ صفحة";
  if (num === 1) return "صفحة واحدة";
  if (num === 2) return "صفحتان";
  if (Number.isInteger(num) && num >= 3 && num <= 10) return `${num} صفحات`;
  return `${num} صفحة`;
}

// لو العدد أكبر من 20 صفحة، اعرضه بالأجزاء (كل 20 صفحة = جزء) بدل ما يفضل رقم كبير
export function formatPagesOrJuz(n) {
  const num = Math.round((Number(n) || 0) * 100) / 100;
  if (!num) return "٠ صفحة";
  if (num <= 20) return formatPages(num);
  const juz = Math.floor(num / 20);
  const rem = Math.round((num - juz * 20) * 100) / 100;
  let juzLabel;
  if (juz === 1) juzLabel = "جزء واحد";
  else if (juz === 2) juzLabel = "جزآن";
  else if (juz >= 3 && juz <= 10) juzLabel = `${juz} أجزاء`;
  else juzLabel = `${juz} جزءًا`;
  return rem > 0 ? `${juzLabel} و${formatPages(rem)}` : juzLabel;
}

// اقتراح تقدير تلقائي بناءً على نسبة تحقيق المتوقع (المحفوظ الفعلي / المتوقع × 100)
export function autoGradeFromPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return "";
  if (pct >= 100) return "excellent";
  if (pct >= 80) return "very_good";
  if (pct >= 60) return "good";
  if (pct >= 40) return "acceptable";
  return "weak";
}
