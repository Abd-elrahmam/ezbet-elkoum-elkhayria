const { SURAHS, QURAN_TOTAL_PAGES } = require("./quranSurahs");

function findSurahByName(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  return SURAHS.find((s) => s.name === trimmed) || null;
}

function surahNameByNumber(number) {
  const s = SURAHS.find((s) => s.number === Number(number));
  return s ? s.name : "";
}

// إرجاع رقم الصفحة التقريبي لآية معينة (بالتناسب الخطي داخل نطاق صفحات السورة)
function pageForAyah(surahNumber, ayahNumber) {
  const surah = SURAHS.find((s) => s.number === Number(surahNumber));
  if (!surah) return null;
  const next = SURAHS.find((s) => s.number === surah.number + 1);
  const startPage = surah.startPage;
  const endPageExclusive = next ? next.startPage : QURAN_TOTAL_PAGES + 1;
  const pageSpan = Math.max(endPageExclusive - startPage, 1);
  const ayah = Math.min(Math.max(Number(ayahNumber) || 1, 1), surah.ayahCount);
  const ratio = (ayah - 1) / surah.ayahCount;
  let page = startPage + Math.floor(ratio * pageSpan);
  if (page >= endPageExclusive) page = endPageExclusive - 1;
  if (page < startPage) page = startPage;
  return page;
}

// حساب عدد الصفحات بين نقطتين (من سورة/آية - إلى سورة/آية)
function computePagesRange(fromSurah, fromAyah, toSurah, toAyah) {
  const fromPage = pageForAyah(fromSurah, fromAyah);
  const toPage = pageForAyah(toSurah, toAyah);
  if (fromPage == null || toPage == null) return { fromPage: null, toPage: null, pagesCount: 0 };
  const pagesCount = Math.max(toPage - fromPage + 1, toPage >= fromPage ? 1 : 0);
  return { fromPage, toPage, pagesCount };
}

// نفس computePagesRange لكن باستخدام اسم السورة بدل الرقم
function computePagesRangeByName(fromName, fromAyah, toName, toAyah) {
  const fromSurah = findSurahByName(fromName);
  const toSurah = findSurahByName(toName);
  if (!fromSurah || !toSurah) return { fromPage: null, toPage: null, pagesCount: 0 };
  return computePagesRange(fromSurah.number, fromAyah, toSurah.number, toAyah);
}

module.exports = { pageForAyah, computePagesRange, computePagesRangeByName, findSurahByName, surahNameByNumber };
