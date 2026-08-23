import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { DAILY_AMOUNT_OPTIONS, findAmountOption, unitToPages, formatPages } from "../utils/quran";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const GRADE_LABELS = {
  excellent: "ممتاز",
  very_good: "جيد جدًا",
  good: "جيد",
  acceptable: "مقبول",
  weak: "ضعيف",
};

const emptyForm = {
  targetType: "student",
  target: "",
  month: currentMonth(),
  memAmountOption: "",
  memCustom: "",
  memCustomUnit: "pages",
  memFromSurah: "",
  memFromAyah: "",
  memToSurah: "",
  memToAyah: "",
  revAmountOption: "",
  revCustom: "",
  revCustomUnit: "pages",
  revFromSurah: "",
  revFromAyah: "",
  revToSurah: "",
  revToAyah: "",
  mutoonFrom: "",
  mutoonTo: "",
  grade: "",
  notes: "",
};

const Hifz = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [attendedPreview, setAttendedPreview] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    api.get("/hifz", { params }).then((res) => setRecords(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterMonth]);
  useEffect(() => {
    api.get("/students").then((res) => setStudents(res.data));
    if (user.role !== "employee") {
      api.get("/users", { params: { role: "employee" } }).then((res) => setEmployees(res.data));
    }
  }, []);

  useEffect(() => {
    if (!form.target || !form.month) {
      setAttendedPreview(null);
      return;
    }
    const params = { month: form.month };
    if (form.targetType === "student") params.student = form.target;
    else params.employee = form.target;
    api.get("/monthly-attendance", { params }).then((res) => {
      setAttendedPreview(res.data[0]?.presentDays ?? 0);
    });
  }, [form.target, form.month, form.targetType]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setAttendedPreview(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      targetType: r.student ? "student" : "employee",
      target: r.student?._id || r.employee?._id || "",
      month: r.month,
      memAmountOption: findAmountOption(r.dailyMemPages),
      memCustom: findAmountOption(r.dailyMemPages) === "custom" ? r.dailyMemPages : "",
      memCustomUnit: "pages",
      memFromSurah: r.memFromSurah || "",
      memFromAyah: r.memFromAyah ?? "",
      memToSurah: r.memToSurah || "",
      memToAyah: r.memToAyah ?? "",
      revAmountOption: findAmountOption(r.dailyRevisionPages),
      revCustom: findAmountOption(r.dailyRevisionPages) === "custom" ? r.dailyRevisionPages : "",
      revCustomUnit: "pages",
      revFromSurah: r.revFromSurah || "",
      revFromAyah: r.revFromAyah ?? "",
      revToSurah: r.revToSurah || "",
      revToAyah: r.revToAyah ?? "",
      mutoonFrom: r.mutoonFrom || "",
      mutoonTo: r.mutoonTo || "",
      grade: r.grade || "",
      notes: r.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  // يحول قيمة الاختيار (رقم ثابت أو "custom") لعدد صفحات فعلي، مع مراعاة وحدة التحديد اليدوي (صفحات/أجزاء)
  const resolveAmount = (optionValue, customValue, customUnit) => {
    if (optionValue === "custom") return unitToPages(customValue, customUnit);
    return Number(optionValue) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const isStudent = form.targetType === "student";
      const targetList = isStudent ? students : employees;
      const targetObj = targetList.find((t) => t._id === form.target);

      const payload = {
        student: isStudent ? form.target : null,
        employee: isStudent ? null : form.target,
        branch: targetObj?.branch?._id || targetObj?.branch,
        department: isStudent ? targetObj?.department : targetObj?.department === "both" ? "quran" : targetObj?.department,
        month: form.month,
        dailyMemPages: resolveAmount(form.memAmountOption, form.memCustom, form.memCustomUnit),
        memFromSurah: form.memFromSurah,
        memFromAyah: form.memFromAyah ? Number(form.memFromAyah) : null,
        memToSurah: form.memToSurah,
        memToAyah: form.memToAyah ? Number(form.memToAyah) : null,
        dailyRevisionPages: resolveAmount(form.revAmountOption, form.revCustom, form.revCustomUnit),
        revFromSurah: form.revFromSurah,
        revFromAyah: form.revFromAyah ? Number(form.revFromAyah) : null,
        revToSurah: form.revToSurah,
        revToAyah: form.revToAyah ? Number(form.revToAyah) : null,
        mutoonFrom: form.mutoonFrom,
        mutoonTo: form.mutoonTo,
        grade: form.grade,
        notes: form.notes,
      };

      if (editing) {
        await api.put(`/hifz/${editing._id}`, payload);
      } else {
        await api.post("/hifz", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/hifz/${deleteId}`);
    load();
  };

  const memRange = (r) => {
    if (!r.memFromSurah && !r.memToSurah) return "—";
    return `${r.memFromSurah || "—"}${r.memFromAyah ? `:${r.memFromAyah}` : ""} ← ${r.memToSurah || "—"}${r.memToAyah ? `:${r.memToAyah}` : ""}`;
  };
  const revRange = (r) => {
    if (!r.revFromSurah && !r.revToSurah) return "—";
    return `${r.revFromSurah || "—"}${r.revFromAyah ? `:${r.revFromAyah}` : ""} ← ${r.revToSurah || "—"}${r.revToAyah ? `:${r.revToAyah}` : ""}`;
  };

  const previewMemTotal =
    attendedPreview != null ? Math.round(attendedPreview * resolveAmount(form.memAmountOption, form.memCustom, form.memCustomUnit) * 100) / 100 : null;
  const previewRevTotal =
    attendedPreview != null ? Math.round(attendedPreview * resolveAmount(form.revAmountOption, form.revCustom, form.revCustomUnit) * 100) / 100 : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الحفظ الشهري</h1>
        <button className="btn-primary" onClick={openCreate}>+ إضافة سجل حفظ</button>
      </div>

      <div className="flex gap-3 mb-4">
        <input type="month" className="input max-w-[180px]" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>الشهر</th>
                <th>أيام الحضور</th>
                <th>الحفظ الجديد</th>
                <th>إجمالي الحفظ</th>
                <th>المراجعة</th>
                <th>إجمالي المراجعة</th>
                <th>التقييم</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r._id}>
                  <td className="text-sand-400">{i + 1}</td>
                  <td className="font-semibold">{r.student?.name || r.employee?.name}</td>
                  <td>{r.month}</td>
                  <td>{r.attendedDays}</td>
                  <td className="text-sm">{memRange(r)}</td>
                  <td className="text-base font-bold text-primary-700">{formatPages(r.totalMemPages)}</td>
                  <td className="text-sm">{revRange(r)}</td>
                  <td className="text-base font-bold text-sand-700">{formatPages(r.totalRevisionPages)}</td>
                  <td>{r.grade ? <span className="badge bg-primary-50 text-primary-700">{GRADE_LABELS[r.grade]}</span> : "—"}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => openEdit(r)}>تعديل</button>
                      <button className="btn-ghost text-red-500" onClick={() => setDeleteId(r._id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={10} className="text-center text-sand-400 py-8">لا توجد سجلات حفظ بعد</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل سجل الحفظ" : "إضافة سجل حفظ شهري"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">النوع</label>
              <select
                className="input"
                disabled={!!editing}
                value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value, target: "" })}
              >
                <option value="student">طالب</option>
                <option value="employee">موظف</option>
              </select>
            </div>
            <div>
              <label className="label">{form.targetType === "student" ? "الطالب" : "الموظف"}</label>
              <select className="input" required disabled={!!editing} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                <option value="">اختر</option>
                {(form.targetType === "student" ? students : employees).map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">الشهر</label>
            <input className="input" type="month" required disabled={!!editing} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </div>

          {attendedPreview !== null && (
            <div className="bg-primary-50 text-primary-700 text-sm rounded-xl px-3 py-2">
              📅 عدد أيام الحضور المسجلة لهذا الشهر: <strong>{attendedPreview}</strong> يوم (من صفحة الحضور والغياب)
            </div>
          )}

          {/* ==== الحفظ الجديد ==== */}
          <div className="border border-sand-200 rounded-xl p-3">
            <p className="font-semibold text-sand-700 text-sm mb-2">الحفظ الجديد</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">المقدار اليومي</label>
                <select className="input" value={form.memAmountOption} onChange={(e) => setForm({ ...form, memAmountOption: e.target.value })}>
                  <option value="">اختر المقدار</option>
                  {DAILY_AMOUNT_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {form.memAmountOption === "custom" && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">حدد الكمية</label>
                    <input className="input" type="number" step="0.1" value={form.memCustom} onChange={(e) => setForm({ ...form, memCustom: e.target.value })} />
                  </div>
                  <select className="input w-28" value={form.memCustomUnit} onChange={(e) => setForm({ ...form, memCustomUnit: e.target.value })}>
                    <option value="pages">صفحة</option>
                    <option value="juz">جزء</option>
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex gap-2">
                <input className="input" placeholder="من سورة" value={form.memFromSurah} onChange={(e) => setForm({ ...form, memFromSurah: e.target.value })} />
                <input className="input w-24" type="number" placeholder="آية" value={form.memFromAyah} onChange={(e) => setForm({ ...form, memFromAyah: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <input className="input" placeholder="إلى سورة" value={form.memToSurah} onChange={(e) => setForm({ ...form, memToSurah: e.target.value })} />
                <input className="input w-24" type="number" placeholder="آية" value={form.memToAyah} onChange={(e) => setForm({ ...form, memToAyah: e.target.value })} />
              </div>
            </div>
            {previewMemTotal !== null && form.memAmountOption && (
              <div className="mt-3 bg-primary-50 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-primary-600 mb-1">📖 الإجمالي المتوقع</p>
                <p className="text-2xl font-extrabold text-primary-700">{formatPages(previewMemTotal)}</p>
              </div>
            )}
          </div>

          {/* ==== المراجعة ==== */}
          <div className="border border-sand-200 rounded-xl p-3">
            <p className="font-semibold text-sand-700 text-sm mb-2">المراجعة</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">المقدار اليومي</label>
                <select className="input" value={form.revAmountOption} onChange={(e) => setForm({ ...form, revAmountOption: e.target.value })}>
                  <option value="">اختر المقدار</option>
                  {DAILY_AMOUNT_OPTIONS.map((o) => (
                    <option key={o.label} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {form.revAmountOption === "custom" && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">حدد الكمية</label>
                    <input className="input" type="number" step="0.1" value={form.revCustom} onChange={(e) => setForm({ ...form, revCustom: e.target.value })} />
                  </div>
                  <select className="input w-28" value={form.revCustomUnit} onChange={(e) => setForm({ ...form, revCustomUnit: e.target.value })}>
                    <option value="pages">صفحة</option>
                    <option value="juz">جزء</option>
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex gap-2">
                <input className="input" placeholder="من سورة" value={form.revFromSurah} onChange={(e) => setForm({ ...form, revFromSurah: e.target.value })} />
                <input className="input w-24" type="number" placeholder="آية" value={form.revFromAyah} onChange={(e) => setForm({ ...form, revFromAyah: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <input className="input" placeholder="إلى سورة" value={form.revToSurah} onChange={(e) => setForm({ ...form, revToSurah: e.target.value })} />
                <input className="input w-24" type="number" placeholder="آية" value={form.revToAyah} onChange={(e) => setForm({ ...form, revToAyah: e.target.value })} />
              </div>
            </div>
            {previewRevTotal !== null && form.revAmountOption && (
              <div className="mt-3 bg-sand-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-sand-500 mb-1">🔄 إجمالي المراجعة المتوقع</p>
                <p className="text-2xl font-extrabold text-sand-700">{formatPages(previewRevTotal)}</p>
              </div>
            )}
          </div>

          <div className="border border-sand-200 rounded-xl p-3">
            <p className="font-semibold text-sand-700 text-sm mb-2">المتون</p>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="من" value={form.mutoonFrom} onChange={(e) => setForm({ ...form, mutoonFrom: e.target.value })} />
              <input className="input" placeholder="إلى" value={form.mutoonTo} onChange={(e) => setForm({ ...form, mutoonTo: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">التقييم العام</label>
            <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option value="">بدون تقييم</option>
              {Object.entries(GRADE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "حفظ السجل"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف سجل الحفظ. هل أنت متأكد؟" />
    </div>
  );
};

export default Hifz;
