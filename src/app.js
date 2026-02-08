const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoute");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TaskTracker API is running...");
});

app.use("/api/master/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/location", require("./routes/locationRoute"));

module.exports = app;
