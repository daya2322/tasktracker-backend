const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { log } = require("./auditController");


exports.getCompanies = async (req, res) => {
  try {
    const [companies] = await db.query(
      `SELECT 
         id, name, email, phone,
         industry, owner, plan, employees,
         status, revenue,
         DATE_FORMAT(created_at, '%b %Y') AS joinDate,
         CONCAT(
           UPPER(SUBSTRING(TRIM(name),1,1)),
           UPPER(SUBSTRING(TRIM(SUBSTRING_INDEX(name,' ',-1)),1,1))
         ) AS avatar
       FROM company
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      status: true,
      message: "Company list fetched successfully",
      data: companies,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const { name, industry, owner, email, phone, plan, employees, password } = req.body;

    if (!name || !email || !password || !owner) {
      return res.status(400).json({
        status: false,
        message: "Company name, owner, email and password are required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ status: false, message: "Invalid email address" });
    }

    if (password.length < 8) {
      return res.status(400).json({ status: false, message: "Password must be at least 8 characters" });
    }

    const [existing] = await db.query(
      "SELECT id FROM company WHERE email = ?", [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ status: false, message: "Company email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar = name.trim().split(" ")
      .map(w => w[0]).slice(0, 2).join("").toUpperCase();

    const [result] = await db.query(
      `INSERT INTO company 
         (name, industry, owner, email, password, phone, plan, employees, status, revenue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', 0)`,
      [
        name.trim(),
        industry || "Technology",
        owner.trim(),
        email.trim(),
        hashedPassword,
        phone || null,
        plan || "Starter",
        parseInt(employees) || 0,
      ]
    );

    return res.status(201).json({
      status: true,
      message: "Company created successfully",
      data: {
        id: result.insertId,
        name: name.trim(),
        industry: industry || "Technology",
        owner: owner.trim(),
        email: email.trim(),
        phone: phone || null,
        plan: plan || "Starter",
        employees: parseInt(employees) || 0,
        status: "trial",
        revenue: 0,
        avatar,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.toggleSuspend = async (req, res) => {
  try {
    const { id } = req.params;

    const [[company]] = await db.query(
      "SELECT id, name, status FROM company WHERE id = ?", [id]
    );

    if (!company) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }

    const newStatus = company.status === "suspended" ? "active" : "suspended";

    await db.query(
      "UPDATE company SET status = ? WHERE id = ?", [newStatus, id]
    );

    const action =
  newStatus === "suspended"
    ? "Suspended company"
    : "Restored company";

await log(action, company.name, "company");


    return res.status(200).json({
      status: true,
      message: `Company ${newStatus === "suspended" ? "suspended" : "restored"} successfully`,
      data: { id: parseInt(id), status: newStatus },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const [[company]] = await db.query(
      "SELECT id, name FROM company WHERE id = ?", [id]
    );

    if (!company) {
      return res.status(404).json({ status: false, message: "Company not found" });
    }

    await db.query("DELETE FROM users WHERE company_id = ?", [id]);
    await db.query("DELETE FROM company WHERE id = ?", [id]);
    await log("Deleted company", company.name, "company");

    return res.status(200).json({
      status: true,
      message: `Company "${company.name}" deleted permanently`,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};