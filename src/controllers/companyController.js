const bcrypt = require("bcryptjs");
const db = require("../config/db");



exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "Name, email and password are required",
      });
    }

    if (!req.user.company_id) {
      return res.status(403).json({
        status: false,
        message: "Company context missing",
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Email already exists",
      });
    }

    const [[employeeRole]] = await db.query(
      "SELECT id FROM roles WHERE name = 'employee'"
    );

    if (!employeeRole) {
      return res.status(500).json({
        status: false,
        message: "Employee role not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (name, email, password, phone, role_id, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        phone || null,
        employeeRole.id,
        req.user.company_id,
      ]
    );

    return res.status(201).json({
      status: true,
      message: "Employee created successfully",
      data: {
        employee_id: result.insertId,
        name,
        email,
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
