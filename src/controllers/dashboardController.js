const os = require("os");
const db = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    const [[{ totalCompanies }]] = await db.query(
      "SELECT COUNT(*) AS totalCompanies FROM company"
    );

    const [[{ totalRevenue }]] = await db.query(
      "SELECT COALESCE(SUM(revenue), 0) AS totalRevenue FROM company"
    );

    const [[{ totalUsers }]] = await db.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const activeSessions = 2;

    return res.status(200).json({
      status: true,
      data: {
        totalCompanies,
        totalRevenue,
        totalUsers,
        activeSessions,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         DATE_FORMAT(created_at, '%b') AS label,
         COALESCE(SUM(revenue), 0)     AS value
       FROM company
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
       ORDER BY MIN(created_at) ASC`
    );

    return res.status(200).json({
      status: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getPlanDistribution = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT plan AS label, COUNT(*) AS value
       FROM company
       GROUP BY plan`
    );

    const colorMap = {
      Enterprise: "#f59e0b",
      Pro:        "#8b5cf6",
      Starter:    "#64748b",
    };

    const data = rows.map(r => ({
      label: r.label,
      v:     r.value,
      color: colorMap[r.label] || "#64748b",
    }));

    return res.status(200).json({ status: true, data });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    const totalmem = os.totalmem();
    const freemem  = os.freemem();
    const usedmem  = totalmem - freemem;
    const memUsedPct = totalmem > 0 ? (usedmem / totalmem) * 100 : 0;

    const cores = os.cpus().length;
    const [load1, load5, load15] = os.loadavg();
    const cpuLoadPct = cores > 0 ? Math.min(100, (load1 / cores) * 100) : 0;

    const proc = process.memoryUsage();

    // mysql2/promise wraps the base Pool; its connection arrays are pseudo-private.
    // Guard with optional chaining so any version drift only shows zeros, not crashes.
    const basePool = db.pool || {};
    const allConn  = basePool._allConnections;
    const freeConn = basePool._freeConnections;
    const allLen   = (allConn && typeof allConn.length === "number") ? allConn.length : 0;
    const freeLen  = (freeConn && typeof freeConn.length === "number") ? freeConn.length : 0;
    const dbLimit  = (basePool.config && basePool.config.connectionLimit) || 0;
    const dbActive = Math.max(0, allLen - freeLen);
    const dbActivePct = dbLimit > 0 ? (dbActive / dbLimit) * 100 : 0;

    const round1 = (n) => Math.round(n * 10) / 10;
    const round2 = (n) => Math.round(n * 100) / 100;

    return res.status(200).json({
      status: true,
      data: {
        uptime_seconds: Math.floor(os.uptime()),
        process_uptime_seconds: Math.floor(process.uptime()),
        memory: {
          total_bytes: totalmem,
          free_bytes:  freemem,
          used_bytes:  usedmem,
          used_pct:    round1(memUsedPct),
        },
        process_memory: {
          heap_used_bytes:  proc.heapUsed,
          heap_total_bytes: proc.heapTotal,
          rss_bytes:        proc.rss,
        },
        cpu: {
          load_avg_1:  round2(load1),
          load_avg_5:  round2(load5),
          load_avg_15: round2(load15),
          cores,
          load_pct:    round1(cpuLoadPct),
        },
        db_pool: {
          limit:      dbLimit,
          active:     dbActive,
          free:       freeLen,
          active_pct: round1(dbActivePct),
        },
        checked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};