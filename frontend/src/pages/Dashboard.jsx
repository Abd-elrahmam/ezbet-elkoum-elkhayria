import React, { useEffect, useState } from "react";
import api from "../api/axios";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";

import {
  TbBuildingSkyscraper,
  TbSchool,
  TbUsers,
  TbBabyCarriage,
  TbBook,
  TbCash,
  TbReceipt,
} from "react-icons/tb";

const todayArabic = () =>
  new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
            label={
              user?.department === "nursery"
                ? "عدد طلاب حضانتي"
                : user?.department === "quran"
                ? "عدد طلاب حلقتي"
                : "عدد طلابي"
            }
            value={fmt(stats?.myStudentsCount)}
            icon={<TbSchool className="text-2xl" />}
            color="primary"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {user?.role === "super_admin" && (
            <StatCard
              label="عدد الفروع"
              value={stats?.branchesCount ?? "—"}
              icon={<TbBuildingSkyscraper className="text-2xl" />}
              color="blue"
            />
          )}
          <StatCard
            label="عدد الطلاب"
            value={fmt(stats?.studentsCount)}
            icon={<TbSchool className="text-2xl" />}
            color="primary"
          />
          <StatCard
            label="عدد الموظفين"
            value={fmt(stats?.employeesCount)}
            icon={<TbUsers className="text-2xl" />}
            color="sand"
          />
          <StatCard
            label="طلاب الحضانة"
            value={fmt(stats?.nurseryCount)}
            icon={<TbBabyCarriage className="text-2xl" />}
            color="primary"
          />
          <StatCard
            label="طلاب الكتاب"
            value={fmt(stats?.quranCount)}
            icon={<TbBook className="text-2xl" />}
            color="sand"
          />
          <StatCard
            label="إيرادات الشهر"
            value={`${fmt(stats?.incomeThisMonth)} جنيه`}
            icon={<TbCash className="text-2xl" />}
            color="primary"
          />
          <StatCard
            label="مصروفات الشهر"
            value={`${fmt(stats?.expensesThisMonth)} جنيه`}
            icon={<TbReceipt className="text-2xl" />}
            color="red"
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;