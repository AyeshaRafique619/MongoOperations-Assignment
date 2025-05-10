const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// MongoDB Connection URL
const url = 'mongodb://localhost:27017';
const dbName = 'mongoOperationsDB';
let db;
let collection;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log('Connected to MongoDB');
    
    db = client.db(dbName);
    collection = db.collection('items');
    
    // Create an index on the 'name' field for better search performance
    await collection.createIndex({ name: 1 });
    
    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. insertOne - Insert a single document
app.post('/api/insertOne', async (req, res) => {
  try {
    const result = await collection.insertOne(req.body);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. insertMany - Insert multiple documents
app.post('/api/insertMany', async (req, res) => {
  try {
    const result = await collection.insertMany(req.body);
    res.json({ success: true, insertedCount: result.insertedCount, insertedIds: result.insertedIds });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. find - Find documents matching a query
app.post('/api/find', async (req, res) => {
  try {
    // Parse any ObjectIds in the query
    const query = parseObjectIds(req.body.query || {});
    const options = req.body.options || {};
    
    const cursor = collection.find(query);
    
    // Apply options if provided
    if (options.sort) cursor.sort(options.sort);
    if (options.limit) cursor.limit(parseInt(options.limit));
    if (options.skip) cursor.skip(parseInt(options.skip));
    
    const documents = await cursor.toArray();
    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. findOne - Find the first document matching a query
app.post('/api/findOne', async (req, res) => {
  try {
    const query = parseObjectIds(req.body.query || {});
    const document = await collection.findOne(query);
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. find().limit() - Limit the number of documents
// This is handled in the find route with options

// 6. find().skip() - Skip a number of documents (pagination)
// This is handled in the find route with options

// 7. find().sort() - Sort query results
// This is handled in the find route with options

// 8. distinct - Return distinct values for a field
app.post('/api/distinct', async (req, res) => {
  try {
    const { field, query } = req.body;
    const parsedQuery = query ? parseObjectIds(query) : {};
    const values = await collection.distinct(field, parsedQuery);
    res.json({ success: true, values });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. countDocuments - Count the number of matching documents
app.post('/api/countDocuments', async (req, res) => {
  try {
    const query = parseObjectIds(req.body.query || {});
    const count = await collection.countDocuments(query);
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. updateOne - Update the first matching document
app.post('/api/updateOne', async (req, res) => {
  try {
    const { filter, update, options } = req.body;
    console.log('Original filter:', JSON.stringify(filter));
    
    const parsedFilter = parseObjectIds(filter);
    console.log('Parsed filter:', JSON.stringify(parsedFilter, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'ObjectId') {
        return `ObjectId("${value.toString()}")`;
      }
      return value;
    }));
    
    const result = await collection.updateOne(parsedFilter, update, options || {});
    
    if (result.matchedCount === 0) {
      console.log(`No document found for update with filter: ${JSON.stringify(parsedFilter)}`);
      res.json({ 
        success: true, 
        matchedCount: 0, 
        modifiedCount: 0,
        message: 'No document found with the specified ID or criteria'
      });
    } else {
      res.json({ 
        success: true, 
        matchedCount: result.matchedCount, 
        modifiedCount: result.modifiedCount 
      });
    }
  } catch (error) {
    console.error('Error in updateOne:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 11. updateMany - Update multiple matching documents
app.post('/api/updateMany', async (req, res) => {
  try {
    const { filter, update, options } = req.body;
    const parsedFilter = parseObjectIds(filter);
    const result = await collection.updateMany(parsedFilter, update, options || {});
    res.json({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. replaceOne - Replace an entire document
app.post('/api/replaceOne', async (req, res) => {
  try {
    const { filter, replacement, options } = req.body;
    const parsedFilter = parseObjectIds(filter);
    const result = await collection.replaceOne(parsedFilter, replacement, options || {});
    res.json({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. deleteOne - Delete a single document
app.post('/api/deleteOne', async (req, res) => {
  try {
    const filter = req.body.filter || {};
    console.log('Original filter:', JSON.stringify(filter));
    
    const parsedFilter = parseObjectIds(filter);
    console.log('Parsed filter:', JSON.stringify(parsedFilter, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'ObjectId') {
        return `ObjectId("${value.toString()}")`;
      }
      return value;
    }));
    
    const result = await collection.deleteOne(parsedFilter);
    
    if (result.deletedCount === 0) {
      console.log(`No document found for deletion with filter: ${JSON.stringify(parsedFilter)}`);
      res.json({ 
        success: true, 
        deletedCount: 0,
        message: 'No document found with the specified ID or criteria'
      });
    } else {
      res.json({ success: true, deletedCount: result.deletedCount });
    }
  } catch (error) {
    console.error('Error in deleteOne:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 14. deleteMany - Delete multiple documents
app.post('/api/deleteMany', async (req, res) => {
  try {
    const filter = parseObjectIds(req.body.filter || {});
    const result = await collection.deleteMany(filter);
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. aggregate - Perform aggregation operations
app.post('/api/aggregate', async (req, res) => {
  try {
    const pipeline = req.body.pipeline || [];
    // Process any ObjectIds in the pipeline
    const parsedPipeline = pipeline.map(stage => {
      if (stage.$match) {
        stage.$match = parseObjectIds(stage.$match);
      }
      return stage;
    });
    
    const result = await collection.aggregate(parsedPipeline).toArray();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. createIndex - Create an index
app.post('/api/createIndex', async (req, res) => {
  try {
    const { keys, options } = req.body;
    const result = await collection.createIndex(keys, options || {});
    res.json({ success: true, indexName: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 17. dropIndex - Drop an index
app.post('/api/dropIndex', async (req, res) => {
  try {
    const { indexName } = req.body;
    const result = await collection.dropIndex(indexName);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 18. getIndexes - List all indexes
app.get('/api/getIndexes', async (req, res) => {
  try {
    const indexes = await collection.indexes();
    res.json({ success: true, indexes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 19. findOneAndUpdate - Find and update a document atomically
app.post('/api/findOneAndUpdate', async (req, res) => {
  try {
    const { filter, update, options } = req.body;
    console.log('Original filter:', JSON.stringify(filter));
    
    const parsedFilter = parseObjectIds(filter);
    console.log('Parsed filter:', JSON.stringify(parsedFilter, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'ObjectId') {
        return `ObjectId("${value.toString()}")`;
      }
      return value;
    }));
    
    const result = await collection.findOneAndUpdate(parsedFilter, update, options || {});
    
    if (!result.value) {
      console.log(`No document found for findOneAndUpdate with filter: ${JSON.stringify(parsedFilter)}`);
      res.json({ 
        success: true, 
        result: null,
        message: 'No document found with the specified ID or criteria'
      });
    } else {
      res.json({ success: true, result: result.value });
    }
  } catch (error) {
    console.error('Error in findOneAndUpdate:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 20. findOneAndDelete - Find and delete a document
app.post('/api/findOneAndDelete', async (req, res) => {
  try {
    const filter = req.body.filter || {};
    console.log('Original filter:', JSON.stringify(filter));
    
    const parsedFilter = parseObjectIds(filter);
    console.log('Parsed filter:', JSON.stringify(parsedFilter, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'ObjectId') {
        return `ObjectId("${value.toString()}")`;
      }
      return value;
    }));
    
    const result = await collection.findOneAndDelete(parsedFilter, req.body.options || {});
    
    if (!result.value) {
      console.log(`No document found for findOneAndDelete with filter: ${JSON.stringify(parsedFilter)}`);
      res.json({ 
        success: true, 
        result: null,
        message: 'No document found with the specified ID or criteria'
      });
    } else {
      res.json({ success: true, result: result.value });
    }
  } catch (error) {
    console.error('Error in findOneAndDelete:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 21. bulkWrite - Perform bulk write operations
app.post('/api/bulkWrite', async (req, res) => {
  try {
    const operations = req.body.operations || [];
    // Process operations to handle ObjectIds
    const parsedOperations = operations.map(op => {
      if (op.updateOne && op.updateOne.filter) {
        op.updateOne.filter = parseObjectIds(op.updateOne.filter);
      } else if (op.updateMany && op.updateMany.filter) {
        op.updateMany.filter = parseObjectIds(op.updateMany.filter);
      } else if (op.deleteOne && op.deleteOne.filter) {
        op.deleteOne.filter = parseObjectIds(op.deleteOne.filter);
      } else if (op.deleteMany && op.deleteMany.filter) {
        op.deleteMany.filter = parseObjectIds(op.deleteMany.filter);
      } else if (op.replaceOne && op.replaceOne.filter) {
        op.replaceOne.filter = parseObjectIds(op.replaceOne.filter);
      }
      return op;
    });
    
    const result = await collection.bulkWrite(parsedOperations, req.body.options || {});
    res.json({ 
      success: true, 
      insertedCount: result.insertedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      deletedCount: result.deletedCount,
      upsertedCount: result.upsertedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 22. findOneAndReplace - Find and replace a document
app.post('/api/findOneAndReplace', async (req, res) => {
  try {
    const { filter, replacement, options } = req.body;
    console.log('Original filter:', JSON.stringify(filter));
    
    const parsedFilter = parseObjectIds(filter);
    console.log('Parsed filter:', JSON.stringify(parsedFilter, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'ObjectId') {
        return `ObjectId("${value.toString()}")`;
      }
      return value;
    }));
    
    const result = await collection.findOneAndReplace(parsedFilter, replacement, options || {});
    
    if (!result.value) {
      console.log(`No document found for findOneAndReplace with filter: ${JSON.stringify(parsedFilter)}`);
      res.json({ 
        success: true, 
        result: null,
        message: 'No document found with the specified ID or criteria'
      });
    } else {
      res.json({ success: true, result: result.value });
    }
  } catch (error) {
    console.error('Error in findOneAndReplace:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 23. renameCollection - Rename a collection
app.post('/api/renameCollection', async (req, res) => {
  try {
    const { newName } = req.body;
    await collection.rename(newName);
    // Update the collection reference to use the new name
    collection = db.collection(newName);
    res.json({ success: true, message: `Collection renamed to ${newName}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 24. drop - Drop an entire collection
app.post('/api/drop', async (req, res) => {
  try {
    const result = await collection.drop();
    // Create a new empty collection with the same name
    collection = db.collection('items');
    res.json({ success: true, result });
  } catch (error) {
    if (error.message.includes('ns not found')) {
      // Collection already dropped, create a new one
      collection = db.collection('items');
      res.json({ success: true, message: 'Collection already dropped' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 25. listCollections - List all collections in the database
app.get('/api/listCollections', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json({ success: true, collections });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to parse ObjectIds in queries
function parseObjectIds(obj) {
  // Base cases
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => parseObjectIds(item));
  }
  
  // Make a copy to avoid modifying the original
  const result = { ...obj };
  
  // Process each key in the object
  for (const [key, value] of Object.entries(result)) {
    // Handle _id or any field that might be an ObjectId
    if ((key === '_id' || key.endsWith('Id') || key.endsWith('_id')) && typeof value === 'string') {
      // Check if it's a valid ObjectId format (24 hex chars)
      if (/^[0-9a-fA-F]{24}$/.test(value)) {
        try {
          result[key] = new ObjectId(value);
          continue; // Skip further processing for this key
        } catch (err) {
          console.warn(`Could not convert ${key} to ObjectId:`, err.message);
          // Keep original value if conversion fails
        }
      }
    }
    
    // Handle query operators like $in, $eq, etc.
    if (key.startsWith('$') && typeof value === 'object' && value !== null) {
      result[key] = parseObjectIds(value);
      continue;
    }
    
    // Recursively process nested objects and arrays
    if (typeof value === 'object' && value !== null) {
      result[key] = parseObjectIds(value);
    }
  }
  
  return result;
}
// Start server
async function startServer() {
  const client = await connectToMongo();
  
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  
  // Handle application shutdown
  process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
}

startServer().catch(console.error);