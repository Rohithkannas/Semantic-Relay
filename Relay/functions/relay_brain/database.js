const catalyst = require('zcatalyst-sdk-node');

// Initialize a Catalyst app instance using the default function environment
const catalystApp = catalyst.initialize();

/**
 * Fetch the active handover rule for a given user.
 *
 * CRITICAL: This query MUST filter only by user_id AND is_active = true.
 *           Do NOT add any date-based conditions here. Date expiry and
 *           timezone handling are managed in application logic.
 *
 * @param {string|number} userId - The user identifier to filter rules by.
 * @returns {Promise<object|null>} - The matching rule row, or null if none.
 */
async function getRule(userId) {
  if (!userId && userId !== 0) {
    throw new Error('getRule: userId is required');
  }

  const zcql = catalystApp.zcql();

  // Basic sanitization to keep the query safe for string userIds
  const value = typeof userId === 'number' ? userId : String(userId).replace(/'/g, "''");

  const query = `SELECT * FROM HandoverRules WHERE user_id = '${value}' AND is_active = true`;

  const result = await zcql.executeZCQL(query);

  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }

  // ZCQL returns objects keyed by table name; unwrap the first row
  const rowWrapper = result[0];
  const rule = rowWrapper.HandoverRules || rowWrapper.handoverrules || rowWrapper;

  return rule || null;
}

/**
 * Mark a handover rule as inactive (self-healing support).
 *
 * @param {string|number} ruleId - Primary key of the rule row.
 * @returns {Promise<void>}
 */
async function deactivateRule(ruleId) {
  if (ruleId === undefined || ruleId === null) {
    throw new Error('deactivateRule: ruleId is required');
  }

  const zcql = catalystApp.zcql();

  const value = typeof ruleId === 'number' ? ruleId : String(ruleId).replace(/'/g, "''");

  const query = `UPDATE HandoverRules SET is_active = false WHERE id = '${value}'`;

  await zcql.executeZCQL(query);
}

module.exports = {
  getRule,
  deactivateRule,
};
