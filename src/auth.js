const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// ─── Configuration ──────────────────────────────────
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const JWKS_URI = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;

// JWKS client for fetching Microsoft's signing keys
const client = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

/**
 * Get signing key from Microsoft's JWKS endpoint
 */
function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verify and decode a JWT access token from Entra ID.
 */
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getSigningKey, {
      audience: `api://${CLIENT_ID}`,
      issuer: ISSUER,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

/**
 * Extract user info from a validated token.
 */
function extractUser(token) {
  return {
    userId: token.oid || token.sub,
    name: token.name || token.preferred_username || 'Unknown',
    email: token.preferred_username || token.email || ''
  };
}

/**
 * Authentication middleware for Azure Functions.
 * Extracts and validates the Bearer token from the Authorization header.
 *
 * When AZURE_TENANT_ID is not set (local dev), returns a mock user
 * so development works without Entra ID configuration.
 */
async function authenticate(request) {
  // Skip auth in local development if not configured
  if (!TENANT_ID || !CLIENT_ID) {
    return { userId: 'local-dev', name: 'Local Developer', email: 'dev@local' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const decoded = await verifyToken(authHeader.substring(7));
    return extractUser(decoded);
  } catch (err) {
    console.error('Token validation failed:', err.message);
    return null;
  }
}

module.exports = { authenticate };
