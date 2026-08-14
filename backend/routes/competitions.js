const express = require("express");
const Competition = require("../models/Competition");
const { protect, scopeToOwnBranch, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.branch) filter.branch = req.query.branch;
  } else {
    filter.branch = req.user.branch;
  }
  const competitions = await Competition.find(filter)
    .populate("branch", "name")
    .populate("participants.employee", "name")
    .populate("winner", "name")
    .sort({ date: -1 });
  res.json(competitions);
});

router.post("/", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), scopeToOwnBranch, async (req, res) => {
  try {
    const competition = await Competition.create(req.body);
    res.status(201).json(competition);
  } catch (err) {
    res.status(400).json({ message: "فشل إنشاء المسابقة", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
  if (req.user.role !== ROLES.SUPER_ADMIN && competition.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك تعديل مسابقة من فرع آخر" });
  }
  Object.assign(competition, req.body);
  await competition.save();
  res.json(competition);
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN, ROLES.BRANCH_MANAGER), async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).json({ message: "المسابقة غير موجودة" });
  if (req.user.role !== ROLES.SUPER_ADMIN && competition.branch.toString() !== req.user.branch.toString()) {
    return res.status(403).json({ message: "لا يمكنك حذف مسابقة من فرع آخر" });
  }
  await competition.deleteOne();
  res.json({ message: "تم حذف المسابقة" });
});

module.exports = router;
