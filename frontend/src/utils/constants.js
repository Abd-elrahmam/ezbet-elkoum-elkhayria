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

// عدد أيام الشهر المعتمد في ملخصات الحضور الشهري وحساب مقدار الحفظ المتوقع (للطلاب)
const MONTH_TOTAL_DAYS = 20;

// عدد أيام الشهر المعتمد لملخص حضور الموظفين الشهري
const EMPLOYEE_MONTH_TOTAL_DAYS = 22;

// حالات مقدار الحفظ الشهري
const MEMORIZATION_STATUS = {
  NORMAL: "normal", // عادي - له مقدار حفظ متوقع محسوب
  KHATM: "khatm", // ختم القرآن كاملًا - حالة مميزة
  REVIEW_ONLY: "review_only", // مراجعة فقط - بدون مقدار حفظ جديد متوقع
};

module.exports = { ROLES, DEPARTMENTS, TEST_TYPES, ATTENDANCE_STATUS, MONTH_TOTAL_DAYS, EMPLOYEE_MONTH_TOTAL_DAYS, MEMORIZATION_STATUS };
