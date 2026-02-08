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
          // REQUIRED by Nominatim policy
          "User-Agent": "TaskTracker/1.0 (contact@tasktracker.com)",
        },
        timeout: 10000,
      }
    );

    if (!response.data?.display_name) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    return res.status(200).json({
      status: true,
      address: response.data.display_name,
    });
  } catch (error) {
    console.error("Reverse Geocode Error:", error.message);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch address",
    });
  }
};
