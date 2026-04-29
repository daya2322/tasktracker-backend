const express = require("express");
const router = express.Router();
// const { protect } = require("../middleware/auth");
const auth = require("../middleware/auth");

const { reverseGeocode } = require("../controllers/locationController");

router.post("/reverse", auth.protect, reverseGeocode);

module.exports = router;
