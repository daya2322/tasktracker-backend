const db = require("../config/db");

/* ================= HELPERS ================= */
const getTodayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

/* ================= PUNCH IN ================= */
exports.punchIn = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.user.id;
    const today = getTodayDate();

    if (!address || address.trim() === "") {
      return res.status(400).json({
        status: false,
        message: "Punch-in location address is required",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ?",
      [userId, today]
    );

    if (rows.length && rows[0].punch_in) {
      return res.status(400).json({
        status: false,
        message: "You have already punched in today",
      });
    }

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO attendance 
         (user_id, date, punch_in, punch_in_address, status)
         VALUES (?, ?, NOW(), ?, 'PUNCHED_IN')`,
        [userId, today, address]
      );
    } else {
      await db.query(
        `UPDATE attendance 
         SET punch_in = NOW(), punch_in_address = ?, status = 'PUNCHED_IN'
         WHERE user_id = ? AND date = ?`,
        [address, userId, today]
      );
    }

    return res.status(200).json({
      status: true,
      message: "Punch in successful",
    });
  } catch (error) {
    console.error("Punch In Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to punch in",
    });
  }
};

/* ================= PUNCH OUT ================= */
exports.punchOut = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.user.id;
    const today = getTodayDate();

    if (!address || address.trim() === "") {
      return res.status(400).json({
        status: false,
        message: "Punch-out location address is required",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ?",
      [userId, today]
    );

    if (!rows.length || !rows[0].punch_in) {
      return res.status(400).json({
        status: false,
        message: "You have not punched in today",
      });
    }

    if (rows[0].punch_out) {
      return res.status(400).json({
        status: false,
        message: "You have already punched out today",
      });
    }

    await db.query(
      `UPDATE attendance 
       SET punch_out = NOW(), punch_out_address = ?, status = 'PUNCHED_OUT'
       WHERE user_id = ? AND date = ?`,
      [address, userId, today]
    );

    return res.status(200).json({
      status: true,
      message: "Punch out successful",
    });
  } catch (error) {
    console.error("Punch Out Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to punch out",
    });
  }
};

/* ================= GET TODAY ================= */
exports.getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDate();

    const [rows] = await db.query(
      `SELECT a.*, u.name, u.email
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ? AND a.date = ?`,
      [userId, today]
    );

    return res.status(200).json({
      status: true,
      data: rows.length ? rows[0] : null,
    });
  } catch (error) {
    console.error("Get Attendance Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch attendance",
    });
  }
};

/* ================= HISTORY ================= */
exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    let query = "SELECT * FROM attendance WHERE user_id = ?";
    const params = [userId];

    if (from && to) {
      query += " AND date BETWEEN ? AND ?";
      params.push(from, to);
    }

    query += " ORDER BY date DESC";

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      status: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Attendance History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch attendance history",
    });
  }
};
