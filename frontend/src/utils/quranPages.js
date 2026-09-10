import { SURAHS } from "./quranSurahs";

export const QURAN_TOTAL_PAGES = 604;

// ⚠️ ملاحظة مهمة: الرابط الأصلي اللي كان مفروض يجيب منه خريطة الصفحات
// (raw.githubusercontent.com/Mushaf-Learning/quran-text) مش موجود فعليًا -
// الريبو ده مش موجود على GitHub، فلو سبناه هيوقف التطبيق كله من الأول
// (زي ما main.jsx بتاعك بيعمل لو initQuranPages() فشل).
//
// عشان كده مؤقتًا بنستخدم نفس دالة الحساب التقريبي (بالتناسب حسب توزيع
// صفحات كل سورة) بدل الاعتماد على رابط خارجي ممكن يقع أو يتغير. أي كود
// تاني بيستخدم الدوال دي (pageForAyah, computePagesRange...) مش محتاج
// يتغير خالص لما نستبدل الجواني ببيانات دقيقة 100% - نفس الأسماء والشكل.

let initialized = false;
let initPromise = null;

/**
 * تجهيز حساب صفحات المصحف. حاليًا بيرجع فورًا (مفيش طلب شبكة)
 * لحد ما نضيف خريطة الصفحات الدقيقة الحقيقية.
 */
export async function initQuranPages() {
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = Promise.resolve().then(() => {
    initialized = true;
    return true;
  });

  return initPromise;
}

export function isQuranPagesReady() {
  return initialized;
}

// إرجاع رقم الصفحة التقريبي لآية معينة (بالتناسب الخطي داخل نطاق صفحات السورة)
// ملاحظة: هذا حساب تقريبي بناءً على توزيع صفحات المصحف المدني القياسي (604 صفحة)
export function pageForAyah(surahNumber, ayahNumber) {
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

export async function pageForAyahAsync(surahNumber, ayahNumber) {
  await initQuranPages();
  return pageForAyah(surahNumber, ayahNumber);
}

// حساب عدد الصفحات بين نقطتين (من سورة/آية - إلى سورة/آية)
export function computePagesRange(fromSurah, fromAyah, toSurah, toAyah) {
  const fromPage = pageForAyah(fromSurah, fromAyah);
  const toPage = pageForAyah(toSurah, toAyah);
  if (fromPage == null || toPage == null) return { fromPage: null, toPage: null, pagesCount: 0 };
  if (toPage < fromPage) return { fromPage, toPage, pagesCount: 0 };
  return { fromPage, toPage, pagesCount: toPage - fromPage + 1 };
}

export async function computePagesRangeAsync(fromSurah, fromAyah, toSurah, toAyah) {
  await initQuranPages();
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

// نفس الحساب لكن باستخدام اسم السورة بدل الرقم
export function computePagesRangeByName(fromName, fromAyah, toName, toAyah) {
  const fromSurah = findSurahByName(fromName);
  const toSurah = findSurahByName(toName);
  if (!fromSurah || !toSurah) return { fromPage: null, toPage: null, pagesCount: 0 };
  return computePagesRange(fromSurah.number, fromAyah, toSurah.number, toAyah);
}

export async function computePagesRangeByNameAsync(fromName, fromAyah, toName, toAyah) {
  await initQuranPages();
  return computePagesRangeByName(fromName, fromAyah, toName, toAyah);
}
