const { Pool } = require("pg");
import logger from "./logging";
import { PageViewParams } from "../interfaces/PageViewParams";
import { HourlyViewParams } from "../interfaces/HourlyViewParams";
import sqlPool from "./sqlConnPool";
import { Mutex } from "async-mutex";

class SQL {
  private mutex: Mutex;

  constructor() {
    this.mutex = new Mutex();
  }

  async logPageView(params: PageViewParams) {
    const query = {
      name: "log-page-view",
      text: "INSERT INTO pageViews (websiteid, uniqueHash, userhash, referer, page, countryCode, browser, time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      values: [params.websiteId, params.uniqueHash, params.userHash, params.referer, params.page, params.countryCode, params.browser, params.time],
    };
    const result = await sqlPool.query(query);
  }

  async userHashExists(userHash: string, websiteId: string) {
    const query = {
      name: "user-hash-exists",
      text: "SELECT 1 FROM userHashes WHERE userHash = $1 AND websiteId = $2",
      values: [userHash, websiteId],
    };
    const result = await sqlPool.query(query);
    logger.info(`User hash ${userHash} exists for website ${websiteId}: ${result.rowCount > 0}`);
    return result.rowCount > 0;
  }

  async updateUserDuration(userHash: string, websiteId: string) {
    const createAvgUserDurationRecord = {
      name: "create-avg-user-duration-record",
      text: `INSERT INTO UserDuration (userHash, websiteId, startTime, endTime, idleTimeout)
      VALUES ($1, $2, NOW(), NOW(), 0);`,
      values: [userHash, websiteId],
    };

    const userAlreadyHasOpenSession = {
      name: "user-already-has-open-session",
      text: `SELECT startTime, endTime FROM UserDuration WHERE userHash = $1 AND websiteId = $2 AND idleTimeout = 0;`,
      values: [userHash, websiteId],
    };

    const updateAvgUserDurationRecord = {
      name: "update-avg-user-duration-record",
      text: `UPDATE UserDuration SET endTime = NOW() WHERE userHash = $1 AND websiteId = $2 AND idleTimeout = 0;`,
      values: [userHash, websiteId],
    };

    const closeAvgUserDurationRecord = {
      name: "close-avg-user-duration-record",
      text: `UPDATE UserDuration SET idleTimeout = 1 WHERE userHash = $1 AND websiteId = $2 AND idleTimeout = 0;`,
      values: [userHash, websiteId],
    };

    // check for active session/record
    // make sure that record is idleTimeout of 0
    // make sure that record is not older than 30 minutes
    // if record is older than 30 minutes, create new record
    // if record is not older than 30 minutes, update record
    // if no record exists, create new record

    // check for active session/record
    const openSessionResult = await sqlPool.query(userAlreadyHasOpenSession);

    if (openSessionResult.rowCount > 0) {
      // User has an open session
      logger.info(`User hash ${userHash} has an open session for website ${websiteId}`);
      // Calculate time delta
      // Get current time and endTime
      const endTime = new Date(openSessionResult.rows[0].endtime); // assuming this is returned as a Date object
      const currentTime = new Date();

      // Calculate time since last activity
      const timeSinceLastActivity = currentTime.getTime() - endTime.getTime();

      logger.info(`User hash ${userHash} has an open session for website ${websiteId}. The last activity was ${timeSinceLastActivity} milliseconds ago.`);

      if (timeSinceLastActivity > 1800000) {
        // Record is older than 30 minutes
        logger.info(`User hash ${userHash} has an open session. There has been no user activity for more than 30 minutes. The timeSinceLastActivity is ${timeSinceLastActivity} milliseconds.`);
        // Update old record (close session)
        const closeResult = await sqlPool.query(closeAvgUserDurationRecord);
        logger.info(`Closed user duration record for user hash ${userHash} for website ${websiteId}`);

        // Create new record
        const result = await sqlPool.query(createAvgUserDurationRecord);
        logger.info(`Created new user duration record for user hash ${userHash} for website ${websiteId}`);
        return;
      } else {
        // Record is less than 30 minutes old, update record
        const result = await sqlPool.query(updateAvgUserDurationRecord);
        logger.info(`Updated user duration record for user hash ${userHash} for website ${websiteId}`);
        return;
      }
    } else {
      // No record exists
      logger.info(`User hash ${userHash} does not have an open session for website ${websiteId}`);
      // Create new record
      const result = await sqlPool.query(createAvgUserDurationRecord);
      logger.info(`Created new user duration record for user hash ${userHash} for website ${websiteId}`);
    }
  }

  async logUserHash(userHash: string, websiteId: string) {
    const hashExists = await this.userHashExists(userHash, websiteId);
    if (hashExists) {
      logger.info(`User hash ${userHash} already exists for website ${websiteId}`);
      return;
    }

    const query = {
      name: "log-user-hash",
      text: "INSERT INTO userHashes (websiteId, userHash) VALUES ($1, $2)",
      values: [websiteId, userHash],
    };
    const result = await sqlPool.query(query);
    logger.info(`Logged user hash ${userHash} for website ${websiteId}`);
  }

  /**
   * Logs a page view for a specific hour.
   *
   * This function first checks if a record for the specified hour already exists in the database.
   * If the record does not exist, it acquires a mutex lock and performs a double-check to confirm that the record still does not exist.
   * The double-check is necessary because multiple operations could be waiting for the mutex lock while one operation is creating the hour record.
   * Once the hour record is created, the remaining operations that acquire the mutex may not be aware that the record has already been created.
   * The double-check ensures that these operations do not attempt to create the hour record again, thus preventing a race condition.
   * If the double-check confirms that the record does not exist, the function creates a new hour record.
   * Finally, the function updates the analytics for the specified hour.
   *
   * @param {HourlyViewParams} params - The parameters for the page view.
   * @returns {Promise} A promise that resolves to the result of the update query.
   *
   * @throws {Error} If an error occurs while querying the database or updating the analytics.
   */
  async logHourPageView(params: HourlyViewParams, userHash: string) {
    const hourExistsQuery = {
      name: "hour-exists-query",
      text: "SELECT 1 FROM HourlyPageViews WHERE websiteId = $1 AND hour = $2",
      values: [params.websiteId, params.hour],
    };

    const createHourQuery = {
      name: "create-hour-query",
      text: `INSERT INTO HourlyPageViews (websiteId, hour)
        VALUES (
          $1,
          $2
        )`,
      values: [params.websiteId, params.hour],
    };

    const incrementUniqueViews = params.incrementUniqueViews ? 1 : 0;
    const updateHourQuery = {
      name: "update-hour-query",
      text: `
        UPDATE HourlyPageViews
        SET 
          views = views + 1,
          uniqueViews = uniqueViews + $7,
          referers = jsonb_set(referers, ARRAY[$3::text], ((COALESCE(referers -> $3, '0'))::int + 1)::text::jsonb),
          pages = jsonb_set(pages, ARRAY[$4::text], ((COALESCE(pages -> $4, '0'))::int + 1)::text::jsonb),
          countryCodes = jsonb_set(countryCodes, ARRAY[$5::text], ((COALESCE(countryCodes -> $5, '0'))::int + 1)::text::jsonb),
          browsers = jsonb_set(browsers, ARRAY[$6::text], ((COALESCE(browsers -> $6, '0'))::int + 1)::text::jsonb)
        WHERE 
          websiteId = $1 AND 
          hour = $2
      `,
      values: [params.websiteId, params.hour, params.referer, params.page, params.countryCode, params.browser, incrementUniqueViews],
    };

    const hourExistsResult = await sqlPool.query(hourExistsQuery);
    if (hourExistsResult.rowCount === 0) {
      const release = await this.mutex.acquire();

      try {
        const doubleCheckHourExistsResult = await sqlPool.query(hourExistsQuery);
        if (doubleCheckHourExistsResult.rowCount === 0) {
          logger.info(`Hour record does not exist for ${params.hour} and websiteId ${params.websiteId}. Creating new record.`);
          const createHourQueryResult = await sqlPool.query(createHourQuery);
        }
      } finally {
        release();
      }
    }

    // update the analytics for that hour
    const updateHourQueryResult = await sqlPool.query(updateHourQuery);
    logger.info(`About to log user hash ${userHash} for website ${params.websiteId}`);
    this.logUserHash(userHash, params.websiteId);
    await this.updateUserDuration(userHash, params.websiteId);
    return updateHourQueryResult;
  }
}

export default new SQL();
