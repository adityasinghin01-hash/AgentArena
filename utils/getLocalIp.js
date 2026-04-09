// utils/getLocalIp.js
// Auto-detect local IPv4 address for dev BASE_URL fallback.
// Used ONLY in development — production always uses BASE_URL from env (TECH_DECISIONS §4.6).

const os = require('os');

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }

    return '127.0.0.1'; // Fallback if no external IPv4 found
};

module.exports = getLocalIp;
