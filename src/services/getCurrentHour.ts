import { DateTime } from "luxon";

/**
 * Get the current time in the format "YYYY-MM-DD HH:00" in UTC.
 * @returns {string} The current time in UTC in the specified format.
 */
export function getCurrentHour() {
  const currentDate = DateTime.utc();
  const currentTime = currentDate.toFormat("yyyy-MM-dd HH:00");
  return currentTime;
}

/**
 * Convert a date string in the format "YYYY-MM-DD HH:mm" from CST (Central Standard Time) to UTC (Coordinated Universal Time).
 *
 * @param {string} date - The date string in CST.
 * @returns {string} The converted date string in UTC with minutes set to 00.
 */
export function cstToUTC(date: string) {
  return DateTime.fromFormat(date, "yyyy-MM-dd HH:mm", { zone: "America/Chicago" }).setZone("utc").toFormat("yyyy-MM-dd HH:00");
}

/**
 * Convert a date string in the format "YYYY-MM-DD HH:mm" from EST (Eastern Standard Time) to UTC (Coordinated Universal Time).
 *
 * @param {string} date - The date string in EST.
 * @returns {string} The converted date string in UTC with minutes set to 00.
 */
export function estToUTC(date: string) {
  return DateTime.fromFormat(date, "yyyy-MM-dd HH:mm", { zone: "America/New_York" }).setZone("utc").toFormat("yyyy-MM-dd HH:00");
}

// export function cstToEST(date: string) {
//   return DateTime.fromFormat(date, 'yyyy-MM-dd HH:mm', { zone: 'America/Chicago' }).setZone('America/New_York').toFormat('yyyy-MM-dd HH:00');
// }

// console.log("cstToUTC", cstToUTC("2023-05-26 11:55"));
// console.log("estTOUTC", estToUTC("2023-05-26 11:55"));
