const express = require("express");
const router = express.Router();

const {
  loginUser,
  getMe,
  logoutUser,
} = require("../controllers/authController");

// const { protect } = require("../middleware/auth");
const auth = require("../middleware/auth");



router.post("/login", loginUser);
router.get("/me", auth.protect, getMe);
router.post("/logout", auth.protect, logoutUser);

module.exports = router;
