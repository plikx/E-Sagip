// Centralized whitelist patterns + min/max thresholds, mirroring the
// frontend rules in script.js so the backend enforces the same contract
// instead of relying on client-side JS that anyone can bypass.

const PATTERNS = {
    name: /^[a-zA-Z'\-\s]+$/,
    phone: /^\d{11}$/,
    postal: /^\d{4}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

const LIMITS = {
    name: { min: 2, max: 60 },
    email: { min: 5, max: 150 },
    address: { min: 5, max: 255 },
    contact: { min: 11, max: 11 },
    ecNumber: { min: 11, max: 11 },
    securityAnswer: { min: 2, max: 200 },
    securityQuestion: { min: 5, max: 200 },
    password: { min: 8, max: 72 }
};

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : email;
}

function isValidName(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return v.length >= LIMITS.name.min && v.length <= LIMITS.name.max && PATTERNS.name.test(v);
}

function isValidEmailFormat(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return v.length >= LIMITS.email.min &&
           v.length <= LIMITS.email.max &&
           PATTERNS.email.test(v) &&
           v.toLowerCase().endsWith('@gmail.com');
}

function isValidPhone(value) {
    if (typeof value !== 'string') return false;
    return PATTERNS.phone.test(value.trim());
}

function isValidPassword(value) {
    if (typeof value !== 'string') return false;
    return value.length >= LIMITS.password.min && value.length <= LIMITS.password.max;
}

function isWithinLength(value, { min = 0, max = Infinity } = {}) {
    if (typeof value !== 'string') return false;
    const len = value.trim().length;
    return len >= min && len <= max;
}

module.exports = {
    LIMITS,
    normalizeEmail,
    isValidName,
    isValidEmailFormat,
    isValidPhone,
    isValidPassword,
    isWithinLength
};
