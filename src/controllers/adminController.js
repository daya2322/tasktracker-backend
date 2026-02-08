const bcrypt = require("bcryptjs");
const db = require("../config/db");


exports.createCompany = async (req, res) => {

  try {
    const { name, email, password, phone } = req.body;
    console.log("Received data:", { name, email, password, phone });
    console.log("Request user:", req.user);
    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }
    var role_id=3;
    if(req.user.role === "Admin"){
      role_id=2;
    }else if(req.user.role === "Company"){
      role_id=3;
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const datas=await db.query(
      `INSERT INTO users (name, email, password, phone, role_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        phone || null,
        role_id,
      ]
    );

    return res.status(201).json({
      status: true,
      message: "Company created successfully",
      data: {
        id: datas[0].insertId,
        name,
        email,
        phone,
      }
    });
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
