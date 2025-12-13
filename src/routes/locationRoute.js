const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { reverseGeocode } = require("../controllers/locationController");

router.post("/reverse", protect, reverseGeocode);

module.exports = router;
