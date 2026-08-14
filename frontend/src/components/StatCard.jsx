import React from "react";

const StatCard = ({ label, value, icon, color = "primary" }) => {
  const colors = {
    primary: "bg-primary-50 text-primary-700",
    sand: "bg-sand-100 text-sand-700",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-extrabold text-sand-900">{value}</div>
        <div className="text-sm text-sand-500">{label}</div>
      </div>
    </div>
  );
};

export default StatCard;
