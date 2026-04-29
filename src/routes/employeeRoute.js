const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  employeeDashboard,
} = require("../controllers/employeeController");

// const { protect } = require("../middleware/auth");
const auth = require("../middleware/auth");

const { allowRoles } = require("../middleware/role");

router.get(
  "/me",
  auth.protect,
  allowRoles("employee"),
  getMyProfile
);

router.get(
  "/dashboard",
  auth.protect,
  allowRoles("employee"),
  employeeDashboard
);

module.exports = router;
