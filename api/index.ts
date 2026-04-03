import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

let initPromise: Promise<void> | null = null;
let initError: Error | null = null;

function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { registerRoutes } = await import("../server/routes.js");
        await registerRoutes(httpServer, app);
      } catch (err: any) {
        console.error("INIT ERROR:", err);
        initError = err;
        throw err;
      }
    })();
  }
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
  } catch (err: any) {
    console.error("Handler init error:", err);
    res.status(500).json({
      error: "Initialization failed",
      message: err?.message || String(err),
      stack: err?.stack,
    });
    return;
  }

  if (initError) {
    res.status(500).json({
      error: "Previous initialization failed",
      message: initError.message,
    });
    return;
  }

  app(req as any, res as any);
}
