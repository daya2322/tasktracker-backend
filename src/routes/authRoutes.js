const express = require("express");
const router = express.Router();

const {
  loginUser,
  getMe,
  logoutUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");


router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);

module.exports = router;
