
const express       = require("express");
const router        = express.Router();
const auth          = require("../middleware/auth");
const { allowRoles } = require("../middleware/role");
const s             = require("../controllers/settingsController");


router.use(auth.protect, allowRoles("Admin"));

// ── 1. General ────────────────────────────────────────────────────────────────
router.get ("/general",                s.getGeneralSettings);
router.put ("/general",                s.updateGeneralSettings);

// ── 2. Security ───────────────────────────────────────────────────────────────
router.get ("/security",               s.getSecuritySettings);
router.put ("/security",               s.updateSecuritySettings);

// ── 3. Notifications ──────────────────────────────────────────────────────────
router.get ("/notifications",          s.getNotificationSettings);
router.put ("/notifications",          s.updateNotificationSettings);

// ── 4. Billing ────────────────────────────────────────────────────────────────
router.get ("/billing/overview",       s.getBillingOverview);
router.get ("/billing/gateway",        s.getBillingGateway);
router.put ("/billing/gateway",        s.updateBillingGateway);

// ── 5. Integrations ───────────────────────────────────────────────────────────
// NOTE: /webhook routes must be declared BEFORE /:name/toggle
//       so Express doesn't match "webhook" as a :name param.
router.get ("/integrations/webhook",          s.getWebhookSettings);
router.put ("/integrations/webhook",          s.updateWebhookSettings);
router.get ("/integrations",                  s.getIntegrations);
router.post("/integrations/:name/toggle",     s.toggleIntegration);

// ── 6. Appearance ─────────────────────────────────────────────────────────────
router.get ("/appearance",             s.getAppearanceSettings);
router.put ("/appearance",             s.updateAppearanceSettings);

// ── 7. API Keys ───────────────────────────────────────────────────────────────
// NOTE: /rate-limits must be before /:id to avoid param collision
router.get   ("/api-keys/rate-limits", s.getRateLimits);
router.put   ("/api-keys/rate-limits", s.updateRateLimits);
router.get   ("/api-keys",             s.getApiKeys);
router.post  ("/api-keys",             s.generateApiKey);
router.delete("/api-keys/:id",         s.revokeApiKey);

// ── 8. Backup ─────────────────────────────────────────────────────────────────
router.get ("/backup/config",          s.getBackupConfig);
router.put ("/backup/config",          s.updateBackupConfig);
router.get ("/backup/history",         s.getBackupHistory);
router.post("/backup/run",             s.runBackup);
router.post("/backup/verify",          s.verifyBackup);

// ── 9. Danger Zone ────────────────────────────────────────────────────────────
router.delete("/reset",                s.resetAllSettings);

module.exports = router;