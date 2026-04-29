const express = require("express");
const router = express.Router();

const {
  createCompany,
  getCompanies,
  toggleSuspend,
  deleteCompany,
} = require("../controllers/companyController");

const auth = require("../middleware/auth");

router.get("/companies",              auth.protect, getCompanies);
router.post("/companies/create",      auth.protect, createCompany);
router.patch("/companies/:id/suspend", auth.protect, toggleSuspend);
router.delete("/companies/:id",        auth.protect, deleteCompany);

module.exports = router;