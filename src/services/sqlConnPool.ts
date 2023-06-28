const { Pool } = require("pg");
import logger from "./logging";

let sqlPool = new Pool({
  host: "localhost",
  user: "postgres",
  database: "webanalytics",
  port: 5432,
  max: 200,
  idleTimeoutMillis: 5000,
});

// setInterval(() => {
//   console.log('Current pool status: ', {
//     total: sqlPool.totalCount,
//     idle: sqlPool.idleCount,
//     waiting: sqlPool.waitingCount
//   });
// }, 8000); 

logger.info("[sqlConnPool.ts] Connected to Postgres");

export default sqlPool;
