import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const emptyForm = { title: "", description: "", date: new Date().toISOString().slice(0, 10), prize: "", notes: "", branch: "" };

const Competitions = () => {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [participants, setParticipants] = useState([]); // [{employee, score}]
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/competitions").then((res) => setCompetitions(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    if (user.role === "super_admin") api.get("/branches").then((res) => setBranches(res.data));
  }, []);

  useEffect(() => {
    // تحميل الموظفين حسب الفرع المختار (أو فرع المستخدم لو مش أدمن رئيسي)
    const branchId = form.branch || (user.role !== "super_admin" ? user.branch?._id || user.branch : "");
    if (!branchId) {
      setEmployees([]);
      return;
    }
    api.get("/users", { params: { role: "employee", branch: branchId } }).then((res) => setEmployees(res.data));
  }, [form.branch, modalOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, branch: user.role !== "super_admin" ? user.branch?._id || user.branch : "" });
    setParticipants([]);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description || "",
      date: c.date?.slice(0, 10),
      prize: c.prize || "",
      notes: c.notes || "",
      branch: c.branch?._id || c.branch || "",
    });
    setParticipants(c.participants.map((p) => ({ employee: p.employee?._id, score: p.score })));
    setError("");
    setModalOpen(true);
  };

  const toggleParticipant = (employeeId) => {
    setParticipants((prev) => {
      const exists = prev.find((p) => p.employee === employeeId);
      if (exists) return prev.filter((p) => p.employee !== employeeId);
      return [...prev, { employee: employeeId, score: 0 }];
    });
  };

  const updateScore = (employeeId, score) => {
    setParticipants((prev) => prev.map((p) => (p.employee === employeeId ? { ...p, score: Number(score) } : p)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (user.role === "super_admin" && !form.branch) {
      setError("من فضلك اختر الفرع");
      return;
    }
    try {
      const winner = participants.length
        ? participants.reduce((a, b) => (b.score > a.score ? b : a)).employee
        : null;
      const payload = { ...form, participants, winner };
      if (editing) {
        await api.put(`/competitions/${editing._id}`, payload);
      } else {
        await api.post("/competitions", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/competitions/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sand-900">مسابقات الموظفين</h1>
        <button className="btn-primary" onClick={openCreate}>+ مسابقة جديدة</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sand-500">جارِ التحميل...</p>}
        {!loading && competitions.length === 0 && <p className="text-sand-400">لا توجد مسابقات بعد</p>}
        {competitions.map((c) => (
          <div key={c._id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sand-900">{c.title}</h3>
                <p className="text-sand-500 text-sm">{c.date?.slice(0, 10)}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => openEdit(c)}>تعديل</button>
                <button className="btn-ghost text-red-500" onClick={() => setDeleteId(c._id)}>حذف</button>
              </div>
            </div>
            {c.description && <p className="text-sand-600 text-sm mt-2">{c.description}</p>}
            <div className="mt-3 space-y-1">
              {c.participants.map((p) => (
                <div key={p.employee?._id} className="flex items-center justify-between text-sm">
                  <span className={p.employee?._id === c.winner?._id ? "font-bold text-primary-700" : "text-sand-700"}>
                    {p.employee?._id === c.winner?._id && "🏆 "}
                    {p.employee?.name}
                  </span>
                  <span className="text-sand-500">{p.score} نقطة</span>
                </div>
              ))}
            </div>
            {c.prize && <p className="text-xs text-sand-400 mt-2">الجائزة: {c.prize}</p>}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل المسابقة" : "مسابقة جديدة"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          {user.role === "super_admin" && (
            <div>
              <label className="label">الفرع</label>
              <select className="input" required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value, employee: "" })}>
                <option value="">اختر الفرع</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">عنوان المسابقة</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">التاريخ</label>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">الجائزة</label>
              <input className="input" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">الوصف</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">المشاركون والنقاط</label>
            <div className="border border-sand-200 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
              {employees.map((emp) => {
                const p = participants.find((x) => x.employee === emp._id);
                return (
                  <div key={emp._id} className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-sand-700 flex-1">
                      <input type="checkbox" checked={!!p} onChange={() => toggleParticipant(emp._id)} />
                      {emp.name}
                    </label>
                    {p && (
                      <input
                        type="number"
                        className="input w-24"
                        placeholder="النقاط"
                        value={p.score}
                        onChange={(e) => updateScore(emp._id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              {employees.length === 0 && <p className="text-sand-400 text-sm">لا يوجد موظفون بعد</p>}
            </div>
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "إنشاء المسابقة"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف المسابقة نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Competitions;
