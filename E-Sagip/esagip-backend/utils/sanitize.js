// Strips HTML/JS tags from a single string. Not a full HTML sanitizer —
// this app stores plain-text fields (names, addresses, etc.) that later get
// rendered via innerHTML on the frontend (see script.js / superadmin.js),
// so the goal is simply: no tag can survive being saved to the DB.
function stripTags(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/<[^>]*>/g, '')      // remove anything that looks like a tag
        .replace(/javascript:/gi, '') // neutralize javascript: URIs
        .replace(/on\w+\s*=/gi, '')   // neutralize inline event handlers (onclick=, onerror=, etc.)
        .trim();
}

// Recursively walks an object/array and strips tags from every string value.
// Used as middleware so every route gets clean input without each route
// having to remember to call this itself.
function deepSanitize(input) {
    if (Array.isArray(input)) {
        return input.map(deepSanitize);
    }
    if (input && typeof input === 'object') {
        const result = {};
        for (const key of Object.keys(input)) {
            result[key] = deepSanitize(input[key]);
        }
        return result;
    }
    return stripTags(input);
}

module.exports = { stripTags, deepSanitize };
