const { app } = require('@azure/functions');
const { getContainers } = require('../cosmosClient');
const { v4: uuidv4 } = require('uuid');

// ─── POST /api/tasks/:taskId/comments ───────────────
app.http('addComment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'api/tasks/{taskId}/comments',
  handler: async (request, context) => {
    try {
      const { tasksContainer, commentsContainer } = await getContainers();
      const taskId = request.params.taskId;
      const body = await request.json();

      // Verify task exists
      const { resources: tasks } = await tasksContainer.items
        .query({ query: 'SELECT c.id FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: taskId }] })
        .fetchAll();

      if (tasks.length === 0) {
        return { status: 404, jsonBody: { error: 'Task not found' } };
      }

      if (!body.text || !body.text.trim()) {
        return { status: 400, jsonBody: { error: 'Comment text is required' } };
      }

      const comment = {
        id: uuidv4(),
        taskId: taskId,
        text: body.text.trim(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await commentsContainer.items.create(comment);
      return { status: 201, jsonBody: resource };
    } catch (err) {
      context.log('Error adding comment:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to add comment' } };
    }
  }
});

// ─── DELETE /api/comments/:id ───────────────────────
app.http('deleteComment', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'api/comments/{id}',
  handler: async (request, context) => {
    try {
      const { commentsContainer } = await getContainers();
      const id = request.params.id;

      // Find the comment to get its partition key (taskId)
      const { resources: comments } = await commentsContainer.items
        .query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: id }] })
        .fetchAll();

      if (comments.length === 0) {
        return { status: 404, jsonBody: { error: 'Comment not found' } };
      }

      await commentsContainer.item(id, comments[0].taskId).delete();
      return { jsonBody: { success: true } };
    } catch (err) {
      context.log('Error deleting comment:', err.message);
      return { status: 500, jsonBody: { error: 'Failed to delete comment' } };
    }
  }
});
