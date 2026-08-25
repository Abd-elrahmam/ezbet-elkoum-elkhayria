import React, { createContext, useContext, useState } from "react";

const PeriodContext = createContext(null);

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const STORAGE_KEY = "bilal_selected_period";

const loadStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.month && parsed.year) return parsed;
    return null;
  } catch {
    return null;
  }
};

// السنة والشهر الحاليين دايمًا متاحين، بالإضافة لإمكانية اختيار شهر/سنة
// مختلفين من الأيقونة العلوية، بحيث أي فورم (حضور، حفظ...) يبدأ بالشهر
// المختار ده بدل الشهر الحالي، إلا لو المستخدم غيّره يدويًا جوه الفورم نفسه
export const PeriodProvider = ({ children }) => {
  const stored = loadStored();
  const [selected, setSelected] = useState(stored); // null = مفيش اختيار، استخدم الشهر الحالي

  const setPeriod = (month, year) => {
    const value = { month: Number(month), year: Number(year) };
    setSelected(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  };

  const clearPeriod = () => {
    setSelected(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const activeMonth = selected?.month || CURRENT_MONTH;
  const activeYear = selected?.year || CURRENT_YEAR;
  const isCustom = !!selected;

  return (
    <PeriodContext.Provider
      value={{
        activeMonth,
        activeYear,
        isCustom,
        setPeriod,
        clearPeriod,
        currentMonth: CURRENT_MONTH,
        currentYear: CURRENT_YEAR,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
};

export const usePeriod = () => useContext(PeriodContext);

export const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
