const db = require("../config/db");


exports.getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.company_id,
        r.name AS role,
        u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};





exports.employeeDashboard = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      message: "Employee dashboard access granted",
      data: {
        employee_id: req.user.id,
        company_id: req.user.company_id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
