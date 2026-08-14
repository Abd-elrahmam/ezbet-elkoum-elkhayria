const express = require("express");
const Branch = require("../models/Branch");
const { protect, allowRoles } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect);

// كل المستخدمين المسجلين يقدروا يشوفوا قائمة الفروع (محتاجينها في الفورمات)
router.get("/", async (req, res) => {
  const branches = await Branch.find().sort({ name: 1 });
  res.json(branches);
});

router.get("/:id", async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });
  res.json(branch);
});

// إنشاء/تعديل/حذف الفروع: للأدمن الرئيسي فقط
router.post("/", allowRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (err) {
    res.status(400).json({ message: "فشل إنشاء الفرع", error: err.message });
  }
});

router.put("/:id", allowRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });
    res.json(branch);
  } catch (err) {
    res.status(400).json({ message: "فشل تعديل الفرع", error: err.message });
  }
});

router.delete("/:id", allowRoles(ROLES.SUPER_ADMIN), async (req, res) => {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) return res.status(404).json({ message: "الفرع غير موجود" });
  res.json({ message: "تم حذف الفرع" });
});

module.exports = router;
