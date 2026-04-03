import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes.js";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Register all routes
await registerRoutes(httpServer, app);

export default app;
