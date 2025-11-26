const catalyst = require('zcatalyst-sdk-node');

async function getRule(userId) {
    const app = catalyst.initialize();
    const zcql = app.zcql();

    // Query the HandoverRules table
    // We filter by user_id and ensure the rule is marked active
    const query = `SELECT * FROM HandoverRules WHERE user_id = '${userId}' AND is_active = true`;

    const result = await zcql.executeZCQLQuery(query);

    if (result.length > 0) {
        return result[0].HandoverRules;
    }
    return null;
}

async function logHandover(originalSender, delegate, message) {
    const app = catalyst.initialize();
    const datastore = app.datastore();
    const table = datastore.table('RelayLogs');
    
    await table.insertRow({
        original_sender: originalSender,
        routed_to: delegate,
        message_content: message,
        logged_at: new Date().toISOString()  // <--- CHANGED THIS
    });
}

module.exports = { getRule, logHandover };