import { SURAHS } from "./quranSurahs";
import ayahs from "../data/quran-ayahs.json";

export const QURAN_TOTAL_PAGES = 604;

// خريطة سريعة: "surahId:ayahNumber" → page
const pageMap = new Map();
ayahs.forEach((a) => {
  pageMap.set(`${a.surah_id}:${a.number_in_surah}`, a.page);
});

/**
 * إرجاع رقم الصفحة الحقيقي لآية معينة (دقة 100%)
 */
export function pageForAyah(surahNumber, ayahNumber) {
  const s = Number(surahNumber);
  const a = Number(ayahNumber);
  if (!s || !a || s < 1 || s > 114 || a < 1) return null;
  return pageMap.get(`${s}:${a}`) || null;
}

export async function pageForAyahAsync(surahNumber, ayahNumber) {
  return pageForAyah(surahNumber, ayahNumber);
}

export function computePagesRange(fromSurah, fromAyah, toSurah, toAyah) {
  const fromPage = pageForAyah(fromSurah, fromAyah);
  const toPage = pageForAyah(toSurah, toAyah);
  if (fromPage == null || toPage == null)
    return { fromPage: null, toPage: null, pagesCount: 0 };
  if (toPage < fromPage) return { fromPage, toPage, pagesCount: 0 };
  return { fromPage, toPage, pagesCount: toPage - fromPage + 1 };
}

export async function computePagesRangeAsync(fromSurah, fromAyah, toSurah, toAyah) {
  return computePagesRange(fromSurah, fromAyah, toSurah, toAyah);
}

export function findSurahByName(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  return SURAHS.find((s) => s.name === trimmed) || null;
}

export function surahNameByNumber(number) {
  const s = SURAHS.find((s) => s.number === Number(number));
  return s ? s.name : "";
}

export function computePagesRangeByName(fromName, fromAyah, toName, toAyah) {
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

export async function computePagesRangeByNameAsync(fromName, fromAyah, toName, toAyah) {
  return computePagesRangeByName(fromName, fromAyah, toName, toAyah);
}

// نحافظ على الدوال القديمة لو كانت مستخدمة في مكان تاني
export async function initQuranPages() {
  return true;
}

export function isQuranPagesReady() {
  return true;
}