const { deepSanitize } = require('../utils/sanitize');

function sanitizeInputs(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
    }
    next();
}

module.exports = sanitizeInputs;
