import React, { useState } from "react";
import { usePeriod, MONTH_NAMES } from "../context/PeriodContext";

// أيقونة أعلى الصفحة لاختيار شهر/سنة معينين، بيتطبق تلقائيًا كافتراضي
// في فورمات الحضور والحفظ في كل الأقسام لحد ما المستخدم يغيّره يدويًا
const PeriodPicker = () => {
  const { activeMonth, activeYear, isCustom, setPeriod, clearPeriod, currentMonth, currentYear } = usePeriod();
  const [open, setOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(activeMonth);
  const [draftYear, setDraftYear] = useState(activeYear);

  const toggle = () => {
    setDraftMonth(activeMonth);
    setDraftYear(activeYear);
    setOpen((o) => !o);
  };

  const apply = () => {
    setPeriod(draftMonth, draftYear);
    setOpen(false);
  };

  const reset = () => {
    clearPeriod();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition ${
          isCustom ? "bg-white text-primary-700 border-white" : "bg-primary-700/40 text-white border-white/30 hover:bg-primary-700/60"
        }`}
        title="اختيار الشهر والسنة المعتمدين في فورمات الحضور والحفظ"
      >
        <span>📅</span>
        <span>{MONTH_NAMES[activeMonth - 1]} {activeYear}</span>
        {isCustom && <span className="text-[10px] bg-primary-100 text-primary-700 rounded-full px-1.5">مخصص</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-sand-100 p-4 w-64 text-sand-800" dir="rtl">
            <div className="text-sm font-bold mb-3">الشهر والسنة المعتمدين</div>
            <div className="flex gap-2 mb-3">
              <select className="input" value={draftMonth} onChange={(e) => setDraftMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                className="input w-24"
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-sand-400 mb-3">
              الشهر ده هيتحدد تلقائيًا كافتراضي في فورمات الحضور وتسجيل الحفظ في كل الأقسام، إلا لو غيّرته جوه الفورم نفسه.
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1 justify-center text-xs" onClick={apply}>تطبيق</button>
              <button type="button" className="btn-secondary flex-1 justify-center text-xs" onClick={reset}>
                الشهر الحالي ({MONTH_NAMES[currentMonth - 1]})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodPicker;
