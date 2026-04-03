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

// Register all routes (lazy initialization)
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await registerRoutes(httpServer, app);
    initialized = true;
  }
}

// Wrap with initialization
const handler = async (req: any, res: any) => {
  await ensureInitialized();
  return app(req, res);
};

export default handler;
