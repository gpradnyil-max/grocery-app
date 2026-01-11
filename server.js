const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
const PORT = process.env.PORT || 8080;

// BigQuery Configuration
const bigquery = new BigQuery();
const DATASET_ID = process.env.BQ_DATASET || 'grocery_app';
const TABLE_ID = process.env.BQ_TABLE || 'grocery_items';

// Initialize BigQuery dataset and table
async function initializeBigQuery() {
  try {
    // Create dataset if it doesn't exist
    const [datasets] = await bigquery.getDatasets();
    const datasetExists = datasets.some(ds => ds.id === DATASET_ID);
    
    if (!datasetExists) {
      await bigquery.createDataset(DATASET_ID);
      console.log(`📦 Created BigQuery dataset: ${DATASET_ID}`);
    }

    // Create table if it doesn't exist
    const dataset = bigquery.dataset(DATASET_ID);
    const [tables] = await dataset.getTables();
    const tableExists = tables.some(t => t.id === TABLE_ID);

    if (!tableExists) {
      const schema = [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'quantity', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'category', type: 'STRING', mode: 'NULLABLE' },
        { name: 'notes', type: 'STRING', mode: 'NULLABLE' },
        { name: 'bought', type: 'BOOLEAN', mode: 'NULLABLE' },
        { name: 'createdAt', type: 'TIMESTAMP', mode: 'NULLABLE' },
        { name: 'boughtAt', type: 'TIMESTAMP', mode: 'NULLABLE' }
      ];
      await dataset.createTable(TABLE_ID, { schema });
      console.log(`📋 Created BigQuery table: ${TABLE_ID}`);
    }

    console.log(`✅ BigQuery initialized: ${DATASET_ID}.${TABLE_ID}`);
  } catch (error) {
    console.error('❌ Error initializing BigQuery:', error.message);
    throw error;
  }
}

// Load all items from BigQuery
async function loadItemsFromBigQuery() {
  try {
    const query = `SELECT * FROM \`${DATASET_ID}.${TABLE_ID}\` ORDER BY createdAt DESC`;
    const [rows] = await bigquery.query({ query });
    return rows.map(row => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.value : null,
      boughtAt: row.boughtAt ? row.boughtAt.value : null
    }));
  } catch (error) {
    console.error('Error loading items from BigQuery:', error.message);
    return [];
  }
}

// Insert item into BigQuery using DML (not streaming insert to avoid buffer issues)
async function insertItemToBigQuery(item) {
  try {
    const query = `
      INSERT INTO \`${DATASET_ID}.${TABLE_ID}\` (id, name, quantity, category, notes, bought, createdAt, boughtAt)
      VALUES (@id, @name, @quantity, @category, @notes, @bought, @createdAt, @boughtAt)
    `;
    const options = {
      query,
      params: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        notes: item.notes || '',
        bought: item.bought,
        createdAt: item.createdAt ? bigquery.timestamp(new Date(item.createdAt)) : null,
        boughtAt: item.boughtAt ? bigquery.timestamp(new Date(item.boughtAt)) : null
      },
      types: {
        id: 'STRING',
        name: 'STRING',
        quantity: 'INT64',
        category: 'STRING',
        notes: 'STRING',
        bought: 'BOOL',
        createdAt: 'TIMESTAMP',
        boughtAt: 'TIMESTAMP'
      }
    };
    await bigquery.query(options);
    console.log(`✅ Inserted item: ${item.name}`);
  } catch (error) {
    console.error('Error inserting item to BigQuery:', error.message);
    throw error;
  }
}

// Update item in BigQuery using MERGE statement
async function updateItemInBigQuery(item) {
  try {
    const query = `
      MERGE \`${DATASET_ID}.${TABLE_ID}\` T
      USING (SELECT @id as id, @name as name, @quantity as quantity, @category as category, 
             @notes as notes, @bought as bought, @createdAt as createdAt, @boughtAt as boughtAt) S
      ON T.id = S.id
      WHEN MATCHED THEN
        UPDATE SET name = S.name, quantity = S.quantity, category = S.category,
                   notes = S.notes, bought = S.bought, createdAt = S.createdAt, boughtAt = S.boughtAt
    `;
    const options = {
      query,
      params: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        notes: item.notes || '',
        bought: item.bought,
        createdAt: item.createdAt ? bigquery.timestamp(new Date(item.createdAt)) : null,
        boughtAt: item.boughtAt ? bigquery.timestamp(new Date(item.boughtAt)) : null
      },
      types: {
        id: 'STRING',
        name: 'STRING',
        quantity: 'INT64',
        category: 'STRING',
        notes: 'STRING',
        bought: 'BOOL',
        createdAt: 'TIMESTAMP',
        boughtAt: 'TIMESTAMP'
      }
    };
    await bigquery.query(options);
    console.log(`✅ Updated item: ${item.name}`);
  } catch (error) {
    console.error('Error updating item in BigQuery:', error.message);
    throw error;
  }
}

// Delete item from BigQuery
async function deleteItemFromBigQuery(itemId) {
  try {
    const query = `DELETE FROM \`${DATASET_ID}.${TABLE_ID}\` WHERE id = @id`;
    const options = {
      query,
      params: { id: itemId }
    };
    await bigquery.query(options);
    console.log(`✅ Deleted item: ${itemId}`);
  } catch (error) {
    console.error('Error deleting item from BigQuery:', error.message);
    throw error;
  }
}

// Delete bought items from BigQuery
async function deleteBoughtItemsFromBigQuery() {
  try {
    const query = `DELETE FROM \`${DATASET_ID}.${TABLE_ID}\` WHERE bought = true`;
    await bigquery.query({ query });
    console.log(`✅ Cleared all bought items`);
  } catch (error) {
    console.error('Error clearing bought items from BigQuery:', error.message);
    throw error;
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache (loaded from BigQuery on startup)
let groceryItems = [];

// API Routes

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    groceryItems = await loadItemsFromBigQuery();
    res.json(groceryItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load items' });
  }
});

// Add new item
app.post('/api/items', async (req, res) => {
  try {
    const { name, quantity, category, notes } = req.body;
    const newItem = {
      id: uuidv4(),
      name,
      quantity: quantity || 1,
      category: category || 'other',
      notes: notes || '',
      bought: false,
      createdAt: new Date().toISOString(),
      boughtAt: null
    };
    
    await insertItemToBigQuery(newItem);
    groceryItems.push(newItem);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update item (mark as bought/unbought)
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bought, quantity, notes } = req.body;
    
    const itemIndex = groceryItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (bought !== undefined) groceryItems[itemIndex].bought = bought;
    if (quantity !== undefined) groceryItems[itemIndex].quantity = quantity;
    if (notes !== undefined) groceryItems[itemIndex].notes = notes;
    
    // Add timestamp for when item was bought
    if (bought === true) {
      groceryItems[itemIndex].boughtAt = new Date().toISOString();
    } else if (bought === false) {
      groceryItems[itemIndex].boughtAt = null;
    }
    
    await updateItemInBigQuery(groceryItems[itemIndex]);
    res.json(groceryItems[itemIndex]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const itemIndex = groceryItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await deleteItemFromBigQuery(id);
    groceryItems.splice(itemIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Clear all bought items
app.delete('/api/items/bought/clear', async (req, res) => {
  try {
    await deleteBoughtItemsFromBigQuery();
    groceryItems = groceryItems.filter(item => !item.bought);
    res.status(204).send();
  } catch (error) {
    console.error('Error clearing bought items:', error);
    res.status(500).json({ error: 'Failed to clear bought items' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the shopping list page
app.get('/shop', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

// Initialize BigQuery and start server
async function startServer() {
  try {
    await initializeBigQuery();
    groceryItems = await loadItemsFromBigQuery();
    console.log(`📦 Loaded ${groceryItems.length} items from BigQuery`);
    
    app.listen(PORT, () => {
      console.log(`🛒 Grocery App is running at http://localhost:${PORT}`);
      console.log(`📝 Add items: http://localhost:${PORT}`);
      console.log(`🛍️  Shopping list: http://localhost:${PORT}/shop`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
