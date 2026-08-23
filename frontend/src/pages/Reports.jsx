import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSettings, resolveMediaUrl } from "../context/SettingsContext";
import { formatPages } from "../utils/quran";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const PERIOD_LABELS = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };
const GRADE_LABELS = {
  excellent: "ممتاز",
  very_good: "جيد جدًا",
  good: "جيد",
  acceptable: "مقبول",
  weak: "ضعيف",
};

const monthLabel = (monthStr) => {
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
};

const getMonthBounds = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
};

const sumAttendance = (records) => {
  const summary = { present: 0, absent: 0, late: 0, excused: 0 };
  records.forEach((r) => {
    summary.present += r.presentDays || 0;
    summary.absent += r.absentDays || 0;
    summary.late += r.lateDays || 0;
    summary.excused += r.excusedDays || 0;
  });
  return summary;
};

// يحول أرقام الحضور المجمّعة (لمجموعة أشخاص) لنسب مئوية، عشان الجمع الخام يكون مضلل
const attendanceRates = (summary) => {
  const total = summary.present + summary.absent + summary.late + summary.excused;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    presentRate: pct(summary.present),
    absentRate: pct(summary.absent),
    lateRate: pct(summary.late),
    excusedRate: pct(summary.excused),
    total,
  };
};

const memRange = (r) => {
  if (!r.memFromSurah && !r.memToSurah) return null;
  return `من ${r.memFromSurah || "—"}${r.memFromAyah ? ` (آية ${r.memFromAyah})` : ""} إلى ${r.memToSurah || "—"}${r.memToAyah ? ` (آية ${r.memToAyah})` : ""}`;
};

const revRange = (r) => {
  if (!r.revFromSurah && !r.revToSurah) return null;
  return `من ${r.revFromSurah || "—"}${r.revFromAyah ? ` (آية ${r.revFromAyah})` : ""} إلى ${r.revToSurah || "—"}${r.revToAyah ? ` (آية ${r.revToAyah})` : ""}`;
};

const Reports = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const logoSrc = settings?.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.jpg";

  const [reportType, setReportType] = useState("student");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [month, setMonth] = useState(currentMonth());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (user.role === "super_admin") api.get("/branches").then((res) => setBranches(res.data));
  }, []);

  useEffect(() => {
    setSelectedPerson("");
    setReport(null);
    const branchId = user.role === "super_admin" ? selectedBranch : user.branch?._id || user.branch;
    if (!branchId || reportType === "branch") {
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
    const branchId = user.role === "super_admin" ? selectedBranch : user.branch?._id || user.branch;
    if (reportType !== "branch" && !selectedPerson) return;
    if (reportType === "branch" && !branchId) return;
    if (!month) return;

    setLoading(true);
    setError("");
    setReport(null);
    try {
      if (reportType === "student") {
        const student = students.find((s) => s._id === selectedPerson);
        const [attendanceRes, evaluationsRes, testsRes, hifzRes] = await Promise.all([
          api.get("/monthly-attendance", { params: { student: selectedPerson, month } }),
          api.get("/evaluations", { params: { student: selectedPerson, month } }),
          api.get("/tests", { params: { student: selectedPerson, month } }),
          api.get("/hifz", { params: { student: selectedPerson, month } }),
        ]);
        setReport({
          type: "student",
          person: student,
          attendance: sumAttendance(attendanceRes.data),
          evaluations: evaluationsRes.data,
          tests: testsRes.data,
          hifz: hifzRes.data[0] || null,
        });
      } else if (reportType === "employee") {
        const employee = employees.find((e) => e._id === selectedPerson);
        const [attendanceRes, salariesRes, leavesRes, hifzRes] = await Promise.all([
          api.get("/employee-attendance", { params: { employee: selectedPerson, month } }),
          api.get("/salaries", { params: { employee: selectedPerson, month } }),
          api.get("/leaves", { params: { employee: selectedPerson } }),
          api.get("/hifz", { params: { employee: selectedPerson, month } }),
        ]);
        const { start, end } = getMonthBounds(month);
        const leavesThisMonth = leavesRes.data.filter((l) => {
          const s = new Date(l.startDate);
          const e2 = new Date(l.endDate);
          return s < end && e2 >= start;
        });
        const dailySummary = { present: 0, absent: 0, late: 0, excused: 0 };
        attendanceRes.data.forEach((r) => { if (dailySummary[r.status] !== undefined) dailySummary[r.status] += 1; });
        setReport({
          type: "employee",
          person: employee,
          attendance: dailySummary,
          salary: salariesRes.data[0] || null,
          leaves: leavesThisMonth,
          hifz: hifzRes.data[0] || null,
        });
      } else {
        const branch = branches.find((b) => b._id === branchId) || { name: user.branch?.name };
        const { start, end } = getMonthBounds(month);

        const [
          studentsRes,
          employeesRes,
          attendanceRes,
          employeeAttendanceRes,
          paymentsRes,
          expensesRes,
          salariesRes,
          evaluationsRes,
          leavesRes,
          competitionsRes,
          hifzRes,
        ] = await Promise.all([
          api.get("/students", { params: { branch: branchId } }),
          api.get("/users", { params: { branch: branchId, role: "employee" } }),
          api.get("/monthly-attendance", { params: { branch: branchId, month } }),
          api.get("/employee-attendance", { params: { branch: branchId, month } }),
          api.get("/payments", { params: { branch: branchId, month } }),
          api.get("/expenses", { params: { branch: branchId, month } }),
          api.get("/salaries", { params: { branch: branchId, month } }),
          api.get("/evaluations", { params: { branch: branchId, month } }),
          api.get("/leaves", { params: { branch: branchId } }),
          api.get("/competitions", { params: { branch: branchId } }),
          api.get("/hifz", { params: { branch: branchId, month } }),
        ]);

        const studentAttendance = sumAttendance(attendanceRes.data.filter((a) => a.student));
        // حضور الموظفين بقى يومي: كل سجل = يوم واحد بحالة واحدة، فبنعد التكرارات
        const employeeAttendance = { present: 0, absent: 0, late: 0, excused: 0 };
        employeeAttendanceRes.data.forEach((r) => {
          if (employeeAttendance[r.status] !== undefined) employeeAttendance[r.status] += 1;
        });

        const totalIncome = paymentsRes.data.reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = expensesRes.data.reduce((sum, e) => sum + e.amount, 0);

        const leavesThisMonth = leavesRes.data.filter((l) => {
          const s = new Date(l.startDate);
          const e2 = new Date(l.endDate);
          return s < end && e2 >= start;
        });
        const competitionsThisMonth = competitionsRes.data.filter((c) => {
          const d = new Date(c.date);
          return d >= start && d < end;
        });

        const avgRating = evaluationsRes.data.length
          ? (evaluationsRes.data.reduce((sum, ev) => sum + ev.rating, 0) / evaluationsRes.data.length).toFixed(1)
          : null;

        setReport({
          type: "branch",
          branch,
          studentsCount: studentsRes.data.length,
          nurseryCount: studentsRes.data.filter((s) => s.department === "nursery").length,
          quranCount: studentsRes.data.filter((s) => s.department === "quran").length,
          employeesCount: employeesRes.data.length,
          studentAttendance,
          employeeAttendance,
          totalIncome,
          totalExpenses,
          paymentsCount: paymentsRes.data.length,
          expensesCount: expensesRes.data.length,
          salaries: salariesRes.data,
          avgRating,
          evaluationsCount: evaluationsRes.data.length,
          leaves: leavesThisMonth,
          competitions: competitionsThisMonth,
          hifzCount: hifzRes.data.length,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "حدث خطأ أثناء تجهيز التقرير");
    } finally {
      setLoading(false);
    }
  };

  const reportTitle = { student: "للطالب", employee: "للموظف", branch: "للفرع" }[reportType];

  return (
    <div>
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-sand-900 mb-6">التقارير الشهرية</h1>

        <div className="card space-y-4 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">نوع التقرير</label>
              <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="student">تقرير طالب</option>
                <option value="employee">تقرير موظف</option>
                <option value="branch">تقرير فرع شامل</option>
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
            {reportType !== "branch" && (
              <div>
                <label className="label">{reportType === "student" ? "الطالب" : "الموظف"}</label>
                <select className="input" value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)}>
                  <option value="">{reportType === "student" ? "اختر الطالب" : "اختر الموظف"}</option>
                  {(reportType === "student" ? students : employees).map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-3 py-2">{error}</div>}

          <button
            className="btn-primary"
            disabled={(reportType !== "branch" && !selectedPerson) || loading}
            onClick={generateReport}
          >
            {loading ? "جارِ التجهيز..." : "إنشاء التقرير"}
          </button>
        </div>
      </div>

      {report && (
        <div className="print:block">
          <div className="flex justify-end mb-4 print:hidden">
            <button className="btn-primary" onClick={() => window.print()}>🖨️ طباعة التقرير</button>
          </div>

          <div className="card print:shadow-none print:border-none print:p-0">
            <div className="flex items-center gap-4 border-b-2 border-primary-600 pb-4 mb-6">
              <img src={logoSrc} alt="الشعار" className="w-16 h-16 rounded-full object-cover border border-sand-200" />
              <div>
                <h2 className="text-xl font-bold text-sand-900">{settings?.heroTitle || "جمعية العلوم الخيرية بعزبة الكوم"}</h2>
                <p className="text-sand-500 text-sm">تقرير شهري {reportTitle} — {monthLabel(month)}</p>
              </div>
            </div>

            {report.type !== "branch" ? (
              <>
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

                <ReportSection title="الحضور والغياب">
                  <div className="grid grid-cols-4 gap-3">
                    <MiniStat label="حاضر" value={report.attendance.present} color="text-primary-700" />
                    <MiniStat label="غائب" value={report.attendance.absent} color="text-red-600" />
                    <MiniStat label="متأخر" value={report.attendance.late} color="text-amber-600" />
                    <MiniStat label="مُعتذر" value={report.attendance.excused} color="text-sand-500" />
                  </div>
                </ReportSection>

                <ReportSection title="الحفظ الشهري">
                  {report.hifz ? (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-primary-50 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs text-primary-600 mb-1">📖 إجمالي الحفظ الجديد</p>
                          <p className="text-lg font-extrabold text-primary-700">{formatPages(report.hifz.totalMemPages)}</p>
                        </div>
                        <div className="bg-sand-100 rounded-xl px-3 py-2 text-center">
                          <p className="text-xs text-sand-500 mb-1">🔄 إجمالي المراجعة</p>
                          <p className="text-lg font-extrabold text-sand-700">{formatPages(report.hifz.totalRevisionPages)}</p>
                        </div>
                      </div>
                      {memRange(report.hifz) && (
                        <p><span className="text-sand-500">الحفظ الجديد: </span><span className="font-semibold">{memRange(report.hifz)}</span></p>
                      )}
                      {revRange(report.hifz) && (
                        <p><span className="text-sand-500">المراجعة: </span><span className="font-semibold">{revRange(report.hifz)}</span></p>
                      )}
                      {(report.hifz.mutoonFrom || report.hifz.mutoonTo) && (
                        <p><span className="text-sand-500">المتون: </span><span className="font-semibold">من {report.hifz.mutoonFrom || "—"} إلى {report.hifz.mutoonTo || "—"}</span></p>
                      )}
                      {report.hifz.grade && (
                        <span className="badge bg-primary-50 text-primary-700">التقييم: {GRADE_LABELS[report.hifz.grade]}</span>
                      )}
                      {report.hifz.notes && <p className="text-sand-500 pt-1">ملاحظات: {report.hifz.notes}</p>}
                    </div>
                  ) : (
                    <EmptyNote text="لا يوجد سجل حفظ لهذا الشهر" />
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
              </>
            ) : (
              <>
                <div className="mb-6 bg-sand-50 rounded-xl p-4 print:bg-transparent">
                  <span className="text-sand-500 text-sm">الفرع: </span>
                  <span className="font-bold text-lg">{report.branch?.name}</span>
                </div>

                <ReportSection title="نظرة عامة">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MiniStat label="إجمالي الطلاب" value={report.studentsCount} color="text-primary-700" />
                    <MiniStat label="طلاب الحضانة" value={report.nurseryCount} color="text-primary-700" />
                    <MiniStat label="طلاب الكتاب" value={report.quranCount} color="text-sand-700" />
                    <MiniStat label="عدد الموظفين" value={report.employeesCount} color="text-sand-700" />
                  </div>
                </ReportSection>

                <ReportSection title="ملخص حضور الطلاب">
                  {(() => {
                    const rates = attendanceRates(report.studentAttendance);
                    return (
                      <div className="grid grid-cols-4 gap-3">
                        <MiniStat label="نسبة الحضور" value={`${rates.presentRate}%`} color="text-primary-700" />
                        <MiniStat label="نسبة الغياب" value={`${rates.absentRate}%`} color="text-red-600" />
                        <MiniStat label="نسبة التأخير" value={`${rates.lateRate}%`} color="text-amber-600" />
                        <MiniStat label="نسبة الأعذار" value={`${rates.excusedRate}%`} color="text-sand-500" />
                      </div>
                    );
                  })()}
                </ReportSection>

                <ReportSection title="ملخص حضور الموظفين">
                  {(() => {
                    const rates = attendanceRates(report.employeeAttendance);
                    return (
                      <div className="grid grid-cols-4 gap-3">
                        <MiniStat label="نسبة الحضور" value={`${rates.presentRate}%`} color="text-primary-700" />
                        <MiniStat label="نسبة الغياب" value={`${rates.absentRate}%`} color="text-red-600" />
                        <MiniStat label="نسبة التأخير" value={`${rates.lateRate}%`} color="text-amber-600" />
                        <MiniStat label="نسبة الأعذار" value={`${rates.excusedRate}%`} color="text-sand-500" />
                      </div>
                    );
                  })()}
                </ReportSection>

                <ReportSection title="الملخص المالي">
                  <PrintTable
                    headers={["البند", "القيمة"]}
                    rows={[
                      ["إجمالي الإيرادات (المدفوعات)", `${report.totalIncome.toLocaleString("ar-EG")} جنيه (${report.paymentsCount} دفعة)`],
                      ["إجمالي المصروفات", `${report.totalExpenses.toLocaleString("ar-EG")} جنيه (${report.expensesCount} مصروف)`],
                      ["صافي الفرع هذا الشهر", `${(report.totalIncome - report.totalExpenses).toLocaleString("ar-EG")} جنيه`],
                    ]}
                  />
                </ReportSection>

                <ReportSection title="الرواتب">
                  {report.salaries.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <MiniStat label="عدد الرواتب المسجلة" value={report.salaries.length} color="text-sand-700" />
                        <MiniStat label="مدفوعة" value={report.salaries.filter((s) => s.paid).length} color="text-primary-700" />
                        <MiniStat label="غير مدفوعة" value={report.salaries.filter((s) => !s.paid).length} color="text-red-600" />
                      </div>
                      <PrintTable
                        headers={["الموظف", "الصافي", "الحالة"]}
                        rows={report.salaries.map((s) => [s.employee?.name, `${s.netSalary} جنيه`, s.paid ? "مدفوع" : "غير مدفوع"])}
                      />
                    </>
                  ) : (
                    <EmptyNote text="لا توجد رواتب مسجلة هذا الشهر" />
                  )}
                </ReportSection>

                <ReportSection title="تقييمات الطلاب والحفظ الشهري">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="عدد التقييمات" value={report.evaluationsCount} color="text-sand-700" />
                    <MiniStat label="عدد سجلات الحفظ" value={report.hifzCount} color="text-sand-700" />
                  </div>
                  {report.avgRating && <p className="text-sand-700 mt-2">متوسط تقييم الطلاب: <strong>{report.avgRating} / 5</strong></p>}
                </ReportSection>

                <ReportSection title="طلبات الإجازة">
                  {report.leaves.length > 0 ? (
                    <PrintTable
                      headers={["الموظف", "من", "إلى", "الحالة"]}
                      rows={report.leaves.map((l) => [
                        l.employee?.name,
                        l.startDate?.slice(0, 10),
                        l.endDate?.slice(0, 10),
                        l.status === "approved" ? "مقبولة" : l.status === "rejected" ? "مرفوضة" : "قيد المراجعة",
                      ])}
                    />
                  ) : (
                    <EmptyNote text="لا توجد إجازات هذا الشهر" />
                  )}
                </ReportSection>

                <ReportSection title="مسابقات الموظفين">
                  {report.competitions.length > 0 ? (
                    <PrintTable
                      headers={["العنوان", "التاريخ", "الفائز"]}
                      rows={report.competitions.map((c) => [c.title, c.date?.slice(0, 10), c.winner?.name || "—"])}
                    />
                  ) : (
                    <EmptyNote text="لا توجد مسابقات هذا الشهر" />
                  )}
                </ReportSection>
              </>
            )}

            {report.type === "student" && (
              <div className="grid grid-cols-2 gap-8 mt-10 pt-6">
                <div className="text-center">
                  <div className="border-t border-sand-400 pt-2 mt-8 mx-6">
                    <p className="text-sand-600 text-sm font-semibold">توقيع ولي الأمر</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-sand-400 pt-2 mt-8 mx-6">
                    <p className="text-sand-600 text-sm font-semibold">توقيع مدير الفرع</p>
                  </div>
                </div>
              </div>
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
  <table className="w-full text-sm border-collapse mb-2">
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
