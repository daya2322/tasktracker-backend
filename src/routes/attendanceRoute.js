const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
// const { protect } = require("../middleware/auth"); // your JWT middleware
const auth = require("../middleware/auth");


/* ── Write ── */
router.post("/punch-in",  auth.protect, attendanceController.punchIn);
router.post("/punch-out", auth.protect, attendanceController.punchOut);

/* ── Read ── */
router.get("/today",            auth.protect, attendanceController.getTodayAttendance);
router.get("/dashboard-summary",auth.protect, attendanceController.getDashboardSummary);
router.get("/history",          auth.protect, attendanceController.getAttendanceHistory);
router.get("/recent-activity",  auth.protect, attendanceController.getRecentActivity);
router.get("/monthly-overview", auth.protect, attendanceController.getMonthlyOverview);

module.exports = router;