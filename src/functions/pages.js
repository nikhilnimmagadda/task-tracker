const { app } = require('@azure/functions');
const { getContainers } = require('../cosmosClient');
const { v4: uuidv4 } = require('uuid');

const MAX_CONTENT_LENGTH = 500;

// ─── GET /api/folders/:folderId/pages ───────────────
app.http('getPages', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'api/folders/{folderId}/pages',
  handler: async (request, context) => {
    try {
      const { pagesContainer } = await getContainers();
      const folderId = request.params.folderId;

      const { resources: pages } = await pagesContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.folderId = @folderId',
          parameters: [{ name: '@folderId', value: folderId }]
        })
        .fetchAll();

      pages.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return { jsonBody: pages };
    } catch (err) {
      context.log('Error fetching pages:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to fetch pages' } };
    }
  }
});

// ─── GET /api/pages/:id ─────────────────────────────
app.http('getPage', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'api/pages/{id}',
  handler: async (request, context) => {
    try {
      const { pagesContainer } = await getContainers();
      const id = request.params.id;

      const { resources: pages } = await pagesContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();

      if (pages.length === 0) {
        return { status: 404, jsonBody: { error: 'Page not found' } };
      }

      return { jsonBody: pages[0] };
    } catch (err) {
      context.log('Error fetching page:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to fetch page' } };
    }
  }
});

// ─── POST /api/folders/:folderId/pages ──────────────
app.http('createPage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'api/folders/{folderId}/pages',
  handler: async (request, context) => {
    try {
      const { foldersContainer, pagesContainer } = await getContainers();
      const folderId = request.params.folderId;
      const body = await request.json();

      // Verify folder exists
      const { resources: folders } = await foldersContainer.items
        .query({ query: 'SELECT c.id FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: folderId }] })
        .fetchAll();

      if (folders.length === 0) {
        return { status: 404, jsonBody: { error: 'Folder not found' } };
      }

      if (!body.title || !body.title.trim()) {
        return { status: 400, jsonBody: { error: 'Page title is required' } };
      }

      const content = body.content || '';
      if (content.length > MAX_CONTENT_LENGTH) {
        return { status: 400, jsonBody: { error: `Content exceeds ${MAX_CONTENT_LENGTH} character limit` } };
      }

      const page = {
        id: uuidv4(),
        folderId,
        title: body.title.trim(),
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { resource } = await pagesContainer.items.create(page);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      context.log('Error creating page:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to create page' } };
    }
  }
});

// ─── PUT /api/pages/:id ─────────────────────────────
app.http('updatePage', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'api/pages/{id}',
  handler: async (request, context) => {
    try {
      const { pagesContainer } = await getContainers();
      const id = request.params.id;
      const body = await request.json();

      const { resources: pages } = await pagesContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();

      if (pages.length === 0) {
        return { status: 404, jsonBody: { error: 'Page not found' } };
      }

      const page = pages[0];

      if (body.title !== undefined) page.title = body.title.trim();
      if (body.content !== undefined) {
        if (body.content.length > MAX_CONTENT_LENGTH) {
          return { status: 400, jsonBody: { error: `Content exceeds ${MAX_CONTENT_LENGTH} character limit` } };
        }
        page.content = body.content;
      }
      page.updatedAt = new Date().toISOString();

      await pagesContainer.item(id, page.folderId).replace(page);
      return { jsonBody: page };
    } catch (err) {
      context.log('Error updating page:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to update page' } };
    }
  }
});

// ─── DELETE /api/pages/:id ──────────────────────────
app.http('deletePage', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'api/pages/{id}',
  handler: async (request, context) => {
    try {
      const { pagesContainer } = await getContainers();
      const id = request.params.id;

      const { resources: pages } = await pagesContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();

      if (pages.length === 0) {
        return { status: 404, jsonBody: { error: 'Page not found' } };
      }

      await pagesContainer.item(id, pages[0].folderId).delete();
      return { jsonBody: { success: true } };
    } catch (err) {
      context.log('Error deleting page:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to delete page' } };
    }
  }
});
