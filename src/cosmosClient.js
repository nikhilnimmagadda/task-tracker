const { CosmosClient } = require('@azure/cosmos');
const path = require('path');
const fs = require('fs');

let client;
let database;
let tasksContainer;
let commentsContainer;
let useLocalFallback = false;

// ─── Local JSON fallback for when Cosmos DB is unavailable ───
const DATA_FILE = path.join(__dirname, '..', 'data.json');

function loadLocalData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { tasks: [], comments: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveLocalData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Creates a local container shim that mimics Cosmos DB container API
 * but stores data in a JSON file. Used when Cosmos emulator/cloud is unavailable.
 */
function createLocalContainer(collectionName) {
  return {
    items: {
      create: async (item) => {
        const data = loadLocalData();
        data[collectionName].push(item);
        saveLocalData(data);
        return { resource: item };
      },
      query: (querySpec) => ({
        fetchAll: async () => {
          const data = loadLocalData();
          let items = [...data[collectionName]];

          // Basic WHERE parsing
          const queryStr = typeof querySpec === 'string' ? querySpec : querySpec.query;
          const params = (typeof querySpec === 'object' ? querySpec.parameters : []) || [];

          if (queryStr.includes('WHERE')) {
            const conditions = queryStr.split('WHERE')[1].split('ORDER BY')[0].trim();
            // Handle c.status = @status, c.id = @id, c.taskId = @taskId
            const match = conditions.match(/c\.(\w+)\s*=\s*@(\w+)/);
            if (match) {
              const field = match[1];
              const paramName = '@' + match[2];
              const param = params.find(p => p.name === paramName);
              if (param) {
                items = items.filter(i => i[field] === param.value);
              }
            }
          }

          // Basic ORDER BY parsing
          if (queryStr.includes('ORDER BY')) {
            const orderPart = queryStr.split('ORDER BY')[1].trim();
            const orderClauses = orderPart.split(',').map(c => {
              const parts = c.trim().split(/\s+/);
              const field = parts[0].replace('c.', '');
              const dir = (parts[1] || '').toUpperCase() === 'DESC' ? -1 : 1;
              return { field, dir };
            });
            items.sort((a, b) => {
              for (const { field, dir } of orderClauses) {
                if (a[field] < b[field]) return -1 * dir;
                if (a[field] > b[field]) return 1 * dir;
              }
              return 0;
            });
          }

          return { resources: items };
        }
      })
    },
    item: (id, partitionKey) => ({
      replace: async (item) => {
        const data = loadLocalData();
        const idx = data[collectionName].findIndex(i => i.id === id);
        if (idx !== -1) {
          data[collectionName][idx] = item;
          saveLocalData(data);
        }
        return { resource: item };
      },
      delete: async () => {
        const data = loadLocalData();
        data[collectionName] = data[collectionName].filter(i => i.id !== id);
        saveLocalData(data);
      }
    })
  };
}

/**
 * Initialize Cosmos DB client and ensure database/containers exist.
 * Falls back to local JSON storage if Cosmos DB is unavailable.
 */
async function getContainers() {
  if (tasksContainer && commentsContainer) {
    return { tasksContainer, commentsContainer };
  }

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE || 'tasktracker';
  const tasksContainerId = process.env.COSMOS_CONTAINER_TASKS || 'tasks';
  const commentsContainerId = process.env.COSMOS_CONTAINER_COMMENTS || 'comments';

  // Try Cosmos DB first
  if (endpoint && key) {
    // Disable TLS rejection for local Cosmos DB emulator
    if (endpoint.includes('localhost')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    try {
      client = new CosmosClient({ endpoint, key });
      const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
      database = db;

      const { container: tc } = await database.containers.createIfNotExists({
        id: tasksContainerId,
        partitionKey: { paths: ['/partitionKey'] },
        indexingPolicy: { automatic: true, indexingMode: 'consistent' }
      });
      tasksContainer = tc;

      const { container: cc } = await database.containers.createIfNotExists({
        id: commentsContainerId,
        partitionKey: { paths: ['/taskId'] }
      });
      commentsContainer = cc;

      console.log('Connected to Cosmos DB at', endpoint);
      return { tasksContainer, commentsContainer };
    } catch (err) {
      console.error('Cosmos DB connection error:', err.message);
      // In Azure (production), don't fall back — surface the error
      if (process.env.WEBSITE_SITE_NAME) {
        throw err;
      }
      console.warn('Falling back to local JSON storage');
    }
  }

  // Fallback to local file storage
  useLocalFallback = true;
  if (!fs.existsSync(DATA_FILE)) saveLocalData({ tasks: [], comments: [] });
  tasksContainer = createLocalContainer('tasks');
  commentsContainer = createLocalContainer('comments');
  console.log('Using local JSON file storage (data.json)');
  return { tasksContainer, commentsContainer };
}

module.exports = { getContainers };
