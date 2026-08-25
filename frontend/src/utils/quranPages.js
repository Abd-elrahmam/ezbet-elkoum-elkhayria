import { SURAHS } from "./quranSurahs";

export const QURAN_TOTAL_PAGES = 604;

const PAGE_MAP_URL =
  "https://raw.githubusercontent.com/Mushaf-Learning/quran-text/main/metadata/pages.json";

let pageBoundaries = [];
let initialized = false;
let initPromise = null;

/**
 * تحميل خريطة صفحات المصحف المدني 604 صفحة
 */
export async function initQuranPages() {
  if (initialized) return true;

  if (initPromise) {
    return initPromise;
  }

  initPromise = fetch(PAGE_MAP_URL)
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          `Failed to load Quran page map: ${res.status}`
        );
      }

      return res.json();
    })
    .then((data) => {
      if (
        !Array.isArray(data) ||
        data.length !== QURAN_TOTAL_PAGES
      ) {
        throw new Error(
          `Invalid Quran page map. Expected ${QURAN_TOTAL_PAGES} pages.`
        );
      }

      pageBoundaries = data
        .map((item) => ({
          page: Number(item.page),
          surah: Number(item.sura),
          ayah: Number(item.aya),
        }))
        .filter(
          (item) =>
            Number.isInteger(item.page) &&
            Number.isInteger(item.surah) &&
            Number.isInteger(item.ayah)
        )
        .sort((a, b) => a.page - b.page);

      if (pageBoundaries.length !== QURAN_TOTAL_PAGES) {
        throw new Error(
          "Quran page map contains invalid entries."
        );
      }

      initialized = true;

      return true;
    })
    .catch((error) => {
      initialized = false;
      pageBoundaries = [];
      initPromise = null;

      console.error(
        "Quran page map initialization failed:",
        error
      );

      throw error;
    });

  return initPromise;
}

/**
 * هل خريطة الصفحات جاهزة؟
 */
export function isQuranPagesReady() {
  return initialized;
}

/**
 * الحصول على الصفحة الفعلية للآية
 *
 * نعتمد على بداية كل صفحة في المصحف،
 * وليس على عدد الآيات أو التناسب.
 */
export function pageForAyah(
  surahNumber,
  ayahNumber
) {
  if (!initialized) {
    throw new Error(
      "Quran page map is not initialized. Call await initQuranPages() first."
    );
  }

  const surahNo = Number(surahNumber);

  const surah = SURAHS.find(
    (s) => s.number === surahNo
  );

  if (!surah) return null;

  const ayah = Math.min(
    Math.max(Number(ayahNumber) || 1, 1),
    Number(surah.ayahCount)
  );

  /*
   * نمشي على صفحات المصحف بالترتيب.
   *
   * نريد آخر صفحة:
   *
   * boundary.surah < السورة الحالية
   *
   * أو:
   *
   * boundary.surah === السورة الحالية
   * و boundary.ayah <= الآية المطلوبة
   *
   * بهذه الطريقة نتعامل أيضًا مع السور
   * التي تبدأ في منتصف صفحة.
   */

  let result = null;

  for (const boundary of pageBoundaries) {
    if (boundary.surah > surahNo) {
      break;
    }

    if (boundary.surah < surahNo) {
      result = boundary.page;
      continue;
    }

    if (
      boundary.surah === surahNo &&
      boundary.ayah <= ayah
    ) {
      result = boundary.page;
      continue;
    }

    if (
      boundary.surah === surahNo &&
      boundary.ayah > ayah
    ) {
      break;
    }
  }

  /*
   * لو لم نجد نتيجة، نستخدم startPage
   * كـ fallback.
   */
  if (result == null) {
    return Number(surah.startPage) || null;
  }

  return result;
}

/**
 * Async version
 */
export async function pageForAyahAsync(
  surahNumber,
  ayahNumber
) {
  await initQuranPages();

  return pageForAyah(
    surahNumber,
    ayahNumber
  );
}

/**
 * حساب عدد الصفحات بين نقطتين
 */
export function computePagesRange(
  fromSurah,
  fromAyah,
  toSurah,
  toAyah
) {
  const fromPage = pageForAyah(
    fromSurah,
    fromAyah
  );

  const toPage = pageForAyah(
    toSurah,
    toAyah
  );

  if (
    fromPage == null ||
    toPage == null
  ) {
    return {
      fromPage: null,
      toPage: null,
      pagesCount: 0,
    };
  }

  if (toPage < fromPage) {
    return {
      fromPage,
      toPage,
      pagesCount: 0,
    };
  }

  return {
    fromPage,
    toPage,
    pagesCount:
      toPage - fromPage + 1,
  };
}

/**
 * Async version
 */
export async function computePagesRangeAsync(
  fromSurah,
  fromAyah,
  toSurah,
  toAyah
) {
  await initQuranPages();

  return computePagesRange(
    fromSurah,
    fromAyah,
    toSurah,
    toAyah
  );
}

/**
 * البحث عن السورة بالاسم
 */
export function findSurahByName(name) {
  if (!name) return null;

  const trimmed = String(name).trim();

  return (
    SURAHS.find(
      (s) => s.name === trimmed
    ) || null
  );
}

/**
 * اسم السورة من رقمها
 */
export function surahNameByNumber(number) {
  const surah = SURAHS.find(
    (s) => s.number === Number(number)
  );

  return surah ? surah.name : "";
}

/**
 * الحساب باستخدام أسماء السور
 */
export function computePagesRangeByName(
  fromName,
  fromAyah,
  toName,
  toAyah
) {
  const fromSurah =
    findSurahByName(fromName);

  const toSurah =
    findSurahByName(toName);

  if (!fromSurah || !toSurah) {
    return {
      fromPage: null,
      toPage: null,
      pagesCount: 0,
    };
  }

  return computePagesRange(
    fromSurah.number,
    fromAyah,
    toSurah.number,
    toAyah
  );
}

/**
 * Async version باستخدام أسماء السور
 */
export async function computePagesRangeByNameAsync(
  fromName,
  fromAyah,
  toName,
  toAyah
) {
  await initQuranPages();

  return computePagesRangeByName(
    fromName,
    fromAyah,
    toName,
    toAyah
  );
}