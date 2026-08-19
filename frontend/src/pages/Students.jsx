import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { resolveMediaUrl } from "../context/SettingsContext";

const emptyForm = {
  name: "",
  age: "",
  branch: "",
  department: "nursery",
  teacher: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  monthlyFee: "",
  notes: "",
};

const Students = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [search, setSearch] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);

  const canEdit = true; // الأدمن ومدير الفرع والموظف كلهم يقدروا يضيفوا/يعدلوا (الموظف مقيد بطلابه فقط من الباك اند)
  const canDelete = user.role !== "employee";

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterDept) params.department = filterDept;
    if (filterBranch) params.branch = filterBranch;
    api.get("/students", { params }).then((res) => setStudents(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [filterDept, filterBranch]);

  useEffect(() => {
    if (user.role === "super_admin") {
      api.get("/branches").then((res) => setBranches(res.data));
    }
  }, []);

  useEffect(() => {
    // تحميل المدرسين حسب الفرع المختار في الفورم
    const branchId = form.branch || (user.role !== "super_admin" ? user.branch?._id || user.branch : "");
    if (!branchId) {
      setTeachers([]);
      return;
    }
    api.get("/users", { params: { branch: branchId, role: "employee" } }).then((res) => setTeachers(res.data));
  }, [form.branch, modalOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      branch: user.role !== "super_admin" ? user.branch?._id || user.branch : "",
      teacher: user.role === "employee" ? user._id : "",
      department: user.role === "employee" && user.department !== "both" ? user.department : "nursery",
    });
    setPhotoFile(null);
    setPhotoPreview("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      age: s.age || "",
      branch: s.branch?._id || s.branch,
      department: s.department,
      teacher: s.teacher?._id || "",
      guardianName: s.guardianName || "",
      guardianPhone: s.guardianPhone || "",
      address: s.address || "",
      monthlyFee: s.monthlyFee || "",
      notes: s.notes || "",
    });
    setPhotoFile(null);
    setPhotoPreview(s.photoUrl ? resolveMediaUrl(s.photoUrl) : "");
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
        await api.delete(`/students/${editing._id}/photo`);
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
      const payload = { ...form, teacher: form.teacher || null };
      let studentId = editing?._id;
      if (editing) {
        await api.put(`/students/${editing._id}`, payload);
      } else {
        const res = await api.post("/students", payload);
        studentId = res.data._id;
      }
      if (photoFile && studentId) {
        const fd = new FormData();
        fd.append("photo", photoFile);
        await api.put(`/students/${studentId}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/students/${deleteId}`);
    load();
  };

  const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sand-900">إدارة الطلاب</h1>
        {canEdit && (
          <button className="btn-primary" onClick={openCreate}>
            + إضافة طالب
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input max-w-xs" placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[160px]" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">كل الأقسام</option>
          <option value="nursery">الحضانة</option>
          <option value="quran">الكتاب</option>
        </select>
        {user.role === "super_admin" && (
          <select className="input max-w-[200px]" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        )}
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
                <th>السن</th>
                {user.role === "super_admin" && <th>الفرع</th>}
                <th>القسم</th>
                <th>المدرس</th>
                <th>ولي الأمر</th>
                <th>الهاتف</th>
                <th>الرسوم</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td>
                    {s.photoUrl ? (
                      <img src={resolveMediaUrl(s.photoUrl)} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sand-100 flex items-center justify-center text-sand-400 text-xs">👤</div>
                    )}
                  </td>
                  <td className="font-semibold">{s.name}</td>
                  <td>{s.age || "—"}</td>
                  {user.role === "super_admin" && <td>{s.branch?.name}</td>}
                  <td>
                    <span className={`badge ${s.department === "nursery" ? "bg-primary-50 text-primary-700" : "bg-sand-100 text-sand-700"}`}>
                      {s.department === "nursery" ? "حضانة" : "كتاب"}
                    </span>
                  </td>
                  <td>{s.teacher?.name || <span className="text-sand-400">غير مُعيّن</span>}</td>
                  <td>{s.guardianName || "—"}</td>
                  <td>{s.guardianPhone || "—"}</td>
                  <td>{s.monthlyFee ? `${s.monthlyFee} جنيه` : "—"}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-ghost" onClick={() => openEdit(s)}>تعديل</button>
                        {canDelete && (
                          <button className="btn-ghost text-red-500" onClick={() => setDeleteId(s._id)}>حذف</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-sand-400 py-8">لا يوجد طلاب</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل بيانات الطالب" : "إضافة طالب"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}
          <div className="flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="معاينة" className="w-16 h-16 rounded-full object-cover border border-sand-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center text-2xl text-sand-400">👤</div>
            )}
            <div className="flex-1">
              <label className="label">صورة الطالب</label>
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
              <label className="label">اسم الطالب</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">السن</label>
              <input className="input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            {user.role === "super_admin" && (
              <div>
                <label className="label">الفرع</label>
                <select className="input" required value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value, teacher: "" })}>
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
                <option value="nursery">الحضانة</option>
                <option value="quran">الكتاب</option>
              </select>
            </div>
            <div>
              <label className="label">المدرس المسؤول</label>
              <select className="input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
                <option value="">بدون تعيين</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الرسوم الشهرية</label>
              <input className="input" type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} />
            </div>
            <div>
              <label className="label">اسم ولي الأمر</label>
              <input className="input" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
            </div>
            <div>
              <label className="label">هاتف ولي الأمر</label>
              <input className="input" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">العنوان</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn-primary w-full justify-center">{editing ? "حفظ التعديلات" : "إضافة الطالب"}</button>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف الطالب نهائيًا. هل أنت متأكد؟" />
    </div>
  );
};

export default Students;