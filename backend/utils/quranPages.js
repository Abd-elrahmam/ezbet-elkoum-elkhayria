const { SURAHS, QURAN_TOTAL_PAGES } = require("./quranSurahs");
const ayahs = require("../data/quran-ayahs.json");

// خريطة سريعة: "surahId:ayahNumber" → page
// بنستخدم Map عشان البحث يكون O(1) بدل O(n)
const pageMap = new Map();
ayahs.forEach((a) => {
  pageMap.set(`${a.surah_id}:${a.number_in_surah}`, a.page);
});

/**
 * إرجاع رقم الصفحة الحقيقي لآية معينة
 * البيانات من ملف quran-ayahs.json (دقة 100%)
 *
 * @param {number} surahNumber - رقم السورة (1-114)
 * @param {number} ayahNumber - رقم الآية داخل السورة
 * @returns {number|null}
 */
function pageForAyah(surahNumber, ayahNumber) {
  const s = Number(surahNumber);
  const a = Number(ayahNumber);
  if (!s || !a || s < 1 || s > 114 || a < 1) return null;
  return pageMap.get(`${s}:${a}`) || null;
}

function findSurahByName(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  return SURAHS.find((s) => s.name === trimmed) || null;
}

function surahNameByNumber(number) {
  const s = SURAHS.find((s) => s.number === Number(number));
  return s ? s.name : "";
}

// حساب عدد الصفحات بين نقطتين (من سورة/آية - إلى سورة/آية)
function computePagesRange(fromSurah, fromAyah, toSurah, toAyah) {
  const fromPage = pageForAyah(fromSurah, fromAyah);
  const toPage = pageForAyah(toSurah, toAyah);
  if (fromPage == null || toPage == null)
    return { fromPage: null, toPage: null, pagesCount: 0 };
  if (toPage < fromPage) return { fromPage, toPage, pagesCount: 0 };
  return { fromPage, toPage, pagesCount: toPage - fromPage + 1 };
}

// نفس الحساب لكن باستخدام اسم السورة بدل الرقم
function computePagesRangeByName(fromName, fromAyah, toName, toAyah) {
  const fromSurah = findSurahByName(fromName);
  const toSurah = findSurahByName(toName);
  if (!fromSurah || !toSurah)
    return { fromPage: null, toPage: null, pagesCount: 0 };
  return computePagesRange(
    fromSurah.number,
    fromAyah,
    toSurah.number,
    toAyah
  );
}

module.exports = {
  pageForAyah,
  computePagesRange,
  computePagesRangeByName,
  findSurahByName,
  surahNameByNumber,
  QURAN_TOTAL_PAGES,
};