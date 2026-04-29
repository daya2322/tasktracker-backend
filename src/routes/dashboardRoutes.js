const express = require("express");
const router = express.Router();

const {
  getStats,
  getRevenue,
  getPlanDistribution,
  getSystemHealth,
} = require("../controllers/dashboardController");

const auth = require("../middleware/auth");

router.get("/stats",              auth.protect, getStats);
router.get("/revenue",            auth.protect, getRevenue);
router.get("/plan-distribution",  auth.protect, getPlanDistribution);
router.get("/system-health",      auth.protect, getSystemHealth);

module.exports = router;