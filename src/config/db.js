// const mysql = require("mysql2/promise");

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   waitForConnections: true,
//   connectionLimit: 10,
// });

// module.exports = pool;

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true, 
  connectionLimit: 10,
});

// 🔥 ADD THIS (VERY IMPORTANT)
const originalQuery = pool.query.bind(pool);

pool.query = async (...args) => {
  console.log("🔥 SQL QUERY:", args[0]); // <-- yahi magic hai
  return originalQuery(...args);
};

module.exports = pool;