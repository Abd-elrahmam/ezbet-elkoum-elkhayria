import React, { useEffect, useState } from "react";
import api from "../api/axios";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";

const todayArabic = () =>
  new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setStats(res.data));
  }, []);

  const fmt = (n) => new Intl.NumberFormat("ar-EG").format(n || 0);
  const isEmployee = user?.role === "employee";

  return (
    <div>
      <div className="mb-6">
        <p className="text-primary-600 text-sm font-semibold mb-1">{todayArabic()}</p>
        <h1 className="text-2xl font-bold text-sand-900">أهلاً، {user?.name} 👋</h1>
        <p className="text-sand-500">نظرة سريعة على النظام</p>
      </div>

      {isEmployee ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label={user?.department === "nursery" ? "عدد طلاب حضانتي" : user?.department === "quran" ? "عدد طلاب حلقتي" : "عدد طلابي"}
            value={fmt(stats?.myStudentsCount)}
            icon="🎓"
            color="primary"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {user?.role === "super_admin" && (
            <StatCard label="عدد الفروع" value={stats?.branchesCount ?? "—"} icon="🏢" color="blue" />
          )}
          <StatCard label="عدد الطلاب" value={fmt(stats?.studentsCount)} icon="🎓" color="primary" />
          <StatCard label="عدد الموظفين" value={fmt(stats?.employeesCount)} icon="👥" color="sand" />
          <StatCard label="طلاب الحضانة" value={fmt(stats?.nurseryCount)} icon="🧸" color="primary" />
          <StatCard label="طلاب الكتاب" value={fmt(stats?.quranCount)} icon="📖" color="sand" />
          <StatCard label="إيرادات الشهر" value={`${fmt(stats?.incomeThisMonth)} جنيه`} icon="💵" color="primary" />
          <StatCard label="مصروفات الشهر" value={`${fmt(stats?.expensesThisMonth)} جنيه`} icon="🧾" color="red" />
        </div>
      )}

      {user?.role === "super_admin" && stats?.performance && (
        <div className="card">
          <h2 className="font-bold text-sand-800 mb-4">📊 الأداء العام هذا الشهر</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <PerformanceBar label="نسبة الحضور" value={stats.performance.attendanceRate} />
            <PerformanceBar label="متوسط تقييم الطلاب" value={stats.performance.evaluationRate} />
            <PerformanceBar label="نسبة الرواتب المدفوعة" value={stats.performance.salariesPaidRate} />
            <PerformanceBar label="نسبة قبول الإجازات" value={stats.performance.leaveApprovalRate} />
          </div>
        </div>
      )}

      {/* <div className="card">
        <h2 className="font-bold text-sand-800 mb-2">تنقّل سريع</h2>
        <p className="text-sand-500 text-sm">
          استخدم القائمة الجانبية للوصول إلى الطلاب، الحضور والغياب، الاختبارات، تقييم الطلاب، طلبات الإجازة، والرواتب.
        </p>
      </div> */}
    </div>
  );
};

const PerformanceBar = ({ label, value }) => {
  const hasValue = value !== null && value !== undefined;
  const color = !hasValue ? "bg-sand-200" : value >= 75 ? "bg-primary-600" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-sand-600">{label}</span>
        <span className="font-bold text-sand-900">{hasValue ? `${value}%` : "لا بيانات"}</span>
      </div>
      <div className="h-2.5 rounded-full bg-sand-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${hasValue ? value : 0}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
