import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  // Use the existing Pool from db.ts which has SSL configuration
  const sessionStore = new pgStore({
    pool: pool, // Use the Pool instance that already has SSL configured
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  // Determine if we're in a cross-origin setup (frontend and backend on different domains)
  const isCrossOrigin = !!process.env.FRONTEND_URL && 
    process.env.FRONTEND_URL !== 'http://localhost:5000' && 
    process.env.FRONTEND_URL !== 'http://localhost:5173';
  
  return session({
    secret: process.env.SESSION_SECRET || 'luxury-commerce-hub-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || isCrossOrigin, // HTTPS required for cross-origin
      maxAge: sessionTtl,
      sameSite: isCrossOrigin ? 'none' : 'lax', // 'none' required for cross-origin cookies
      // Don't set domain - allows cookies to work cross-origin
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only setup Replit OIDC if REPL_ID is available (running on Replit)
  if (process.env.REPL_ID) {
    try {
      const config = await getOidcConfig();

      const verify: VerifyFunction = async (
        tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
        verified: passport.AuthenticateCallback
      ) => {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      };

      // Keep track of registered strategies
      const registeredStrategies = new Set<string>();

      // Helper function to ensure strategy exists for a domain
      const ensureStrategy = (domain: string) => {
        const strategyName = `replitauth:${domain}`;
        if (!registeredStrategies.has(strategyName)) {
          const strategy = new Strategy(
            {
              name: strategyName,
              config,
              scope: "openid email profile offline_access",
              callbackURL: `https://${domain}/api/callback`,
            },
            verify,
          );
          passport.use(strategy);
          registeredStrategies.add(strategyName);
        }
      };

      passport.serializeUser((user: Express.User, cb) => cb(null, user));
      passport.deserializeUser((user: Express.User, cb) => cb(null, user));

      app.get("/api/login/replit", (req, res, next) => {
        ensureStrategy(req.hostname);
        passport.authenticate(`replitauth:${req.hostname}`, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      });

      app.get("/api/callback", (req, res, next) => {
        ensureStrategy(req.hostname);
        passport.authenticate(`replitauth:${req.hostname}`, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/login",
        })(req, res, next);
      });

      app.get("/api/logout/replit", (req, res) => {
        req.logout(() => {
          res.redirect(
            client.buildEndSessionUrl(config, {
              client_id: process.env.REPL_ID!,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href
          );
        });
      });
    } catch (error) {
      console.log('Replit OIDC not available, using email/password auth only');
    }
  }
}

// Middleware to check if user is authenticated (session-based or Replit auth)
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check session-based auth first (email/password login)
  if (req.session?.userId) {
    return next();
  }

  // Check Replit auth
  const user = req.user as any;
  if (req.isAuthenticated() && user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Try to refresh token
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        // Token refresh failed
      }
    }
  }

  res.status(401).json({ message: "Unauthorized" });
};

// Optional auth middleware - doesn't fail, just sets user if available
export const optionalAuth: RequestHandler = async (req: any, _res, next) => {
  // Check session-based auth first
  if (req.session?.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.currentUser = user;
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Check Replit auth
  const user = req.user as any;
  if (req.isAuthenticated() && user?.claims?.sub) {
    try {
      const dbUser = await storage.getUser(user.claims.sub);
      if (dbUser) {
        req.currentUser = dbUser;
      }
    } catch (error) {
      // Ignore errors
    }
  }

  next();
};
