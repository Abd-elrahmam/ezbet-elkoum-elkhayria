// تحويل شهر بصيغة "YYYY-MM" لمدى تاريخ (بداية الشهر لحد بداية الشهر اللي بعده)
// يُستخدم في فلترة السجلات اللي بتتسجل بتاريخ (Date) بدل ما يبقى عندها حقل شهر نصي جاهز
function monthRange(monthStr) {
  if (!monthStr || typeof monthStr !== "string" || !monthStr.includes("-")) return null;
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return null;
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

module.exports = { monthRange };
