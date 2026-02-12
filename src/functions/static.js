const { app } = require('@azure/functions');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

app.http('serveStatic', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: '{*filepath}',
  handler: async (request, context) => {
    let filepath = request.params.filepath || 'index.html';

    // Default to index.html for SPA routing
    const publicDir = path.join(__dirname, '..', '..', 'public');
    let fullPath = path.join(publicDir, filepath);

    // If file doesn't exist, serve index.html (SPA fallback)
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(publicDir, 'index.html');
      filepath = 'index.html';
    }

    try {
      const content = fs.readFileSync(fullPath);
      const ext = path.extname(filepath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return {
        status: 200,
        headers: { 'Content-Type': contentType },
        body: content
      };
    } catch {
      return { status: 404, body: 'Not found' };
    }
  }
});
