const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLES } = require("../utils/constants");

// التحقق من تسجيل الدخول عن طريق التوكن
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "غير مصرح - يرجى تسجيل الدخول" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ message: "المستخدم غير موجود أو غير مفعّل" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "توكن غير صالح أو منتهي" });
  }
};

// السماح فقط لأدوار معينة
const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "ليس لديك صلاحية لتنفيذ هذا الإجراء" });
  }
  next();
};

// يتأكد إن مدير الفرع/الموظف بيتعامل بس مع بيانات فرعه
// الأدمن الرئيسي معفي من القيد ده تلقائيًا
const scopeToOwnBranch = (req, res, next) => {
  if (req.user.role === ROLES.SUPER_ADMIN) return next();

  const bodyBranch = req.body.branch;
  const queryBranch = req.query.branch;
  const userBranch = req.user.branch ? req.user.branch.toString() : null;

  if (!userBranch) {
    return res.status(403).json({ message: "حسابك غير مرتبط بأي فرع" });
  }
  // فرض فرع المستخدم في أي إنشاء/استعلام إن لم يطابق فرعه
  if (bodyBranch && bodyBranch !== userBranch) {
    return res.status(403).json({ message: "لا يمكنك التعامل مع بيانات فرع آخر" });
  }
  if (queryBranch && queryBranch !== userBranch) {
    return res.status(403).json({ message: "لا يمكنك التعامل مع بيانات فرع آخر" });
  }
  // فرض فرع المستخدم تلقائيًا لو مش متبعت
  if (!bodyBranch && req.method !== "GET") req.body.branch = userBranch;
  req.effectiveBranch = userBranch;
  next();
};

module.exports = { protect, allowRoles, scopeToOwnBranch };
