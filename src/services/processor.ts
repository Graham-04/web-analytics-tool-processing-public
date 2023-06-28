import Redis from "./redis";
import logger from "./logging";
import generateHash from "./hash";
import SQL from "./sql";
import { IncomingMessage } from "../interfaces/IncomingMessage";
import getBrowser from "./getBrowser";
import { getCurrentHour } from "./getCurrentHour";

const processMessage = async (message: IncomingMessage) => {
  const { hostname, user_agent, referer, ip_addr, website_id, country_code, page } = message;
  // const website_id = await Redis.getWebsiteIdFromHostname(hostname);
  const user_hash = generateHash(hostname, user_agent, ip_addr, website_id);
  logger.info({ IncomingMessage: { hostname: hostname, user_agent: user_agent, referer: referer, hash: user_hash, ip_addr: ip_addr, website_id: website_id, country_code: country_code, page: page } });
  const unique = await Redis.isHashUnique(user_hash, website_id);
  const time = new Date().toISOString();
  const hour = getCurrentHour();
  const browser = getBrowser(user_agent);
  console.log(`referer: ${referer}`);

  SQL.logHourPageView({
    browser: browser,
    websiteId: website_id,
    incrementUniqueViews: unique,
    referer: referer || 'Direct',
    page: page,
    countryCode: country_code,
    hour: getCurrentHour(),
  }, user_hash);
  
};

export default processMessage;
