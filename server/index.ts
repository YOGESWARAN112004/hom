import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { startAbandonedCartScheduler, stopAbandonedCartScheduler } from "./jobs/abandoned-cart";

const app = express();
const httpServer = createServer(app);

// CORS configuration for cross-origin requests (frontend on Vercel)
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5000', 'http://localhost:5173'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate required environment variables early
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // In production, only serve API routes (frontend is on Vercel)
    // In development, setup Vite dev server
    if (process.env.NODE_ENV !== "production") {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    // reusePort is not supported on Windows, only on Linux/Unix
    const listenOptions: any = {
      port,
      host: "0.0.0.0",
    };
    
    // Only add reusePort on non-Windows platforms
    if (process.platform !== 'win32') {
      listenOptions.reusePort = true;
    }
    
    httpServer.listen(
      listenOptions,
      () => {
        log(`serving on port ${port}`);
        
        // Start abandoned cart email scheduler
        startAbandonedCartScheduler();
      },
    );

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      log('Shutting down gracefully...');
      
      // Stop the scheduler
      stopAbandonedCartScheduler();
      
      // Close server
      httpServer.close(() => {
        log('Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        log('Forcing shutdown...');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    log(`Error during startup: ${error instanceof Error ? error.message : String(error)}`, "error");
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    console.error('Full error details:', error);
    process.exit(1);
  }
})().catch((error) => {
  log(`Fatal error during startup: ${error instanceof Error ? error.message : String(error)}`, "error");
  if (error instanceof Error && error.stack) {
    console.error('Error stack:', error.stack);
  }
  console.error('Startup error details:', error);
  process.exit(1);
});
