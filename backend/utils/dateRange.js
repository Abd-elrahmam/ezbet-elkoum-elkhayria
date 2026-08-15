// يحول "2026-08" لبداية ونهاية الشهر كـ Date objects
const monthRange = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // بداية الشهر اللي بعده (نهاية حصرية)
  return { start, end };
};

module.exports = { monthRange };
