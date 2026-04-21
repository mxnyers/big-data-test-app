import { logger } from '../config/logger.js';

// Track unique user sessions to avoid logging on every request
const activeSessions = new Set();

/**
 * Middleware to extract user identity from Azure authentication
 * Sets req.userEmail with the authenticated user's email
 * Priority order:
 *   1. Azure Easy Auth header (x-ms-client-principal-name) - production with Entra ID auth
 *   2. Environment variable (AZURE_USER_EMAIL) - local development
 *   3. Fallback to system user
 */
export async function userContextMiddleware(req, res, next) {
  try {
    let userEmail;
    let userId;
    let source;

    // Priority A: AWS ALB/OIDC headers (if using ALB with OIDC or API Gateway authorizer)
    // Common headers: x-amzn-oidc-data, x-amzn-oidc-identity, x-amzn-oidc-sub
    if (req.headers['x-amzn-oidc-identity']) {
      userEmail = req.headers['x-amzn-oidc-identity'];
      source = 'AWS_ALB_OIDC_identity';
    } else if (req.headers['x-amzn-oidc-data']) {
      // some setups put a JSON-ish payload here; try to parse or fallback to raw
      try {
        // header may be URL-encoded or base64; try URI decode then JSON parse
        const decoded = decodeURIComponent(req.headers['x-amzn-oidc-data']);
        const parsed = JSON.parse(decoded);
        userEmail = parsed?.email || parsed?.username || parsed?.preferred_username || parsed?.sub;
        source = 'AWS_ALB_OIDC_data';
      } catch (e) {
        userEmail = req.headers['x-amzn-oidc-data'];
        source = 'AWS_ALB_OIDC_data_raw';
      }
    }

    // Priority B: Authorization Bearer token (Cognito / OIDC) - decode JWT without verifying
    if (!userEmail && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = parts[1];
          // base64 decode (handle padding)
          const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
          const buf = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          const obj = JSON.parse(buf.toString('utf8'));
          userEmail = obj.email || obj['cognito:username'] || obj.username || obj.preferred_username || obj.sub;
          userId = obj.sub || obj['cognito:username'] || undefined;
          source = 'AuthorizationBearer';
        }
      } catch (e) {
        logger.warn('Failed to decode Authorization token for user extraction', { err: e.message });
      }
    }

    // Priority C: Local dev or environment-provided user (keep compatibility)
    if (!userEmail && process.env.AWS_USER_EMAIL) {
      userEmail = process.env.AWS_USER_EMAIL;
      source = 'AWS_CLI';
    } else if (!userEmail && process.env.LOCAL_USER_EMAIL) {
      userEmail = process.env.LOCAL_USER_EMAIL;
      source = 'LocalEnv';
    }

    // Fallback to system user (for health checks and system operations)
    if (!userEmail) {
      userEmail = 'system@aws.local';
      source = source || 'Fallback';
      if (!req.url.includes('/healthz') && !req.url.includes('/robots')) {
        logger.warn('No authentication available, using system user', { userEmail, source });
      }
    }

    req.userEmail = userEmail;
    req.userId = userId;

    // Log when user signs in (only once per user session)
    if (!activeSessions.has(userEmail)) {
      activeSessions.add(userEmail);
      logger.info(`${userEmail} signed in via ${source}`, { userEmail, userId, source });
    }

    next();
  } catch (err) {
    logger.error({ err }, 'Error in user context middleware');
    req.userEmail = 'system@aws.local';
    next();
  }
}
