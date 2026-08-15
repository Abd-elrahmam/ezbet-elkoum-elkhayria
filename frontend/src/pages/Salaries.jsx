import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  employee: "",
  month: currentMonth(),
  baseSalary: "",
  bonuses: "0",
  deductions: "0",
  paid: false,
  notes: "",
};

const Salaries = () => {
  const { user } = useAuth();
  const canManage = user.role !== "employee";
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // مدير الفرع مايقدرش يتعامل مع سجل راتبه هو
  const isOwnSalary = (s) => user.role === "branch_manager" && s.employee?._id === user._id;

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterMonth) params.month = filterMonth;
    api.get("/salaries", { params }).then((res) => setSalaries(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterMonth]);
  useEffect(() => {
    if (canManage) api.get("/users").then((res) => setEmployees(res.data.filter((u) => u.role !== "super_admin")));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      employee: s.employee?._id || "",
      month: s.month,
      baseSalary: s.baseSalary,
      bonuses: s.bonuses,
      deductions: s.deductions,
      paid: s.paid,
      notes: s.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  const onEmployeeChange = (id) => {
    const emp = employees.find((e) => e._id === id);
    setForm({ ...form, employee: id, baseSalary: emp?.baseSalary || "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.put(`/salaries/${editing._id}`, form);
      } else {
        const emp = employees.find((x) => x._id === form.employee);
        await api.post("/salaries", { ...form, branch: emp?.branch?._id || emp?.branch });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const changeStatus = async (s, paid) => {
    await api.put(`/salaries/${s._id}`, { paid, paidDate: paid ? new Date() : null });
    load();
  };

  const handleDelete = async () => {
    await api.delete(`/salaries/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الرواتب</h1>
        {canManage && <button className="btn-primary" onClick={openCreate}>+ تسجيل راتب</button>}
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
                <th>الموظف</th>
                <th>الشهر</th>
                <th>الأساسي</th>
                <th>المكافآت</th>
                <th>الخصومات</th>
                <th>الصافي</th>
                <th>الحالة</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => {
                const own = isOwnSalary(s);
                return (
                  <tr key={s._id}>
                    <td className="font-semibold">
                      {s.employee?.name}
                      {own && <span className="text-xs text-sand-400"> (راتبك)</span>}
                    </td>
                    <td>{s.month}</td>
                    <td>{s.baseSalary?.toLocaleString("ar-EG")}</td>
                    <td className="text-primary-700">+{s.bonuses?.toLocaleString("ar-EG")}</td>
                    <td className="text-red-600">-{s.deductions?.toLocaleString("ar-EG")}</td>
                    <td className="font-bold">{s.netSalary?.toLocaleString("ar-EG")} جنيه</td>
                    <td>
                      {canManage && !own ? (
                        <select
                          value={s.paid ? "paid" : "unpaid"}
                          onChange={(e) => changeStatus(s, e.target.value === "paid")}
                          className={`input !w-auto !py-1.5 !text-xs font-semibold ${s.paid ? "!text-primary-700 !border-primary-200" : "!text-amber-600 !border-amber-200"}`}
                        >
                          <option value="unpaid">غير مدفوع</option>
                          <option value="paid">مدفوع</option>
                        </select>
                      ) : (
                        <span className={`badge ${s.paid ? "bg-primary-50 text-primary-700" : "bg-amber-50 text-amber-600"}`}>
                          {s.paid ? "مدفوع" : "غير مدفوع"}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {!own ? (
                          <div className="flex gap-2">
                            <button className="btn-ghost" onClick={() => openEdit(s)}>تعديل</button>
                            <button className="btn-ghost text-red-500" onClick={() => setDeleteId(s._id)}>حذف</button>
                          </div>
                        ) : (
                          <span className="text-xs text-sand-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {salaries.length === 0 && (
                <tr><td colSpan={8} className="text-center text-sand-400 py-8">لا توجد رواتب مسجلة</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل الراتب" : "تسجيل راتب"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="label">الموظف</label>
            <select className="input" required disabled={!!editing} value={form.employee} onChange={(e) => onEmployeeChange(e.target.value)}>
              <option value="">اختر الموظف</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الشهر</label>
            <input className="input" type="month" required disabled={!!editing} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">الأساسي</label>
              <input className="input" type="number" required value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            </div>
            <div>
              <label className="label">المكافآت</label>
              <input className="input" type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} />
            </div>
            <div>
              <label className="label">الخصومات</label>
              <input className="input" type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "تسجيل الراتب"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف سجل الراتب. هل أنت متأكد؟" />
    </div>
  );
};

export default Salaries;
