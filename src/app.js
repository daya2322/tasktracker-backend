const express = require("express");
const cors = require("cors");

const authRoutes       = require("./routes/authRoutes");
const adminRoutes      = require("./routes/adminRoute");
const companyRoutes    = require("./routes/companyRoute");
const employeeRoutes   = require("./routes/employeeRoute");
const attendanceRoutes = require("./routes/attendanceRoute");
const locationRoutes   = require("./routes/locationRoute");
const dashboardRoutes  = require("./routes/dashboardRoutes");   
const auditRoutes      = require("./routes/auditRoutes"); 
const userRoutes       = require("./routes/userRoutes"); 
const settingsRoutes   = require("./routes/settingsRoute");     

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TaskTracker API is running...");
});

app.use("/api/auth",       authRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/company",    companyRoutes);
app.use("/api/employee",   employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/location",   locationRoutes);
app.use("/api/dashboard",  dashboardRoutes);  
app.use("/api/audit",      auditRoutes);      
app.use("/api/users",      userRoutes);
app.use("/api/admin/settings", settingsRoutes);      

module.exports = app;