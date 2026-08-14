const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const { protect, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();
router.use(protect);

// جلب الطلبات: الموظف يشوف طلباته هو بس، مدير الفرع/الأدمن يشوفوا طلبات فرعهم (أو الكل للأدمن)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.EMPLOYEE) {
    filter.employee = req.user._id;
  } else if (req.user.role === ROLES.BRANCH_MANAGER) {
    filter.branch = req.user.branch;
  } else if (req.query.branch) {
    filter.branch = req.query.branch;
  }
  if (req.query.status) filter.status = req.query.status;

  const requests = await LeaveRequest.find(filter)
    .populate("employee", "name jobTitle")
    .populate("branch", "name")
    .populate("reviewedBy", "name")
    .sort({ createdAt: -1 });
  res.json(requests);
});

// تقديم طلب إجازة جديد (أي مستخدم مرتبط بفرع)
router.post("/", async (req, res) => {
  try {
    if (!req.user.branch) {
      return res.status(400).json({ message: "حسابك غير مرتبط بفرع" });
    }
    const { startDate, endDate, reason } = req.body;
    const request = await LeaveRequest.create({
      employee: req.user._id,
      branch: req.user.branch,
      startDate,
      endDate,
      reason,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: "فشل تقديم الطلب", error: err.message });
  }
});

// الموافقة أو الرفض: مدير الفرع أو الأدمن الرئيسي
router.put("/:id/review", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  try {
    const { status, reviewNote } = req.body; // approved | rejected
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صحيحة" });
    }
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (req.user.role === ROLES.BRANCH_MANAGER && request.branch.toString() !== req.user.branch.toString()) {
      return res.status(403).json({ message: "لا يمكنك مراجعة طلب من فرع آخر" });
    }
    request.status = status;
    request.reviewNote = reviewNote || "";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: "فشل تحديث الطلب", error: err.message });
  }
});

// حذف طلب (صاحب الطلب لو لسه معلّق، أو الأدمن)
router.delete("/:id", async (req, res) => {
  const request = await LeaveRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

  const isOwner = request.employee.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.SUPER_ADMIN;
  const isManagerOfBranch =
    req.user.role === ROLES.BRANCH_MANAGER && request.branch.toString() === req.user.branch.toString();

  if (!isAdmin && !isManagerOfBranch && !(isOwner && request.status === "pending")) {
    return res.status(403).json({ message: "لا يمكنك حذف هذا الطلب" });
  }
  await request.deleteOne();
  res.json({ message: "تم حذف الطلب" });
});

module.exports = router;
