const express = require("express");
const router = express.Router();

const { getLogs } = require("../controllers/auditController");

const auth = require("../middleware/auth");

router.get("/logs", auth.protect, getLogs);

module.exports = router;