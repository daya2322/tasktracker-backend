const db = require("../config/db");

const getTodayDate = () => new Date().toISOString().slice(0, 10);


function calcDuration(punchIn, punchOut) {
  if (!punchIn || !punchOut) return null;
  const diffMs = new Date(punchOut) - new Date(punchIn);
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { hours: h, minutes: m, formatted: `${h}h ${String(m).padStart(2, "0")}m` };
}


function currentMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { first, last };
}


function currentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().slice(0, 10);
}


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
        data: {
          punch_in: rows[0].punch_in,
          punch_in_address: rows[0].punch_in_address,
        },
      });
    }

    const now = new Date();

    if (rows.length === 0) {
      await db.query(
        `INSERT INTO attendance 
         (user_id, date, punch_in, punch_in_address, status)
         VALUES (?, ?, ?, ?, 'PUNCHED_IN')`,
        [userId, today, now, address]
      );
    } else {
      await db.query(
        `UPDATE attendance 
         SET punch_in = ?, punch_in_address = ?, status = 'PUNCHED_IN'
         WHERE user_id = ? AND date = ?`,
        [now, address, userId, today]
      );
    }

    return res.status(200).json({
      status: true,
      message: "Punch in successful",
      data: {
        punch_in: now,
        punch_in_address: address,
        status: "PUNCHED_IN",
      },
    });
  } catch (error) {
    console.error("Punch In Error:", error);
    return res.status(500).json({ status: false, message: "Failed to punch in" });
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
        data: {
          punch_out: rows[0].punch_out,
          punch_out_address: rows[0].punch_out_address,
        },
      });
    }

    const now = new Date();
    const duration = calcDuration(rows[0].punch_in, now);
    const totalMinutes = duration ? duration.hours * 60 + duration.minutes : 0;

    await db.query(
      `UPDATE attendance 
       SET punch_out = ?, punch_out_address = ?, total_minutes = ?, status = 'PUNCHED_OUT'
       WHERE user_id = ? AND date = ?`,
      [now, address, totalMinutes, userId, today]
    );

    return res.status(200).json({
      status: true,
      message: "Punch out successful",
      data: {
        punch_in: rows[0].punch_in,
        punch_out: now,
        punch_out_address: address,
        duration: duration?.formatted ?? "0h 00m",
        total_minutes: totalMinutes,
        status: "PUNCHED_OUT",
      },
    });
  } catch (error) {
    console.error("Punch Out Error:", error);
    return res.status(500).json({ status: false, message: "Failed to punch out" });
  }
};


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

    if (!rows.length) {
      return res.status(200).json({
        status: true,
        data: null,
        meta: { punched_in: false, punched_out: false, hours_today: "0h 00m" },
      });
    }

    const row = rows[0];
    const isLive = row.punch_in && !row.punch_out;
    const liveEnd = isLive ? new Date() : row.punch_out;
    const duration = calcDuration(row.punch_in, liveEnd);

    return res.status(200).json({
      status: true,
      data: row,
      meta: {
        punched_in: !!row.punch_in,
        punched_out: !!row.punch_out,
        hours_today: duration?.formatted ?? "0h 00m",
        total_minutes_today: duration
          ? duration.hours * 60 + duration.minutes
          : 0,
        is_live: isLive,
      },
    });
  } catch (error) {
    console.error("Get Today Attendance Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch attendance" });
  }
};


exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDate();
    const { first: monthStart, last: monthEnd } = currentMonthRange();
    const weekStart = currentWeekStart();

    const [todayRows] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ?",
      [userId, today]
    );
    const todayRow = todayRows[0] || null;
    const isLive = todayRow?.punch_in && !todayRow?.punch_out;
    const todayDuration = calcDuration(
      todayRow?.punch_in,
      isLive ? new Date() : todayRow?.punch_out
    );

    const [weekRows] = await db.query(
      `SELECT date, total_minutes, punch_in, punch_out, status
       FROM attendance
       WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [userId, weekStart, today]
    );

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekMap = {};
    weekRows.forEach((r) => {
      const d = new Date(r.date);
      const dayIdx = (d.getDay() + 6) % 7;
      const label = weekDays[dayIdx];
      const min = r.total_minutes || 0;
      weekMap[label] = parseFloat((min / 60).toFixed(1));
    });
    const todayDayIdx = (new Date().getDay() + 6) % 7;
    const weeklyHoursChart = weekDays.map((label, i) => ({
      label,
      hours: weekMap[label] ?? 0,
      isToday: i === todayDayIdx,
    }));

    const weekTotalMin = weekRows.reduce((s, r) => s + (r.total_minutes || 0), 0);
    const weekTotalHours = Math.floor(weekTotalMin / 60);
    const weekTotalMins = weekTotalMin % 60;

    const [monthRows] = await db.query(
      `SELECT date, status FROM attendance
       WHERE user_id = ? AND date BETWEEN ? AND ?`,
      [userId, monthStart, monthEnd]
    );

    let workingDays = 0;
    const cur = new Date(monthStart);
    const todayObj = new Date(today);
    while (cur <= todayObj) {
      const dow = cur.getDay();
      if (dow !== 0) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }

    const presentDays = monthRows.filter(
      (r) => r.status === "PUNCHED_IN" || r.status === "PUNCHED_OUT"
    ).length;

    const attendancePct =
      workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    return res.status(200).json({
      status: true,
      data: {
        hours_today: todayDuration?.formatted ?? "0h 00m",
        hours_today_minutes: todayDuration
          ? todayDuration.hours * 60 + todayDuration.minutes
          : 0,
        week_total: `${weekTotalHours}h ${String(weekTotalMins).padStart(2, "0")}m`,
        week_total_minutes: weekTotalMin,
        week_target_minutes: 8 * 60 * 5,
        attendance_pct: attendancePct,
        present_days: presentDays,
        working_days: workingDays,

        weekly_hours_chart: weeklyHoursChart,

        punch_status: {
          punched_in: !!todayRow?.punch_in,
          punched_out: !!todayRow?.punch_out,
          punch_in_time: todayRow?.punch_in ?? null,
          punch_out_time: todayRow?.punch_out ?? null,
          is_live: isLive,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch dashboard summary",
    });
  }
};


exports.getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, page = 1, limit = 20 } = req.query;

    let query =
      "SELECT * FROM attendance WHERE user_id = ?";
    const params = [userId];

    if (from && to) {
      query += " AND date BETWEEN ? AND ?";
      params.push(from, to);
    }

    query += " ORDER BY date DESC";

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);

    const enriched = rows.map((r) => {
      const dur = calcDuration(r.punch_in, r.punch_out);
      return {
        ...r,
        duration_formatted: dur?.formatted ?? (r.punch_in ? "In progress" : "Absent"),
        total_minutes: r.total_minutes ?? (dur ? dur.hours * 60 + dur.minutes : 0),
      };
    });

    return res.status(200).json({
      status: true,
      page: parseInt(page),
      limit: parseInt(limit),
      count: rows.length,
      data: enriched,
    });
  } catch (error) {
    console.error("Attendance History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch attendance history",
    });
  }
};


exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const [rows] = await db.query(
      `SELECT date, punch_in, punch_out, punch_in_address, punch_out_address, status
       FROM attendance
       WHERE user_id = ?
       ORDER BY date DESC, punch_in DESC
       LIMIT ?`,
      [userId, limit]
    );

    const events = [];
    rows.forEach((r) => {
      if (r.punch_out) {
        events.push({
          type: "PUNCH_OUT",
          title: "Punched out",
          time: r.punch_out,
          icon: "🔴",
          color: "#ef4444",
          address: r.punch_out_address,
        });
      }
      if (r.punch_in) {
        events.push({
          type: "PUNCH_IN",
          title: "Punched in",
          time: r.punch_in,
          icon: "🟢",
          color: "#10b981",
          address: r.punch_in_address,
        });
      }
    });

    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.status(200).json({
      status: true,
      count: events.length,
      data: events.slice(0, limit),
    });
  } catch (error) {
    console.error("Recent Activity Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch recent activity",
    });
  }
};


exports.getMonthlyOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first: monthStart, last: monthEnd } = currentMonthRange();

    const [rows] = await db.query(
      `SELECT date, total_minutes, punch_in, punch_out, status
       FROM attendance
       WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [userId, monthStart, monthEnd]
    );

    const presentRows = rows.filter(
      (r) => r.status === "PUNCHED_IN" || r.status === "PUNCHED_OUT"
    );
    const totalMinutes = presentRows.reduce(
      (s, r) => s + (r.total_minutes || 0),
      0
    );
    const avgDailyMinutes =
      presentRows.length > 0
        ? Math.round(totalMinutes / presentRows.length)
        : 0;
    const avgDailyHours = (avgDailyMinutes / 60).toFixed(1);

    const onTimeRows = presentRows.filter((r) => {
      if (!r.punch_in) return false;
      const d = new Date(r.punch_in);
      return d.getHours() < 9 || (d.getHours() === 9 && d.getMinutes() <= 30);
    });
    const onTimePct =
      presentRows.length > 0
        ? Math.round((onTimeRows.length / presentRows.length) * 100)
        : 0;

    let streak = 0;
    const dateSet = new Set(rows.map((r) => r.date.toISOString?.().slice(0, 10) ?? r.date));
    const check = new Date();
    while (true) {
      const key = check.toISOString().slice(0, 10);
      if (dateSet.has(key)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    return res.status(200).json({
      status: true,
      data: {
        present_days: presentRows.length,
        total_minutes: totalMinutes,
        avg_daily_hours: parseFloat(avgDailyHours),
        on_time_pct: onTimePct,
        work_streak_days: streak,
        month_start: monthStart,
        month_end: monthEnd,
      },
    });
  } catch (error) {
    console.error("Monthly Overview Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch monthly overview",
    });
  }
};