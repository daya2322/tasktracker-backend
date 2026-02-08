const express = require("express");
const router = express.Router();

const { createEmployee } = require("../controllers/companyController");
const { protect } = require("../middleware/auth");
const { allowRoles } = require("../middleware/role");

router.post(
  "/create-employee",
  protect,
  allowRoles("company"),
  createEmployee
);

module.exports = router;
