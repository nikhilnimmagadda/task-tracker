const { OAuth2Client } = require('google-auth-library');
const logger = require('./logger');

// ─── Configuration ──────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const oAuth2Client = new OAuth2Client();

/**
 * Verify a Google access token by calling Google's userinfo endpoint.
 */
async function verifyAccessToken(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Invalid access token');
  return res.json();
}

/**
 * Extract user info from Google userinfo response.
 */
function extractUser(profile) {
  return {
    userId: profile.sub,
    name: profile.name || profile.email || 'Unknown',
    email: profile.email || ''
  };
}

/**
 * Authentication middleware for Azure Functions.
 * Extracts and validates the Bearer token (Google access token) from the Authorization header.
 *
 * When GOOGLE_CLIENT_ID is not set (local dev), returns a mock user
 * so development works without Google OAuth configuration.
 */
async function authenticate(request) {
  // Skip auth in local development if not configured
  if (!GOOGLE_CLIENT_ID) {
    logger.info('[Auth] No GOOGLE_CLIENT_ID configured — using mock user');
    return { userId: 'local-dev', name: 'Local Developer', email: 'dev@local' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[Auth] Missing or invalid Authorization header', {
      hasHeader: !!authHeader,
      url: request.url
    });
    return null;
  }

  try {
    logger.info('[Auth] Verifying Google token...', { url: request.url });
    const profile = await verifyAccessToken(authHeader.substring(7));
    const user = extractUser(profile);
    logger.info('[Auth] Token verified', { userId: user.userId, name: user.name });
    return user;
  } catch (err) {
    logger.error('[Auth] Token validation failed', err, {
      errorName: err.name,
      url: request.url
    });
    return null;
  }
}

module.exports = { authenticate };
