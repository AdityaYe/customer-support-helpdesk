import http from "http";

import "./config/env.js";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { getEnv, validateServerEnv } from "./config/env.js";
import { initSocket } from "./socket.js";

import "./workers/notificationWorker.js";
import "./workers/slaWorker.js";

validateServerEnv();

const port = getEnv("PORT", 5000);
const server = http.createServer(app);

initSocket(server);

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
