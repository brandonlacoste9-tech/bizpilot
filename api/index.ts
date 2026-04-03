import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

let initPromise: Promise<void> | null = null;

function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      const { registerRoutes } = await import("../server/routes.js");
      await registerRoutes(httpServer, app);
    })();
  }
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInit();
  app(req as any, res as any);
}
