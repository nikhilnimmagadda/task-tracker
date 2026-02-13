const { app } = require('@azure/functions');
const { getContainers } = require('../cosmosClient');
const { authenticate } = require('../auth');
const { v4: uuidv4 } = require('uuid');

// ─── GET /api/folders ───────────────────────────────
app.http('getFolders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'api/folders',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { foldersContainer } = await getContainers();
      const { resources: folders } = await foldersContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: user.userId }]
        })
        .fetchAll();

      folders.sort((a, b) => a.name.localeCompare(b.name));
      return { jsonBody: folders };
    } catch (err) {
      context.log('Error fetching folders:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to fetch folders' } };
    }
  }
});

// ─── POST /api/folders ──────────────────────────────
app.http('createFolder', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'api/folders',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { foldersContainer } = await getContainers();
      const body = await request.json();

      if (!body.name || !body.name.trim()) {
        return { status: 400, jsonBody: { error: 'Folder name is required' } };
      }

      const folder = {
        id: uuidv4(),
        partitionKey: 'folder',
        userId: user.userId,
        name: body.name.trim(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await foldersContainer.items.create(folder);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      context.log('Error creating folder:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to create folder' } };
    }
  }
});

// ─── PUT /api/folders/:id ───────────────────────────
app.http('updateFolder', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'api/folders/{id}',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { foldersContainer } = await getContainers();
      const id = request.params.id;
      const body = await request.json();

      const { resources: folders } = await foldersContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
          parameters: [{ name: '@id', value: id }, { name: '@userId', value: user.userId }]
        })
        .fetchAll();

      if (folders.length === 0) {
        return { status: 404, jsonBody: { error: 'Folder not found' } };
      }

      const folder = folders[0];
      if (body.name !== undefined) folder.name = body.name.trim();

      await foldersContainer.item(id, folder.partitionKey).replace(folder);
      return { jsonBody: folder };
    } catch (err) {
      context.log('Error updating folder:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to update folder' } };
    }
  }
});

// ─── DELETE /api/folders/:id ────────────────────────
app.http('deleteFolder', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'api/folders/{id}',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { foldersContainer, pagesContainer } = await getContainers();
      const id = request.params.id;

      const { resources: folders } = await foldersContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
          parameters: [{ name: '@id', value: id }, { name: '@userId', value: user.userId }]
        })
        .fetchAll();

      if (folders.length === 0) {
        return { status: 404, jsonBody: { error: 'Folder not found' } };
      }

      // Cascade delete all pages in this folder
      const { resources: pages } = await pagesContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.folderId = @folderId', parameters: [{ name: '@folderId', value: id }] })
        .fetchAll();

      for (const page of pages) {
        await pagesContainer.item(page.id, page.folderId).delete();
      }

      await foldersContainer.item(id, folders[0].partitionKey).delete();
      return { jsonBody: { success: true } };
    } catch (err) {
      context.log('Error deleting folder:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to delete folder' } };
    }
  }
});
