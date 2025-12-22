/**
 * Vision Cortex Intelligence Server
 *
 * HTTP REST API and WebSocket server for intelligence queries
 * Provides endpoints for all systems to access centralized intelligence
 */

import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server as WebSocketServer } from "ws";
import { intelligenceAPI } from "./intelligence-api";
import type {
  TimeHorizon,
  Signal,
  Capability,
  ValidationCriteria,
  Task,
  Constraints,
  Context,
  Goal,
} from "./intelligence-api";

const app = express();

// Security: Disable X-Powered-By header
app.disable('x-powered-by');

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(express.json({ limit: "10mb" }));

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Authentication (API key from headers)
const authenticate = (req: Request, res: Response, next: any) => {
  const apiKey = req.headers["x-api-key"];
  const system = req.headers["x-system-id"] as string;

  if (!apiKey || !system) {
    return res.status(401).json({
      error: "Missing authentication",
      required: ["x-api-key", "x-system-id"],
    });
  }

  // Validate API key (would check against secure store)
  if (apiKey !== process.env.VISION_CORTEX_API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  // Attach system ID to request
  (req as any).systemId = system;
  next();
};

// Rate limiting (simple in-memory, would use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const rateLimit = (req: Request, res: Response, next: any) => {
  const system = (req as any).systemId;
  const now = Date.now();

  let limit = rateLimits.get(system);
  if (!limit || now > limit.resetAt) {
    limit = { count: 0, resetAt: now + 60000 }; // 1 minute window
    rateLimits.set(system, limit);
  }

  limit.count++;
  if (limit.count > 100) {
    // 100 requests per minute
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((limit.resetAt - now) / 1000),
    });
  }

  next();
};

// Apply middleware
app.use(authenticate);
app.use(rateLimit);

// ============================================================================
// HEALTH & METRICS
// ============================================================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/metrics", (req, res) => {
  const metrics = intelligenceAPI.getMetrics();
  res.json(metrics);
});

// ============================================================================
// INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/predict
 * Multi-horizon prediction
 */
app.post("/api/predict", async (req: Request, res: Response) => {
  try {
    const { horizon, signals, context } = req.body as {
      horizon: TimeHorizon;
      signals: Signal[];
      context?: any;
    };

    if (!horizon || !signals) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["horizon", "signals"],
      });
    }

    const system = (req as any).systemId;
    const prediction = await intelligenceAPI.predict(system, horizon, signals, context);

    res.json(prediction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolve
 * Recursive self-evolution
 */
app.post("/api/evolve", async (req: Request, res: Response) => {
  try {
    const { capabilities, context } = req.body as {
      capabilities: Capability[];
      context?: any;
    };

    if (!capabilities) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["capabilities"],
      });
    }

    const system = (req as any).systemId;
    const result = await intelligenceAPI.evolve(system, capabilities, context);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/validate
 * Autonomous validation
 */
app.post("/api/validate", async (req: Request, res: Response) => {
  try {
    const { output, criteria, context } = req.body as {
      output: any;
      criteria: ValidationCriteria;
      context?: any;
    };

    if (!output || !criteria) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["output", "criteria"],
      });
    }

    const system = (req as any).systemId;
    const result = await intelligenceAPI.validate(system, output, criteria, context);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/optimize
 * Performance optimization
 */
app.post("/api/optimize", async (req: Request, res: Response) => {
  try {
    const { task, constraints, context } = req.body as {
      task: Task;
      constraints: Constraints;
      context?: any;
    };

    if (!task || !constraints) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["task", "constraints"],
      });
    }

    const system = (req as any).systemId;
    const result = await intelligenceAPI.optimize(system, task, constraints, context);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reason
 * Strategic reasoning
 */
app.post("/api/reason", async (req: Request, res: Response) => {
  try {
    const { context, goal, additionalContext } = req.body as {
      context: Context;
      goal: Goal;
      additionalContext?: any;
    };

    if (!context || !goal) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["context", "goal"],
      });
    }

    const system = (req as any).systemId;
    const strategy = await intelligenceAPI.reason(system, context, goal, additionalContext);

    res.json(strategy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/batch
 * Batch intelligence queries
 */
app.post("/api/batch", async (req: Request, res: Response) => {
  try {
    const { queries } = req.body as {
      queries: Array<{ type: string; payload: any }>;
    };

    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        error: "Missing or invalid queries array",
      });
    }

    const system = (req as any).systemId;
    const results = await intelligenceAPI.batchQuery(system, queries as any);

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WEBSOCKET - Real-time Intelligence Streaming
// ============================================================================

wss.on("connection", (ws, req) => {
  console.log("WebSocket client connected");

  // Extract system ID from URL query params
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const systemId = url.searchParams.get("system");
  const apiKey = url.searchParams.get("apiKey");

  if (!systemId || !apiKey || apiKey !== process.env.VISION_CORTEX_API_KEY) {
    ws.close(1008, "Authentication failed");
    return;
  }

  // Subscribe to intelligence events for this system
  const onRequest = (data: any) => {
    if (data.system === systemId) {
      ws.send(JSON.stringify({ type: "request", data }));
    }
  };

  const onResponse = (data: any) => {
    if (data.system === systemId || data.requestId?.startsWith(systemId)) {
      ws.send(JSON.stringify({ type: "response", data }));
    }
  };

  const onError = (data: any) => {
    if (data.system === systemId) {
      ws.send(JSON.stringify({ type: "error", data }));
    }
  };

  intelligenceAPI.on("intelligence:request", onRequest);
  intelligenceAPI.on("intelligence:response", onResponse);
  intelligenceAPI.on("intelligence:error", onError);

  ws.on("message", async (message) => {
    try {
      const query = JSON.parse(message.toString());

      let result;
      switch (query.type) {
        case "predict":
          result = await intelligenceAPI.predict(
            systemId,
            query.payload.horizon,
            query.payload.signals,
            query.payload.context
          );
          break;
        case "evolve":
          result = await intelligenceAPI.evolve(
            systemId,
            query.payload.capabilities,
            query.payload.context
          );
          break;
        case "validate":
          result = await intelligenceAPI.validate(
            systemId,
            query.payload.output,
            query.payload.criteria,
            query.payload.context
          );
          break;
        case "optimize":
          result = await intelligenceAPI.optimize(
            systemId,
            query.payload.task,
            query.payload.constraints,
            query.payload.context
          );
          break;
        case "reason":
          result = await intelligenceAPI.reason(
            systemId,
            query.payload.context,
            query.payload.goal,
            query.payload.additionalContext
          );
          break;
        default:
          throw new Error(`Unknown query type: ${query.type}`);
      }

      ws.send(JSON.stringify({ type: "result", requestId: query.requestId, result }));
    } catch (error: any) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });

  ws.on("close", () => {
    intelligenceAPI.off("intelligence:request", onRequest);
    intelligenceAPI.off("intelligence:response", onResponse);
    intelligenceAPI.off("intelligence:error", onError);
    console.log("WebSocket client disconnected");
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.VISION_CORTEX_PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`ðŸ§  Vision Cortex Intelligence API running on port ${PORT}`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Metrics: http://localhost:${PORT}/api/metrics`);
});

export { app, httpServer, wss };

