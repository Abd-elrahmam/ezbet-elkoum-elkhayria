import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";
import { resolveMediaUrl } from "../context/SettingsContext";

const emptyForm = {
  name: "",
  username: "",
  password: "",
  phone: "",
  role: "employee",
  branch: "",
  department: "both",
  jobTitle: "",
  baseSalary: "",
};

const Employees = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/users").then((res) => setUsers(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    if (user.role === "super_admin") api.get("/branches").then((res) => setBranches(res.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, branch: user.role !== "super_admin" ? user.branch?._id || user.branch : "" });
    setPhotoFile(null);
    setPhotoPreview("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      password: "",
      phone: u.phone || "",
      role: u.role,
      branch: u.branch?._id || u.branch || "",
      department: u.department || "both",
      jobTitle: u.jobTitle || "",
      baseSalary: u.baseSalary || "",
    });
    setPhotoFile(null);
    setPhotoPreview(u.photoUrl ? resolveMediaUrl(u.photoUrl) : "");
    setError("");
    setModalOpen(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = async () => {
    if (editing) {
      setSavingPhoto(true);
      try {
        await api.delete(`/users/${editing._id}/photo`);
        load();
      } finally {
        setSavingPhoto(false);
      }
    }
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      let userId = editing?._id;
      if (editing) {
        await api.put(`/users/${editing._id}`, payload);
      } else {
        const res = await api.post("/users", payload);
        userId = res.data._id;
      }
      if (photoFile && userId) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        await api.put(`/users/${userId}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/users/${deleteId}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sand-900">الموظفون ومديرو الفروع</h1>
        <button className="btn-primary" onClick={openCreate}>+ إضافة</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sand-500 p-4">جارِ التحميل...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>الدور</th>
                {user.role === "super_admin" && <th>الفرع</th>}
                <th>الوظيفة</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    {u.photoUrl ? (
                      <img src={resolveMediaUrl(u.photoUrl)} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sand-100 flex items-center justify-center text-sand-400 text-xs">👤</div>
                    )}
                  </td>
                  <td className="font-semibold">{u.name}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="badge bg-sand-100 text-sand-700">{ROLE_LABELS[u.role]}</span>
                  </td>
                  {user.role === "super_admin" && <td>{u.branch?.name || "—"}</td>}
                  <td>{u.jobTitle || "—"}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <span className={`badge ${u.active ? "bg-primary-50 text-primary-700" : "bg-red-50 text-red-600"}`}>
                      {u.active ? "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-ghost" onClick={() => openEdit(u)}>تعديل</button>
                      {u.role !== "super_admin" && (
                        <button className="btn-ghost text-red-500" onClick={() => setDeleteId(u._id)}>حذف</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={9} className="text-center text-sand-400 py-8">لا يوجد مستخدمون</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل بيانات الموظف" : "إضافة موظف / مدير"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div className="flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="معاينة" className="w-16 h-16 rounded-full object-cover border border-sand-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center text-2xl text-sand-400">👤</div>
            )}
            <div className="flex-1">
              <label className="label">الصورة الشخصية</label>
              <div className="flex gap-2">
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="input" />
                {photoPreview && (
                  <button type="button" className="btn-secondary" disabled={savingPhoto} onClick={handleRemovePhoto}>حذف</button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">الاسم الكامل</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">اسم المستخدم</label>
              <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} />
            </div>
            {(!editing || user.role === "super_admin") && (
              <div>
                <label className="label">{editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}</label>
                <input className="input" type="password" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            <div>
              <label className="label">الهاتف</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            {user.role === "super_admin" && (
              <div>
                <label className="label">الدور</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="employee">موظف</option>
                  <option value="branch_manager">مدير فرع</option>
                  <option value="super_admin">أدمن رئيسي</option>
                </select>
              </div>
            )}
            {user.role === "super_admin" && form.role !== "super_admin" && (
              <div>
                <label className="label">الفرع</label>
                <select className="input" required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="both">الاثنين</option>
                <option value="nursery">الحضانة</option>
                <option value="quran">الكتاب</option>
              </select>
            </div>
            <div>
              <label className="label">المسمى الوظيفي</label>
              <input className="input" placeholder="مثال: مدرس، إداري" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
            <div>
              <label className="label">الراتب الأساسي</label>
              <input className="input" type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "إضافة"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف المستخدم نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Employees;
