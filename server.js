const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// Data file path for persistence
const DATA_FILE = path.join(__dirname, 'data', 'grocery-items.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load items from file or initialize empty array
function loadItems() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
  return [];
}

// Save items to file
function saveItems() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groceryItems, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving items:', error);
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load persisted items on startup
let groceryItems = loadItems();
console.log(`📦 Loaded ${groceryItems.length} items from cache`);

// API Routes

// Get all items
app.get('/api/items', (req, res) => {
  res.json(groceryItems);
});

// Add new item
app.post('/api/items', (req, res) => {
  const { name, quantity, category, notes } = req.body;
  const newItem = {
    id: uuidv4(),
    name,
    quantity: quantity || 1,
    category: category || 'other',
    notes: notes || '',
    bought: false,
    createdAt: new Date().toISOString()
  };
  groceryItems.push(newItem);
  saveItems(); // Persist to file
  res.status(201).json(newItem);
});

// Update item (mark as bought/unbought)
app.put('/api/items/:id', (req, res) => {
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
    delete groceryItems[itemIndex].boughtAt;
  }
  
  saveItems(); // Persist to file
  res.json(groceryItems[itemIndex]);
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const itemIndex = groceryItems.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  groceryItems.splice(itemIndex, 1);
  saveItems(); // Persist to file
  res.status(204).send();
});

// Clear all bought items
app.delete('/api/items/bought/clear', (req, res) => {
  groceryItems = groceryItems.filter(item => !item.bought);
  saveItems(); // Persist to file
  res.status(204).send();
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the shopping list page
app.get('/shop', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

app.listen(PORT, () => {
  console.log(`🛒 Grocery App is running at http://localhost:${PORT}`);
  console.log(`📝 Add items: http://localhost:${PORT}`);
  console.log(`🛍️  Shopping list: http://localhost:${PORT}/shop`);
});
