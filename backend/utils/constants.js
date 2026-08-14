// الأدوار في النظام
const ROLES = {
  SUPER_ADMIN: "super_admin", // الأدمن الرئيسي - كل الصلاحيات
  BRANCH_MANAGER: "branch_manager", // مدير فرع - صلاحيات كاملة على فرعه فقط
  EMPLOYEE: "employee", // موظف / مدرس - صلاحيات محدودة
};

// الأقسام: الحضانة والكتاب منفصلان تمامًا في البيانات
const DEPARTMENTS = {
  NURSERY: "nursery", // الحضانة
  QURAN: "quran", // الكتاب (تحفيظ القرآن)
};

// أنواع الاختبارات
const TEST_TYPES = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

// حالات الحضور
const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
};

module.exports = { ROLES, DEPARTMENTS, TEST_TYPES, ATTENDANCE_STATUS };
