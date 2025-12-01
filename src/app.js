const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TaskTracker API is running...");
});

// Add auth routes here
app.use("/api/master/auth", authRoutes);

module.exports = app;
