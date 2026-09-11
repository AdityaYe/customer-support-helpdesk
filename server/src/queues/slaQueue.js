import { Queue } from "bullmq";

import redisConnection from "../config/redis.js";

export const slaQueue = new Queue("sla", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
