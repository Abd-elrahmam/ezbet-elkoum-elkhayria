import { useAuth } from "../context/AuthContext";

// لو الموظف أو مدير الفرع محدد له قسم واحد بس (كتاب أو حضانة) في بروفايله،
// مفروض ميتسألش يختار القسم في كل صفحة - يتفرض عليه القسم ده تلقائيًا.
// لو قسمه "الاثنين" (أو هو أدمن رئيسي)، يفضل يقدر يختار بين القسمين زي العادة.
export const useDepartmentAccess = () => {
  const { user } = useAuth();
  const isRestricted =
    (user.role === "employee" || user.role === "branch_manager") &&
    user.department &&
    user.department !== "both";

  return {
    locked: isRestricted,
    department: isRestricted ? user.department : null, // "quran" | "nursery" | null
  };
};
