const Attendance = require("../models/Attendance");


const getTodayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

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

    const existing = await Attendance.findOne({
      user: userId,
      date: today,
    });

    if (existing?.punchIn) {
      return res.status(400).json({
        status: false,
        message: "You have already punched in today",
      });
    }

    const attendance = await Attendance.create({
      user: userId,
      date: today,
      punchIn: new Date(),
      punchInAddress: address,
      status: "PUNCHED_IN",
    });

    return res.status(200).json({
      status: true,
      message: "Punch in successful",
      data: attendance,
    });
  } catch (error) {
    console.error("Punch In Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to punch in",
    });
  }
};

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

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
    });

    if (!attendance || !attendance.punchIn) {
      return res.status(400).json({
        status: false,
        message: "You have not punched in today",
      });
    }

    if (attendance.punchOut) {
      return res.status(400).json({
        status: false,
        message: "You have already punched out today",
      });
    }

    attendance.punchOut = new Date();
    attendance.punchOutAddress = address;
    attendance.status = "PUNCHED_OUT";

    await attendance.save();

    return res.status(200).json({
      status: true,
      message: "Punch out successful",
      data: attendance,
    });
  } catch (error) {
    console.error("Punch Out Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to punch out",
    });
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      user: userId,
      date: today,
    }).populate("user", "name email");

    return res.status(200).json({
      status: true,
      data: attendance || null,
    });
  } catch (error) {
    console.error("Get Attendance Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch attendance",
    });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    const filter = { user: userId };

    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });

    return res.status(200).json({
      status: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Attendance History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch attendance history",
    });
  }
};
