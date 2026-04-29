const db = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    const [[{ totalCompanies }]] = await db.query(
      "SELECT COUNT(*) AS totalCompanies FROM company"
    );

    const [[{ totalRevenue }]] = await db.query(
      "SELECT COALESCE(SUM(revenue), 0) AS totalRevenue FROM company"
    );

    const [[{ totalUsers }]] = await db.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const activeSessions = 2;

    return res.status(200).json({
      status: true,
      data: {
        totalCompanies,
        totalRevenue,
        totalUsers,
        activeSessions,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         DATE_FORMAT(created_at, '%b') AS label,
         COALESCE(SUM(revenue), 0)     AS value
       FROM company
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
       ORDER BY MIN(created_at) ASC`
    );

    return res.status(200).json({
      status: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getPlanDistribution = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT plan AS label, COUNT(*) AS value
       FROM company
       GROUP BY plan`
    );

    const colorMap = {
      Enterprise: "#f59e0b",
      Pro:        "#8b5cf6",
      Starter:    "#64748b",
    };

    const data = rows.map(r => ({
      label: r.label,
      v:     r.value,
      color: colorMap[r.label] || "#64748b",
    }));

    return res.status(200).json({ status: true, data });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};