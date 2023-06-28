import Redis from "./services/redis";
import Worker from "./services/worker";
import SQL from "./services/sql";
import { getCurrentHour } from "./services/getCurrentHour";

async function main() {
  await Worker.connect();
  for (let i = 0; i < 10; i++) {
    await Worker.listenForRequests();
  }
}

main();
