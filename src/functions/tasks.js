const { app } = require('@azure/functions');
const { getContainers } = require('../cosmosClient');
const { authenticate } = require('../auth');
const { v4: uuidv4 } = require('uuid');

// ─── GET /api/tasks ─────────────────────────────────
app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'api/tasks',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { tasksContainer } = await getContainers();
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const sort = url.searchParams.get('sort');

      let query = 'SELECT * FROM c WHERE c.userId = @userId';
      const params = [{ name: '@userId', value: user.userId }];

      if (status && ['todo', 'in-progress', 'done'].includes(status)) {
        query += ' AND c.status = @status';
        params.push({ name: '@status', value: status });
      }

      // Cosmos DB serverless: use single-field ORDER BY, then sort in-memory for secondary
      const { resources: tasks } = await tasksContainer.items
        .query({ query, parameters: params })
        .fetchAll();

      // Sort in-memory (avoids composite index requirement)
      if (sort === 'date') {
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sort === 'progress') {
        tasks.sort((a, b) => b.progress - a.progress || a.priority - b.priority);
      } else {
        tasks.sort((a, b) => a.priority - b.priority || new Date(b.createdAt) - new Date(a.createdAt));
      }

      return { jsonBody: tasks };
    } catch (err) {
      context.log('Error fetching tasks:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to fetch tasks' } };
    }
  }
});

// ─── GET /api/tasks/:id ─────────────────────────────
app.http('getTask', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'api/tasks/{id}',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { tasksContainer, commentsContainer } = await getContainers();
      const id = request.params.id;

      const { resources: tasks } = await tasksContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
          parameters: [{ name: '@id', value: id }, { name: '@userId', value: user.userId }]
        })
        .fetchAll();

      if (tasks.length === 0) {
        return { status: 404, jsonBody: { error: 'Task not found' } };
      }

      const task = tasks[0];

      // Fetch comments for this task
      const { resources: comments } = await commentsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.taskId = @taskId ORDER BY c.createdAt DESC',
          parameters: [{ name: '@taskId', value: id }]
        })
        .fetchAll();

      return { jsonBody: { ...task, comments } };
    } catch (err) {
      context.log('Error fetching task:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to fetch task' } };
    }
  }
});

// ─── POST /api/tasks ────────────────────────────────
app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'api/tasks',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { tasksContainer } = await getContainers();
      const body = await request.json();

      if (!body.title || !body.title.trim()) {
        return { status: 400, jsonBody: { error: 'Title is required' } };
      }

      const task = {
        id: uuidv4(),
        partitionKey: 'task',
        userId: user.userId,
        title: body.title.trim(),
        description: (body.description || '').trim(),
        status: ['todo', 'in-progress', 'done'].includes(body.status) ? body.status : 'todo',
        priority: Math.min(5, Math.max(1, parseInt(body.priority) || 3)),
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { resource } = await tasksContainer.items.create(task);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      context.log('Error creating task:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to create task' } };
    }
  }
});

// ─── PUT /api/tasks/:id ─────────────────────────────
app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'api/tasks/{id}',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { tasksContainer } = await getContainers();
      const id = request.params.id;
      const body = await request.json();

      const { resources: tasks } = await tasksContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
          parameters: [{ name: '@id', value: id }, { name: '@userId', value: user.userId }]
        })
        .fetchAll();

      if (tasks.length === 0) {
        return { status: 404, jsonBody: { error: 'Task not found' } };
      }

      const existing = tasks[0];
      const updated = {
        ...existing,
        title: (body.title || existing.title).trim(),
        description: (body.description !== undefined ? body.description : existing.description).trim(),
        status: ['todo', 'in-progress', 'done'].includes(body.status) ? body.status : existing.status,
        priority: Math.min(5, Math.max(1, parseInt(body.priority) || existing.priority)),
        progress: Math.min(100, Math.max(0, parseInt(body.progress) ?? existing.progress)),
        updatedAt: new Date().toISOString()
      };

      const { resource } = await tasksContainer.item(id, existing.partitionKey).replace(updated);
      return { jsonBody: resource };
    } catch (err) {
      context.log('Error updating task:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to update task' } };
    }
  }
});

// ─── DELETE /api/tasks/:id ──────────────────────────
app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'api/tasks/{id}',
  handler: async (request, context) => {
    const user = await authenticate(request);
    if (!user) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const { tasksContainer, commentsContainer } = await getContainers();
      const id = request.params.id;

      const { resources: tasks } = await tasksContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id AND c.userId = @userId',
          parameters: [{ name: '@id', value: id }, { name: '@userId', value: user.userId }]
        })
        .fetchAll();

      if (tasks.length === 0) {
        return { status: 404, jsonBody: { error: 'Task not found' } };
      }

      // Delete all comments for this task
      const { resources: comments } = await commentsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.taskId = @taskId',
          parameters: [{ name: '@taskId', value: id }]
        })
        .fetchAll();

      for (const comment of comments) {
        await commentsContainer.item(comment.id, comment.taskId).delete();
      }

      // Delete the task
      await tasksContainer.item(id, tasks[0].partitionKey).delete();
      return { jsonBody: { success: true } };
    } catch (err) {
      context.log('Error deleting task:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to delete task' } };
    }
  }
});
