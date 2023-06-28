import crypto from "crypto";

/**
 * Generates a SHA-512 hash using the provided hostname, user agent, IP address, and site ID.
 *
 * @param {string} hostname - A string representing the hostname.
 * @param {string} user_agent - A string representing the user agent.
 * @param {string} ip_addr - A string representing the IP address.
 * @param {string} website_id - A string representing the site ID.
 * @returns {string} - A hexadecimal string representing the generated hash.
 */
export default function generateHash(hostname: string, user_agent: string, ip_addr: string, website_id: string) {
    const hash = crypto
        .createHash("sha512")
        .update(hostname + website_id + user_agent + ip_addr)
        .digest("hex");
    return hash;
}
