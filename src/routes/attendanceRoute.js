const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth");
const attendanceController = require("../controllers/attendanceController");

router.post("/punch-in", protect, attendanceController.punchIn);

router.post("/punch-out", protect, attendanceController.punchOut);

router.get("/today", protect, attendanceController.getTodayAttendance);

router.get("/history", protect, attendanceController.getAttendanceHistory);

module.exports = router;
