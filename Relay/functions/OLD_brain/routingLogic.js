function evaluateMessage(messageText, ruleObject) {
    // 1. Lazy Expiry Check
    // If the rule has an expiry date, check if we passed it
    if (ruleObject.expiry_date) {
        const expiry = new Date(ruleObject.expiry_date);
        const now = new Date();
        if (now > expiry) {
            return null; // Expired, do not route
        }
    }

    // 2. Keyword Match (Simple "Includes" check)
    // In a real app, this would use AI, but for the MVP, this works perfectly.
    const keyword = ruleObject.keyword.toLowerCase();
    const text = messageText.toLowerCase();

    if (text.includes(keyword)) {
        return {
            matched: true,
            delegate: ruleObject.delegate_id
        };
    }

    return null;
}

module.exports = { evaluateMessage };