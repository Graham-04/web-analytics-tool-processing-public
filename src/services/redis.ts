import {RedisClientOptions, RedisClientType} from "@redis/client";
import {createClient} from "redis";
import logger from './logging';
import RedisSingleton from "./redisSingleton";

class Redis {
  async insertHash(hash: string, website_id: string): Promise<number> {
    const redisClient = await RedisSingleton.getClient();
    logger.info(`Inserting hash: ${hash} into websiteId: ${website_id}`)
    const exists = await redisClient.exists(`known_ids:${website_id}`);
    if (!exists) {
      console.log(`known_ids:${website_id} does not exist, creating.`)
    }
    const result = await redisClient.sAdd(`known_ids:${website_id}`, hash);
    return result;
  }

  /**
   * Check if a hash is unique for a given website ID
   *
   * @async
   * @param {string} hash - The hash to check
   * @param {string} website_id - The website ID to check against
   * @returns {Promise<boolean>} A promise that resolves to `true` if the hash is unique, `false` otherwise
   */
  async isHashUnique(hash: string, website_id: string): Promise<boolean> {
    const redisClient = await RedisSingleton.getClient();
    // TODO: also check SQL for hash??
    const exists = await redisClient.exists(`known_ids:${website_id}`);
    if (!exists) {
      logger.info(`Hash does not exist`);
      logger.error(`The set known_ids:${hash} does not exist. Creating now`)
      await redisClient.sAdd(`known_ids:${website_id}`, hash);
      // await this.insertHash(hash, website_id);
    }
    logger.info(`Checking known_ids:${website_id} for hash: ${hash}`);
    const result = await redisClient.sIsMember(`known_ids:${website_id}`, hash);
    if (!result) {
      logger.info(`Hash was not found (unique visitor identified). Adding it to the set`);
      await redisClient.sAdd(`known_ids:${website_id}`, hash);
    }
    // logger.info(`Unique? : ${!result}`)
    return !result;
  }


  /**
   * Sets the website ID for a given hostname
   *
   * @param {string} hostname - The hostname to set the website ID for
   * @param {string} website_id - The ID of the website to associate with the hostname
   * @returns {Promise<boolean>} - A promise that resolves with a boolean indicating whether the operation was successful
   */
  // async setWebsiteIdForHostname(hostname: string, website_id: string) {
  //   const result = await redisClient.hSet("website_ids", hostname, website_id);
  //   return result;
  // }

  // /**
  //  * Retrieves the website ID for a given hostname
  //  *
  //  * @param {string} hostname - The hostname to retrieve the website ID for
  //  * @returns {Promise<string>} - A promise that resolves with the website ID associated with the hostname
  //  * @throws {Error} - If the given hostname does not have a website ID associated with it
  //  */
  // async getWebsiteIdFromHostname(hostname: string) {
  //   const result = await redisClient.hGet("website_ids", hostname);
  //   if (!result) {
  //     throw new Error(`${hostname} does not have a website_id`);
  //   }
  //   return result;
  // }
}

export default new Redis();
