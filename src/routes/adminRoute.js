const express = require("express");
const router = express.Router();

const { createCompany } = require("../controllers/adminController");
// const { protect } = require("../middleware/auth");
const auth = require("../middleware/auth");
const { allowRoles } = require("../middleware/role");

router.post(
  "/create-company",
  auth.protect,
  // allowRoles("Admin"),
  createCompany
);
module.exports = router;
