const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const { getRule, deactivateRule } = require('./database');
const { evaluateMessage } = require('./routingLogic');

const app = express();
app.use(express.json());

// Helper: get a Catalyst app instance for this request (if needed later)
function getCatalystApp(req) {
  try {
    return catalyst.initialize(req); // preferred per Catalyst docs for functions
  } catch (e) {
    // Fallback to default initialization if req-based init fails
    return catalyst.initialize();
  }
}

// Helper: log an event into RelayLogs table
async function logRelayEvent(zcql, data) {
  const {
    user_id,
    delegate_id,
    original_text,
    expiry_date,
  } = data;

  const userVal = user_id == null ? null : String(user_id).replace(/'/g, "''");
  const delegateVal = delegate_id == null ? null : String(delegate_id).replace(/'/g, "''");
  const textVal = original_text == null ? null : String(original_text).replace(/'/g, "''");
  const expiryVal = expiry_date == null ? null : new Date(expiry_date).toISOString();

  const query =
    "INSERT INTO RelayLogs (user_id, delegate_id, message_text, expiry_date) VALUES " +
    `('${userVal}', '${delegateVal}', '${textVal}', '${expiryVal}')`;

  await zcql.executeZCQL(query);
}

// Helper: send a generic reply back to the sender (stub - adapt to Cliq API)
async function sendReplyToSender(zcql, senderId, message) {
  // Placeholder: integrate with Cliq APIs / appropriate Catalyst service.
  // For now, this is a no-op so the core routing logic remains focused.
}

// Helper: send a DM to the delegate (stub - adapt to Cliq API)
async function sendDirectMessageToDelegate(zcql, delegateId, message) {
  // Placeholder: integrate with Cliq APIs / appropriate Catalyst service.
}

// Helper: fetch relay logs since a given activation time for a user
async function getRelayLogsSince(zcql, userId, activationTime) {
  if (!userId || !activationTime) {
    return [];
  }

  const userVal = String(userId).replace(/'/g, "''");
  const sinceIso = new Date(activationTime).toISOString();

  const query =
    `SELECT * FROM RelayLogs WHERE user_id = '${userVal}' AND created_time >= '${sinceIso}' ORDER BY created_time ASC`;

  const rows = await zcql.executeZCQL(query);
  return Array.isArray(rows) ? rows : [];
}

// Helper: build a Zoho Cliq Adaptive Card (table format) from relay logs
function buildRelaySummaryCard(rule, logs) {
  const rows = logs.map((rowWrapper) => {
    const log = rowWrapper.RelayLogs || rowWrapper.relaylogs || rowWrapper;

    return [
      log.created_time || '',
      log.message_text || '',
      log.delegate_id || '',
    ];
  });

  const header = ['Time', 'Message', 'Delegate'];

  // This is a generic Cliq Adaptive Card-style structure; adjust to your exact schema
  return {
    type: 'card',
    theme: 'modern',
    title: {
      text: 'Relay Summary Report',
    },
    data: {
      user: rule.user_id,
      activation_time: rule.activation_time,
      expiry_date: rule.expiry_date,
    },
    components: [
      {
        type: 'text',
        text: 'Messages forwarded during the last relay window:',
      },
      {
        type: 'table',
        headers: header,
        rows,
      },
    ],
  };
}

// Helper: send an Adaptive Card to the user (stub - adapt to Cliq API)
async function sendCardToUser(zcql, userId, card) {
  // Placeholder: integrate with Cliq APIs / appropriate Catalyst service.
}

/**
 * Main bot handler route.
 *
 * Flow:
 *  - Extract recipient_id from Cliq payload
 *  - Look up active rule via database.getRule(recipient_id)
 *  - If no rule: 200 OK (ignore)
 *  - If rule: evaluateMessage(messageText, ruleObject)
 *  - If no match: 200 OK
 *  - If match:
 *      1) Reply to sender: "User is OOO until [expiry_date]. Forwarding to [delegate]."
 *      2) DM delegate with original text
 *      3) Log event to RelayLogs
 */
app.post('/bot-handler', async (req, res) => {
  const catalystApp = getCatalystApp(req);
  const zcql = catalystApp.zcql();

  const payload = req.body || {};

  // Adjust these paths to match actual Cliq payload structure
  const recipientId = payload.recipient_id || payload.to || payload.recipient?.id;
  const senderId = payload.sender_id || payload.from || payload.sender?.id;
  const messageText = payload.message || payload.text || payload.message?.text;

  if (!recipientId) {
    return res.status(200).send();
  }

  let rule;
  try {
    rule = await getRule(recipientId);
  } catch (err) {
    // Silent failure toward client, log if needed
    return res.status(200).send();
  }

  if (!rule) {
    return res.status(200).send();
  }

  let evaluated;
  try {
    evaluated = await evaluateMessage(messageText, rule);
  } catch (err) {
    return res.status(200).send();
  }

  if (!evaluated) {
    return res.status(200).send();
  }

  const expiryDate = evaluated.expiry_date ? new Date(evaluated.expiry_date) : null;
  const expiryStr = expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate.toISOString() : 'unknown time';

  const delegateId = evaluated.delegate_id || evaluated.delegate || evaluated.delegate_user_id;

  // Action 1: generic reply to sender
  if (senderId) {
    const reply = `User is OOO until ${expiryStr}. Forwarding to ${delegateId || 'delegate'}.`;
    try {
      await sendReplyToSender(zcql, senderId, reply);
    } catch (err) {
      // Ignore failures in side-effect helpers
    }
  }

  // Action 2: DM to delegate
  if (delegateId) {
    try {
      await sendDirectMessageToDelegate(zcql, delegateId, messageText || '');
    } catch (err) {
      // Ignore failures
    }
  }

  // Action 3: Log event
  try {
    await logRelayEvent(zcql, {
      user_id: recipientId,
      delegate_id: delegateId,
      original_text: messageText,
      expiry_date: evaluated.expiry_date,
    });
  } catch (err) {
    // Ignore logging failures
  }

  return res.status(200).send();
});

/**
 * "Return Briefing" route - triggered when the user stops the relay.
 *
 * Flow:
 *  - Identify the user (owner of the handover rule)
 *  - Deactivate their current active rule (is_active = false)
 *  - Query RelayLogs for all messages forwarded since rule.activation_time
 *  - Build a Cliq Adaptive Card (table format) summarising these logs
 *  - Send the card to the user immediately
 */
app.post('/status/off', async (req, res) => {
  const catalystApp = getCatalystApp(req);
  const zcql = catalystApp.zcql();

  const payload = req.body || {};

  // Adjust this to the actual widget payload structure for the owner/user
  const userId = payload.user_id || payload.owner_id || payload.user?.id;

  if (!userId) {
    return res.status(200).send();
  }

  let rule;
  try {
    rule = await getRule(userId);
  } catch (err) {
    return res.status(200).send();
  }

  if (!rule) {
    return res.status(200).send();
  }

  // Deactivate the rule immediately (self-healing off switch)
  const ruleId = rule.id || rule.rule_id;
  if (ruleId != null) {
    try {
      await deactivateRule(ruleId);
    } catch (err) {
      // Ignore failures here; continue with report generation
    }
  }

  let logs = [];
  try {
    logs = await getRelayLogsSince(zcql, rule.user_id || userId, rule.activation_time);
  } catch (err) {
    logs = [];
  }

  const card = buildRelaySummaryCard(rule, logs);

  try {
    await sendCardToUser(zcql, rule.user_id || userId, card);
  } catch (err) {
    // Ignore failures in sending the card; main side-effect is rule deactivation
  }

  return res.status(200).send();
});

module.exports = app;
