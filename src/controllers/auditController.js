const db = require("../config/db");

exports.getLogs = async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT id, action, target, type,
         CASE
           WHEN created_at >= NOW() - INTERVAL 1 HOUR
             THEN CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), 'm ago')
           WHEN created_at >= NOW() - INTERVAL 24 HOUR
             THEN CONCAT(TIMESTAMPDIFF(HOUR, created_at, NOW()), 'h ago')
           ELSE DATE_FORMAT(created_at, '%d %b')
         END AS time
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.status(200).json({ status: true, data: logs });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.log = async (action, target, type) => {
  try {
    await db.query(
      "INSERT INTO audit_logs (action, target, type) VALUES (?, ?, ?)",
      [action, target, type]
    );
  } catch (_) {}
};