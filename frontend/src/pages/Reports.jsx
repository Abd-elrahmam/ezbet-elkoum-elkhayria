import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const PERIOD_LABELS = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };
const STATUS_LABELS = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "مُعتذر" };

const monthLabel = (monthStr) => {
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
};

const Reports = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const logoSrc = settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg";

  const [reportType, setReportType] = useState("student"); // student | employee
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null); // { person, attendance, evaluations, tests, salary, leaves }

  useEffect(() => {
    if (user.role === "super_admin") api.get("/branches").then((res) => setBranches(res.data));
  }, []);

  // تحميل قائمة الطلاب/الموظفين حسب الفرع المختار (أو فرع المستخدم لو مدير فرع)
  useEffect(() => {
    setSelectedPerson("");
    setReport(null);
    const branchId = user.role === "super_admin" ? selectedBranch : user.branch?._id || user.branch;
    if (!branchId) {
      setStudents([]);
      setEmployees([]);
      return;
    }
    if (reportType === "student") {
      api.get("/students", { params: { branch: branchId } }).then((res) => setStudents(res.data));
    } else {
      api.get("/users", { params: { branch: branchId, role: "employee" } }).then((res) => setEmployees(res.data));
    }
  }, [reportType, selectedBranch]);

  const generateReport = async () => {
    if (!selectedPerson || !month) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      if (reportType === "student") {
        const student = students.find((s) => s._id === selectedPerson);
        const [attendanceRes, evaluationsRes, testsRes] = await Promise.all([
          api.get("/attendance", { params: { student: selectedPerson, month } }),
          api.get("/evaluations", { params: { student: selectedPerson, month } }),
          api.get("/tests", { params: { student: selectedPerson, month } }),
        ]);
        setReport({
          type: "student",
          person: student,
          attendance: attendanceRes.data,
          evaluations: evaluationsRes.data,
          tests: testsRes.data,
        });
      } else {
        const employee = employees.find((e) => e._id === selectedPerson);
        const [attendanceRes, salariesRes, leavesRes] = await Promise.all([
          api.get("/attendance", { params: { employee: selectedPerson, month } }),
          api.get("/salaries", { params: { employee: selectedPerson, month } }),
          api.get("/leaves", { params: { employee: selectedPerson } }),
        ]);
        const { start, end } = (() => {
          const [y, m] = month.split("-").map(Number);
          return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
        })();
        const leavesThisMonth = leavesRes.data.filter((l) => {
          const s = new Date(l.startDate);
          const e2 = new Date(l.endDate);
          return s < end && e2 >= start;
        });
        setReport({
          type: "employee",
          person: employee,
          attendance: attendanceRes.data,
          salary: salariesRes.data[0] || null,
          leaves: leavesThisMonth,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تجهيز التقرير");
    } finally {
      setLoading(false);
    }
  };

  const attendanceSummary = (records) => {
    const summary = { present: 0, absent: 0, late: 0, excused: 0, total: records.length };
    records.forEach((r) => { summary[r.status] = (summary[r.status] || 0) + 1; });
    return summary;
  };

  return (
    <div>
      {/* شاشة الاختيار - تختفي عند الطباعة */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-sand-900 mb-6">التقارير الشهرية</h1>

        <div className="card space-y-4 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">نوع التقرير</label>
              <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="student">تقرير طالب</option>
                <option value="employee">تقرير موظف</option>
              </select>
            </div>
            <div>
              <label className="label">الشهر</label>
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {user.role === "super_admin" && (
              <div>
                <label className="label">الفرع</label>
                <select className="input" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                  <option value="">اختر الفرع</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">{reportType === "student" ? "الطالب" : "الموظف"}</label>
              <select className="input" value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)}>
                <option value="">{reportType === "student" ? "اختر الطالب" : "اختر الموظف"}</option>
                {(reportType === "student" ? students : employees).map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

          <button className="btn-primary" disabled={!selectedPerson || loading} onClick={generateReport}>
            {loading ? "جارِ التجهيز..." : "إنشاء التقرير"}
          </button>
        </div>
      </div>

      {/* التقرير نفسه - ده اللي بيتطبع */}
      {report && (
        <div className="print:block">
          <div className="flex justify-end mb-4 print:hidden">
            <button className="btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير</button>
          </div>

          <div className="card print:shadow-none print:border-none print:p-0">
            {/* هيدر التقرير */}
            <div className="flex items-center gap-4 border-b-2 border-primary-600 pb-4 mb-6">
              <img src={logoSrc} alt="الشعار" className="w-16 h-16 rounded-full object-cover border border-sand-200" />
              <div>
                <h2 className="text-xl font-bold text-sand-900">{settings?.heroTitle || "جمعية العلوم الخيرية بعزبة الكوم"}</h2>
                <p className="text-sand-500 text-sm">تقرير شهري {report.type === "student" ? "للطالب" : "للموظف"} — {monthLabel(month)}</p>
              </div>
            </div>

            {/* بيانات الشخص */}
            <div className="grid sm:grid-cols-2 gap-3 mb-6 bg-sand-50 rounded-xl p-4 print:bg-transparent">
              <div><span className="text-sand-500 text-sm">الاسم: </span><span className="font-bold">{report.person?.name}</span></div>
              {report.type === "student" ? (
                <>
                  <div><span className="text-sand-500 text-sm">القسم: </span><span className="font-bold">{report.person?.department === "nursery" ? "الحضانة" : "الكتاب"}</span></div>
                  <div><span className="text-sand-500 text-sm">المدرس: </span><span className="font-bold">{report.person?.teacher?.name || "—"}</span></div>
                  <div><span className="text-sand-500 text-sm">ولي الأمر: </span><span className="font-bold">{report.person?.guardianName || "—"}</span></div>
                </>
              ) : (
                <>
                  <div><span className="text-sand-500 text-sm">الوظيفة: </span><span className="font-bold">{report.person?.jobTitle || "—"}</span></div>
                  <div><span className="text-sand-500 text-sm">القسم: </span><span className="font-bold">{report.person?.department === "nursery" ? "الحضانة" : report.person?.department === "quran" ? "الكتاب" : "الاثنين"}</span></div>
                </>
              )}
            </div>

            {/* ملخص الحضور */}
            <ReportSection title="الحضور والغياب">
              {(() => {
                const s = attendanceSummary(report.attendance);
                return (
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <MiniStat label="حاضر" value={s.present} color="text-primary-700" />
                    <MiniStat label="غائب" value={s.absent} color="text-red-600" />
                    <MiniStat label="متأخر" value={s.late} color="text-amber-600" />
                    <MiniStat label="مُعتذر" value={s.excused} color="text-sand-500" />
                  </div>
                );
              })()}
              {report.attendance.length > 0 ? (
                <PrintTable
                  headers={["التاريخ", "الحالة"]}
                  rows={report.attendance.map((a) => [a.date?.slice(0, 10), STATUS_LABELS[a.status]])}
                />
              ) : (
                <EmptyNote text="لا توجد سجلات حضور هذا الشهر" />
              )}
            </ReportSection>

            {report.type === "student" && (
              <>
                <ReportSection title="التقييمات">
                  {report.evaluations.length > 0 ? (
                    <PrintTable
                      headers={["التاريخ", "الفترة", "التقييم العام", "الحفظ", "السلوك", "المشاركة", "ملاحظات"]}
                      rows={report.evaluations.map((ev) => [
                        ev.date?.slice(0, 10),
                        PERIOD_LABELS[ev.period],
                        `${ev.rating}/5`,
                        ev.memorization ? `${ev.memorization}/5` : "—",
                        ev.behavior ? `${ev.behavior}/5` : "—",
                        ev.participation ? `${ev.participation}/5` : "—",
                        ev.notes || "—",
                      ])}
                    />
                  ) : (
                    <EmptyNote text="لا توجد تقييمات هذا الشهر" />
                  )}
                </ReportSection>

                <ReportSection title="الاختبارات (التسميع)">
                  {report.tests.length > 0 ? (
                    <PrintTable
                      headers={["التاريخ", "النوع", "العنوان", "الدرجة"]}
                      rows={report.tests.map((t) => [t.date?.slice(0, 10), t.type === "weekly" ? "أسبوعي" : "شهري", t.title, `${t.score}/${t.maxScore}`])}
                    />
                  ) : (
                    <EmptyNote text="لا توجد نتائج اختبارات هذا الشهر" />
                  )}
                </ReportSection>
              </>
            )}

            {report.type === "employee" && (
              <>
                <ReportSection title="الراتب">
                  {report.salary ? (
                    <PrintTable
                      headers={["الأساسي", "المكافآت", "الخصومات", "الصافي", "الحالة"]}
                      rows={[[
                        `${report.salary.baseSalary} جنيه`,
                        `${report.salary.bonuses} جنيه`,
                        `${report.salary.deductions} جنيه`,
                        `${report.salary.netSalary} جنيه`,
                        report.salary.paid ? "مدفوع" : "غير مدفوع",
                      ]]}
                    />
                  ) : (
                    <EmptyNote text="لا يوجد راتب مسجل لهذا الشهر" />
                  )}
                </ReportSection>

                <ReportSection title="الإجازات">
                  {report.leaves.length > 0 ? (
                    <PrintTable
                      headers={["من", "إلى", "السبب", "الحالة"]}
                      rows={report.leaves.map((l) => [
                        l.startDate?.slice(0, 10),
                        l.endDate?.slice(0, 10),
                        l.reason,
                        l.status === "approved" ? "مقبولة" : l.status === "rejected" ? "مرفوضة" : "قيد المراجعة",
                      ])}
                    />
                  ) : (
                    <EmptyNote text="لا توجد إجازات هذا الشهر" />
                  )}
                </ReportSection>
              </>
            )}

            <div className="mt-8 pt-4 border-t border-sand-200 text-center text-xs text-sand-400">
              تم إصدار هذا التقرير آليًا من نظام إدارة {settings?.heroTitle || "الجمعية"} بتاريخ {new Date().toLocaleDateString("ar-EG")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportSection = ({ title, children }) => (
  <div className="mb-6 break-inside-avoid">
    <h3 className="font-bold text-sand-800 bg-sand-100 print:bg-sand-50 rounded-lg px-3 py-1.5 mb-3">{title}</h3>
    {children}
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div className="text-center bg-white border border-sand-100 rounded-lg py-2">
    <div className={`text-lg font-extrabold ${color}`}>{value}</div>
    <div className="text-xs text-sand-500">{label}</div>
  </div>
);

const PrintTable = ({ headers, rows }) => (
  <table className="w-full text-sm border-collapse">
    <thead>
      <tr>
        {headers.map((h) => (
          <th key={h} className="text-right px-2 py-1.5 bg-sand-50 border-b border-sand-200 text-sand-600 font-semibold">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j} className="px-2 py-1.5 border-b border-sand-100">{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const EmptyNote = ({ text }) => <p className="text-sand-400 text-sm">{text}</p>;

export default Reports;
