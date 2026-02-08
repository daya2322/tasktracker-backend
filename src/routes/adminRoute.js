const express = require("express");
const router = express.Router();

const { createCompany } = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const { allowRoles } = require("../middleware/role");

router.post(
  "/create-company",
  protect,
  allowRoles("admin"),
  createCompany
);

module.exports = router;
