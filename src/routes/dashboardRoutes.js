const express = require("express");
const router = express.Router();

const {
  getStats,
  getRevenue,
  getPlanDistribution,
} = require("../controllers/dashboardController");

const auth = require("../middleware/auth");

router.get("/stats",              auth.protect, getStats);
router.get("/revenue",            auth.protect, getRevenue);
router.get("/plan-distribution",  auth.protect, getPlanDistribution);

module.exports = router;