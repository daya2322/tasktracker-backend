const express = require("express");
const router = express.Router();

const {
  getUsers,
} = require("../controllers/userController");

const auth = require("../middleware/auth");

router.get("/usersList",              auth.protect, getUsers);

module.exports = router;