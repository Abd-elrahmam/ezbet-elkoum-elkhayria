import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BRANCH_MANAGER: "branch_manager",
  EMPLOYEE: "employee",
};

export const ROLE_LABELS = {
  super_admin: "أدمن رئيسي",
  branch_manager: "مدير فرع",
  employee: "موظف",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("bilal_user");
    const token = localStorage.getItem("bilal_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
      // تحقق من صلاحية التوكن في الخلفية
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem("bilal_user", JSON.stringify(res.data.user));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("bilal_token", res.data.token);
    localStorage.setItem("bilal_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("bilal_token");
    localStorage.removeItem("bilal_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
