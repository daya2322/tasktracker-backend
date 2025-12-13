const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    punchIn: Date,
    punchOut: Date,

    punchInAddress: String,
    punchOutAddress: String,

    status: {
      type: String,
      enum: ["PUNCHED_IN", "PUNCHED_OUT"],
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
