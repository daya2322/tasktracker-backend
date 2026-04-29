const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { log } = require("./auditController");

exports.createCompany = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      industry, 
      owner,
      plan, 
      employees 
    } = req.body;

    
    // ── Validation ──────────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "Company name, email and password are required",
      });
    }
    
    if (!owner) {
      return res.status(400).json({
        status: false,
        message: "Owner / Admin name is required",
      });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        status: false,
        message: "Invalid email address",
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 8 characters",
      });
    }

    // ── Role ─────────────────────────────────────────────────
    const role_id = 2;
    
    // ── Duplicate check ──────────────────────────────────────
    const [existing] = await db.query(
      "SELECT id FROM company WHERE email = ?",
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        status: false,
        message: "A company with this email already exists",
      });
    }
    
    // ── Insert ───────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);
    const joinDate = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const validPlan = ["Starter", "Pro", "Enterprise"].includes(plan) ? plan : "Starter";
    const empCount = parseInt(employees) || 0;
    
    const [result] = await db.query(
      `INSERT INTO company 
      (name, email, password, phone, role_id, industry, owner_name, plan, employees, status, join_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        name,
        email,
        hashedPassword,
        phone || null,
        role_id,
        industry || null,
        owner,
        validPlan,
        empCount,
        joinDate,
      ]
    );
    
    await log("Created company", company.name, "company");
    // ── Response (matches what frontend expects) ─────────────
    const joinDateFormatted = new Date().toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }); // e.g. "Apr 2026"
    
    return res.status(201).json({
      status: true,
      message: "Company created successfully",
      data: {
        id: result.insertId,
        name,
        email,
        phone: phone || null,
        industry: industry || null,
        owner,
        plan: validPlan,
        employees: empCount,
        status: "active",
        revenue: 0,
        joinDate: joinDateFormatted,
        role_id,
      },
    });
    
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};