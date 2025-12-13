const axios = require("axios");

exports.reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: false,
        message: "Latitude and longitude required",
      });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          format: "json",
          lat: latitude,
          lon: longitude,
        },
        headers: {
          "User-Agent": "TaskTracker/1.0 (support@tasktracker.com)",
        },
      }
    );

    return res.json({
      status: true,
      address: response.data.display_name,
    });
  } catch (err) {
    console.error("Reverse Geocode Error:", err.message);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch address",
    });
  }
};
