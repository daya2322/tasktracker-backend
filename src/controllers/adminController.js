const bcrypt = require("bcryptjs");
const db = require("../config/db");


exports.createCompany = async (req, res) => {
  try {
    const { company_name, name, email, password, phone } = req.body;

    if (!company_name || !name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
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

    const [[companyRole]] = await db.query(
      "SELECT id FROM roles WHERE name = 'company'"
    );

    if (!companyRole) {
      return res.status(500).json({
        status: false,
        message: "Company role not found",
      });
    }

    const [companyResult] = await db.query(
      "INSERT INTO companies (name) VALUES (?)",
      [company_name]
    );

    const companyId = companyResult.insertId;

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (name, email, password, phone, role_id, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        phone || null,
        companyRole.id,
        companyId,
      ]
    );

    return res.status(201).json({
      status: true,
      message: "Company created successfully",
      data: {
        company_id: companyId,
        company_name,
        company_admin: email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
