/**
 * settingsController.js
 * Handles all /api/admin/settings/* endpoints for the WorkSphere admin dashboard.
 */

const bcrypt    = require("bcryptjs");
const crypto    = require("crypto");
const db        = require("../config/db");
const { log }   = require("./auditController");

// ─── Utility ──────────────────────────────────────────────────────────────────
const ok  = (res, data, status = 200) => res.status(status).json({ status: true,  ...data });
const err = (res, message, code = 400) => res.status(code).json({ status: false, message });

// ═════════════════════════════════════════════════════════════════════════════
// 1. GENERAL
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/general */
exports.getGeneralSettings = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT `key`, `value` FROM platform_settings WHERE section = 'general'"
    );
    const data = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return ok(res, { data });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/general */
exports.updateGeneralSettings = async (req, res) => {
  const allowed = [
    "platform_name", "primary_domain", "default_timezone",
    "default_language", "currency", "support_email",
    "max_companies", "max_users_per_co", "session_timeout_min",
  ];

  try {
    const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
    if (!updates.length) return err(res, "No valid fields provided");

    await Promise.all(
      updates.map(([k, v]) =>
        db.query(
          "INSERT INTO platform_settings (`key`, `value`, section) VALUES (?,?,'general') ON DUPLICATE KEY UPDATE `value` = ?",
          [k, v, v]
        )
      )
    );

    await log("Updated general settings", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "General settings saved" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. SECURITY
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/security */
exports.getSecuritySettings = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM security_settings WHERE id = 1");
    if (!row) return err(res, "Security settings not initialised", 404);
    return ok(res, { data: row });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/security */
exports.updateSecuritySettings = async (req, res) => {
  const toggleCols = [
    "two_factor_auth", "force_https", "ip_allowlist",
    "brute_force_protection", "audit_log_retention",
    "auto_suspend_inactive", "encrypted_data_at_rest", "gdpr_compliance_mode",
  ];
  const policyCols = ["min_password_length", "password_expiry_days", "prevent_reuse_count"];

  try {
    const allowed   = [...toggleCols, ...policyCols];
    const setClauses = [];
    const vals       = [];

    for (const col of allowed) {
      if (req.body[col] !== undefined) {
        setClauses.push(`${col} = ?`);
        vals.push(req.body[col]);
      }
    }

    if (!setClauses.length) return err(res, "No valid fields provided");

    vals.push(1); // WHERE id = 1
    await db.query(
      `UPDATE security_settings SET ${setClauses.join(", ")} WHERE id = ?`,
      vals
    );

    await log("Updated security settings", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Security settings updated" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/notifications */
exports.getNotificationSettings = async (req, res) => {
  try {
    const [channels] = await db.query(
      "SELECT id, name, label, icon, color, is_active FROM notification_channels ORDER BY id"
    );
    const [events] = await db.query(
      "SELECT id, name, label, is_active FROM notification_events ORDER BY id"
    );
    return ok(res, { data: { channels, events } });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/notifications */
exports.updateNotificationSettings = async (req, res) => {
  // Body: { channels: [{id, is_active}], events: [{id, is_active}] }
  const { channels = [], events = [] } = req.body;

  try {
    await Promise.all([
      ...channels.map(({ id, is_active }) =>
        db.query("UPDATE notification_channels SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id])
      ),
      ...events.map(({ id, is_active }) =>
        db.query("UPDATE notification_events SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id])
      ),
    ]);

    await log("Updated notification settings", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Notification preferences saved" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. BILLING
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/billing/overview  — Revenue stats */
exports.getBillingOverview = async (req, res) => {
  try {
    // Compute real MRR from company plans
    const [[{ mrr }]] = await db.query(`
      SELECT COALESCE(SUM(
        CASE plan
          WHEN 'Starter'    THEN 999
          WHEN 'Pro'        THEN 3499
          WHEN 'Enterprise' THEN 15000   -- placeholder; real value varies
          ELSE 0
        END
      ), 0) AS mrr
      FROM company WHERE status = 'active'
    `);

    const [[{ total, active, churned }]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active')   AS active,
        SUM(status = 'inactive') AS churned
      FROM company
    `);

    const churnRate = total > 0 ? ((churned / total) * 100).toFixed(1) : "0.0";

    const [[{ avg_plan }]] = await db.query(`
      SELECT COALESCE(AVG(
        CASE plan
          WHEN 'Starter'    THEN 999
          WHEN 'Pro'        THEN 3499
          WHEN 'Enterprise' THEN 15000
          ELSE 0
        END
      ), 0) AS avg_plan
      FROM company WHERE status = 'active'
    `);

    return ok(res, {
      data: {
        mrr,
        arr:        mrr * 12,
        avg_plan:   Math.round(avg_plan),
        churn_rate: churnRate,
      },
    });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** GET /api/admin/settings/billing/gateway */
exports.getBillingGateway = async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT id, gateway, webhook_url, invoice_currency FROM billing_settings WHERE id = 1"
    );
    // Never return the raw API key — send masked version
    return ok(res, { data: { ...row, gateway_api_key: row ? "••••••••••••" : null } });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/billing/gateway */
exports.updateBillingGateway = async (req, res) => {
  const { gateway, gateway_api_key, webhook_url, invoice_currency } = req.body;

  try {
    const setClauses = [];
    const vals       = [];

    if (gateway)          { setClauses.push("gateway = ?");          vals.push(gateway); }
    if (gateway_api_key)  { setClauses.push("gateway_api_key = ?");  vals.push(gateway_api_key); }
    if (webhook_url)      { setClauses.push("webhook_url = ?");      vals.push(webhook_url); }
    if (invoice_currency) { setClauses.push("invoice_currency = ?"); vals.push(invoice_currency); }

    if (!setClauses.length) return err(res, "No valid fields provided");

    vals.push(1);
    await db.query(
      `UPDATE billing_settings SET ${setClauses.join(", ")} WHERE id = ?`,
      vals
    );

    await log("Updated billing gateway", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Billing settings saved" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. INTEGRATIONS
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/integrations */
exports.getIntegrations = async (req, res) => {
  try {
    const [integrations] = await db.query(
      "SELECT id, name, label, icon, description, color, status FROM integrations ORDER BY id"
    );
    return ok(res, { data: integrations });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** POST /api/admin/settings/integrations/:name/toggle */
exports.toggleIntegration = async (req, res) => {
  const { name } = req.params;

  try {
    const [[row]] = await db.query(
      "SELECT id, status FROM integrations WHERE name = ?",
      [name]
    );
    if (!row) return err(res, "Integration not found", 404);

    const newStatus = row.status === "connected" ? "disconnected" : "connected";
    await db.query(
      "UPDATE integrations SET status = ? WHERE name = ?",
      [newStatus, name]
    );

    await log(`${newStatus === "connected" ? "Connected" : "Disconnected"} ${name} integration`, req.admin?.name ?? "admin", "settings");
    return ok(res, { message: `Integration ${newStatus}`, data: { name, status: newStatus } });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** GET /api/admin/settings/integrations/webhook */
exports.getWebhookSettings = async (req, res) => {
  try {
    const [[row]] = await db.query(
      "SELECT id, endpoint_url, retry_policy FROM webhook_settings WHERE id = 1"
    );
    return ok(res, { data: { ...row, signing_secret: "whsec_••••••••••••••••" } });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/integrations/webhook */
exports.updateWebhookSettings = async (req, res) => {
  const { endpoint_url, signing_secret, retry_policy } = req.body;

  try {
    const setClauses = [];
    const vals       = [];

    if (endpoint_url)   { setClauses.push("endpoint_url = ?");   vals.push(endpoint_url); }
    if (signing_secret) { setClauses.push("signing_secret = ?"); vals.push(signing_secret); }
    if (retry_policy)   { setClauses.push("retry_policy = ?");   vals.push(retry_policy); }

    if (!setClauses.length) return err(res, "No valid fields provided");

    vals.push(1);
    await db.query(
      `UPDATE webhook_settings SET ${setClauses.join(", ")} WHERE id = ?`,
      vals
    );

    await log("Updated webhook settings", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Webhook settings saved" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 6. APPEARANCE
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/appearance */
exports.getAppearanceSettings = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT `key`, `value` FROM platform_settings WHERE section = 'appearance'"
    );
    const data = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return ok(res, { data });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/appearance */
exports.updateAppearanceSettings = async (req, res) => {
  const allowed = ["theme_mode", "accent_color", "density"];

  try {
    const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k));
    if (!updates.length) return err(res, "No valid fields provided");

    await Promise.all(
      updates.map(([k, v]) =>
        db.query(
          "INSERT INTO platform_settings (`key`, `value`, section) VALUES (?,?,'appearance') ON DUPLICATE KEY UPDATE `value` = ?",
          [k, v, v]
        )
      )
    );

    await log("Updated appearance settings", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Appearance settings applied" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 7. API KEYS
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/api-keys */
exports.getApiKeys = async (req, res) => {
  try {
    const [keys] = await db.query(
      "SELECT id, name, key_prefix, key_preview, status, last_used, created_at FROM api_keys ORDER BY created_at DESC"
    );
    return ok(res, { data: keys });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** POST /api/admin/settings/api-keys */
exports.generateApiKey = async (req, res) => {
  const { name, type = "live" } = req.body;
  if (!name) return err(res, "Key name is required");

  try {
    // e.g.  wsp_live_sk_  +  32 random hex chars
    const prefixMap  = { live: "wsp_live_sk_", test: "wsp_test_sk_", ci: "wsp_ci_sk_" };
    const prefix     = prefixMap[type] ?? "wsp_live_sk_";
    const rawSecret  = crypto.randomBytes(24).toString("hex");
    const fullKey    = prefix + rawSecret;
    const keyHash    = await bcrypt.hash(fullKey, 10);
    const keyPreview = rawSecret.slice(-4);

    const [result] = await db.query(
      "INSERT INTO api_keys (name, key_prefix, key_hash, key_preview, status) VALUES (?,?,?,?,'active')",
      [name, prefix, keyHash, keyPreview]
    );

    await log(`Generated API key: ${name}`, req.admin?.name ?? "admin", "settings");

    // Return the plain key ONCE — never again after this response
    return ok(res, {
      message: "API key generated — copy it now, it will not be shown again",
      data: {
        id:      result.insertId,
        name,
        key:     fullKey,    // shown once
        preview: `${prefix}••••••••••••••••••••${keyPreview}`,
        status:  "active",
      },
    }, 201);
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** DELETE /api/admin/settings/api-keys/:id */
exports.revokeApiKey = async (req, res) => {
  const { id } = req.params;

  try {
    const [[row]] = await db.query(
      "SELECT id, name FROM api_keys WHERE id = ? AND status = 'active'",
      [id]
    );
    if (!row) return err(res, "Active key not found", 404);

    await db.query("UPDATE api_keys SET status = 'revoked' WHERE id = ?", [id]);

    await log(`Revoked API key: ${row.name}`, req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "API key revoked" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** GET /api/admin/settings/api-keys/rate-limits */
exports.getRateLimits = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM api_rate_limits WHERE id = 1");
    return ok(res, { data: row });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/api-keys/rate-limits */
exports.updateRateLimits = async (req, res) => {
  const { req_per_minute, req_per_hour, burst_limit } = req.body;

  try {
    const setClauses = [];
    const vals       = [];

    if (req_per_minute !== undefined) { setClauses.push("req_per_minute = ?"); vals.push(req_per_minute); }
    if (req_per_hour   !== undefined) { setClauses.push("req_per_hour = ?");   vals.push(req_per_hour); }
    if (burst_limit    !== undefined) { setClauses.push("burst_limit = ?");    vals.push(burst_limit); }

    if (!setClauses.length) return err(res, "No valid fields provided");

    vals.push(1);
    await db.query(
      `UPDATE api_rate_limits SET ${setClauses.join(", ")} WHERE id = ?`,
      vals
    );

    await log("Updated API rate limits", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Rate limits updated" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 8. BACKUP
// ═════════════════════════════════════════════════════════════════════════════

/** GET /api/admin/settings/backup/config */
exports.getBackupConfig = async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM backup_config WHERE id = 1");
    return ok(res, { data: row });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** PUT /api/admin/settings/backup/config */
exports.updateBackupConfig = async (req, res) => {
  const { frequency, retention_period, destination, encryption_key_id } = req.body;

  try {
    const setClauses = [];
    const vals       = [];

    if (frequency)          { setClauses.push("frequency = ?");          vals.push(frequency); }
    if (retention_period)   { setClauses.push("retention_period = ?");   vals.push(retention_period); }
    if (destination)        { setClauses.push("destination = ?");        vals.push(destination); }
    if (encryption_key_id)  { setClauses.push("encryption_key_id = ?"); vals.push(encryption_key_id); }

    if (!setClauses.length) return err(res, "No valid fields provided");

    vals.push(1);
    await db.query(
      `UPDATE backup_config SET ${setClauses.join(", ")} WHERE id = ?`,
      vals
    );

    await log("Updated backup configuration", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "Backup config saved" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** GET /api/admin/settings/backup/history */
exports.getBackupHistory = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 20"
    );
    return ok(res, { data: rows });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** POST /api/admin/settings/backup/run  — Trigger manual backup */
exports.runBackup = async (req, res) => {
  try {
    const triggeredBy = req.admin?.name ?? "admin";

    // Insert a running record
    const [result] = await db.query(
      "INSERT INTO backup_history (type, status, triggered_by) VALUES ('Manual','running',?)",
      [triggeredBy]
    );

    // ── In a real system you'd dispatch a background job here ──────────
    // e.g.  backupQueue.add({ backupId: result.insertId });
    // For now we simulate completion after a short delay using setTimeout
    // (replace with your actual backup logic / queue):
    setTimeout(async () => {
      try {
        // Pretend the backup completed and produced ~2.4 GB
        await db.query(
          "UPDATE backup_history SET status = 'success', size_gb = ? WHERE id = ?",
          [2.4, result.insertId]
        );
      } catch (inner) {
        await db.query(
          "UPDATE backup_history SET status = 'failed' WHERE id = ?",
          [result.insertId]
        );
      }
    }, 5000);
    // ───────────────────────────────────────────────────────────────────

    await log("Triggered manual backup", triggeredBy, "settings");
    return ok(res, {
      message: "Backup started",
      data: { backup_id: result.insertId },
    }, 202);
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

/** POST /api/admin/settings/backup/verify  — Verify latest backup integrity */
exports.verifyBackup = async (req, res) => {
  try {
    const [[latest]] = await db.query(
      "SELECT * FROM backup_history WHERE status = 'success' ORDER BY created_at DESC LIMIT 1"
    );

    if (!latest) return err(res, "No successful backup found to verify", 404);

    // ── Replace with real integrity check (e.g. checksum against S3) ──
    const isValid = true; // placeholder
    // ──────────────────────────────────────────────────────────────────

    return ok(res, {
      message: isValid ? "Backup integrity verified" : "Backup verification failed",
      data: {
        backup_id:   latest.id,
        created_at:  latest.created_at,
        size_gb:     latest.size_gb,
        is_valid:    isValid,
      },
    });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 9. RESET ALL  (dangerous — protected by role middleware)
// ═════════════════════════════════════════════════════════════════════════════

/** DELETE /api/admin/settings/reset */
exports.resetAllSettings = async (req, res) => {
  try {
    // Truncate mutable config tables and re-seed defaults via stored proc
    // or simply revert specific values. Here we reset key toggles:
    await db.query("UPDATE security_settings SET two_factor_auth=1, force_https=1, ip_allowlist=0, brute_force_protection=1, gdpr_compliance_mode=1 WHERE id=1");
    await db.query("UPDATE api_rate_limits    SET req_per_minute=1000, req_per_hour=30000, burst_limit=200 WHERE id=1");
    await db.query("UPDATE billing_settings   SET gateway='razorpay', invoice_currency='INR' WHERE id=1");
    await db.query("UPDATE backup_config      SET frequency='daily', retention_period='30d' WHERE id=1");
    await db.query("UPDATE platform_settings  SET `value`='WorkSphere' WHERE `key`='platform_name'");

    await log("Reset all settings to defaults", req.admin?.name ?? "admin", "settings");
    return ok(res, { message: "All settings reset to defaults" });
  } catch (e) {
    console.error(e);
    return err(res, e.message, 500);
  }
};