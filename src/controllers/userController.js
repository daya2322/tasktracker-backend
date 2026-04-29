const db = require("../config/db");


exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT 
         id, name, email, phone, company_id,
         DATE_FORMAT(created_at, '%b %Y') AS joinDate,
         CONCAT(
           UPPER(SUBSTRING(TRIM(name),1,1)),
           UPPER(SUBSTRING(TRIM(SUBSTRING_INDEX(name,' ',-1)),1,1))
         ) AS avatar
       FROM users
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      status: true,
      message: "User list fetched successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};