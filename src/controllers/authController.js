const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { log } = require("./auditController");


exports.loginUser = async (req, res) => {
  try {
    console.log("Login request body:", req.body);
    const { email, password } = req.body;
    // return res.status(200).json({
    //   message: "Login successful",
    //   data: req.body,
    // });
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required",
      });
    }

    const [rows] = await db.query(
      `
  SELECT 
    a.id,
    a.name,
    a.email,
    a.password,
    a.phone,
    r.name AS role
  FROM admin a
  JOIN roles r ON a.role_id = r.id
  WHERE a.email = ?

  UNION ALL

  SELECT 
    c.id,
    c.name,
    c.email,
    c.password,
    c.phone,
    r.name AS role
  FROM company c
  JOIN roles r ON c.role_id = r.id
  WHERE c.email = ?

  UNION ALL

  SELECT 
    u.id,
    u.name,
    u.email,
    u.password,
    u.phone,
    r.name AS role
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.email = ?
  LIMIT 1
  `,
      [email, email, email]
    );



    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Invalid credentialsss",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company
      },
    });
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;

    let query = "";
    
    if (role === "Admin") {
      query = `
        SELECT a.id, a.name, a.email, a.phone, r.name AS role, a.created_at
        FROM admin a
        JOIN roles r ON a.role_id = r.id
        WHERE a.id = ?
      `;
    }

    else if (role === "Company") {
      query = `
        SELECT c.id, c.name, c.email, c.phone, r.name AS role, c.created_at
        FROM company c
        JOIN roles r ON c.role_id = r.id
        WHERE c.id = ?
      `;
    }

    else if (role === "Employee") {
      query = `
        SELECT u.id, u.name, u.email, u.phone, r.name AS role, u.created_at
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `;
    }

    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const user = rows[0];

    await log("Fetched profile", user.email, "system");


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


exports.logoutUser = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "Logged out successfully",
  });
};
