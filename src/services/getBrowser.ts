import logger from "./logging";

/**
 * Get the browser name from the user agent string.
 * @param {string} userAgent - The user agent string.
 * @returns {string} The browser name.
 */
const getBrowser = (userAgent: string) => {
  interface BrowserRegExp {
    [key: string]: RegExp;
  }

  const browsers: BrowserRegExp = {
    facebook: /(?:FBAN\/(\w+)|FacebookExternalHit)/i,
    instagram: /Instagram (\d+\.\d+\.\d+\.\d+)/i,
    brave: /Brave/,
    chrome: /(?:\b(?:CriOS|Chrome)(?:\/|\s+)(\d+\.\d+))(?!.*\b(OPR|Edg|Brave)\/)/i,
    safari: /(?:\bVersion\/(\d+\.\d+).*\b(?:Safari|Mobile\/\w+))(?!.*\b(OPR|Edg)\/)/i,
    opera: /\bOPR\/(\d+\.\d+)/i,
    edge: /\bEdg\/(\d+\.\d+)/i,
    firefox: /(?:\bFirefox\/(\d+\.\d+))/i,
    "internet explorer": /(?:\b(?:MSIE|Trident)\/(\d+\.\d+))/i,
  };

  for (const browser in browsers) {
    if (browsers[browser].test(userAgent)) {
      if (browser) {
        return browser;
      }
    }
  }
  logger.info(`Unknown user-agent: ${userAgent}`);
  return "unknown";
};

export default getBrowser;