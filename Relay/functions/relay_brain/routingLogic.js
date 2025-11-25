const { deactivateRule } = require('./database');

/**
 * Evaluate an incoming message against a handover rule.
 *
 * Lazy expiry check:
 *  - If ruleObject.expiry_date is in the past relative to new Date(),
 *    immediately mark the rule as inactive in the database (self-healing),
 *    then return null (do not route).
 *
 * Semantic match:
 *  - If not expired, check whether messageText semantically matches
 *    ruleObject.keyword. For now, we treat this as a simple substring
 *    match (case-insensitive), which can later be upgraded to a
 *    full semantic matcher.
 *
 * @param {string} messageText - The raw user message text.
 * @param {object|null} ruleObject - The rule record from HandoverRules.
 * @returns {Promise<object|null>} - The ruleObject for routing, or null.
 */
async function evaluateMessage(messageText, ruleObject) {
  if (!ruleObject) {
    return null;
  }

  const now = new Date();

  if (ruleObject.expiry_date) {
    const expiryDate = new Date(ruleObject.expiry_date);

    if (!isNaN(expiryDate.getTime()) && expiryDate < now) {
      // Lazy self-healing: flip is_active to false as soon as we notice expiry
      if (ruleObject.id || ruleObject.rule_id) {
        const id = ruleObject.id || ruleObject.rule_id;
        try {
          await deactivateRule(id);
        } catch (err) {
          // Intentionally swallow errors here so a failed self-heal
          // does not break the runtime routing flow.
        }
      }

      return null;
    }
  }

  if (!messageText || !ruleObject.keyword) {
    return null;
  }

  const text = String(messageText).toLowerCase();
  const keyword = String(ruleObject.keyword).toLowerCase();

  if (!keyword) {
    return null;
  }

  const isMatch = text.includes(keyword);

  if (!isMatch) {
    return null;
  }

  return ruleObject;
}

module.exports = {
  evaluateMessage,
};
