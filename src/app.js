const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoute");
const companyRoutes = require("./routes/companyRoute");
const employeeRoutes = require("./routes/employeeRoute");

const attendanceRoutes = require("./routes/attendanceRoute");
const locationRoutes = require("./routes/locationRoute");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TaskTracker API is running...");
});

/* ================= AUTH ================= */
app.use("/api/auth", authRoutes);

/* ================= ROLE BASED ================= */
app.use("/api/admin", adminRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/employee", employeeRoutes);

/* ================= FEATURES ================= */
app.use("/api/attendance", attendanceRoutes);
app.use("/api/location", locationRoutes);

module.exports = app;
