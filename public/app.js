/**
 * Grocery Buddy - Add Items Page
 * Main application logic for adding grocery items
 */

// Category emoji mappings
const categoryEmojis = {
  fruits: '🍎',
  vegetables: '🥬',
  dairy: '🥛',
  meat: '🥩',
  bakery: '🍞',
  snacks: '🍪',
  drinks: '🥤',
  frozen: '🧊',
  household: '🧹',
  other: '📦'
};

// DOM Elements
const addItemForm = document.getElementById('add-item-form');
const itemNameInput = document.getElementById('item-name');
const itemQuantityInput = document.getElementById('item-quantity');
const itemCategorySelect = document.getElementById('item-category');
const itemNotesInput = document.getElementById('item-notes');
const itemsList = document.getElementById('items-list');
const itemsCount = document.getElementById('items-count');

// Load items on page load
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  
  // Add some fun entrance animation
  setTimeout(() => {
    document.querySelector('.form-card').classList.add('pop-in');
  }, 100);
});

// Quantity controls
function increaseQty() {
  const current = parseInt(itemQuantityInput.value) || 1;
  if (current < 99) {
    itemQuantityInput.value = current + 1;
    itemQuantityInput.classList.add('pop-in');
    setTimeout(() => itemQuantityInput.classList.remove('pop-in'), 300);
  }
}

function decreaseQty() {
  const current = parseInt(itemQuantityInput.value) || 1;
  if (current > 1) {
    itemQuantityInput.value = current - 1;
    itemQuantityInput.classList.add('pop-in');
    setTimeout(() => itemQuantityInput.classList.remove('pop-in'), 300);
  }
}

// Form submission
addItemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = itemNameInput.value.trim();
  const quantity = parseInt(itemQuantityInput.value) || 1;
  const category = itemCategorySelect.value;
  const notes = itemNotesInput.value.trim();
  
  if (!name) {
    itemNameInput.classList.add('shake');
    setTimeout(() => itemNameInput.classList.remove('shake'), 500);
    return;
  }
  
  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity, category, notes })
    });
    
    if (response.ok) {
      const newItem = await response.json();
      
      // Get button position for confetti
      const submitBtn = addItemForm.querySelector('.submit-btn');
      const rect = submitBtn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      
      // Party time! 🎉
      partyTime(x, y);
      
      // Reset form
      itemNameInput.value = '';
      itemQuantityInput.value = '1';
      itemNotesInput.value = '';
      itemNameInput.focus();
      
      // Reload items
      loadItems();
      
      // Show success feedback
      showToast(`${categoryEmojis[category]} ${name} added!`);
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showToast('Oops! Something went wrong 😕', 'error');
  }
});

// Load and display items
async function loadItems() {
  try {
    const response = await fetch('/api/items');
    const items = await response.json();
    
    // Filter out bought items for the add page
    const pendingItems = items.filter(item => !item.bought);
    
    renderItems(pendingItems);
    updateItemsCount(pendingItems.length);
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Render items list
function renderItems(items) {
  if (items.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🛒</span>
        <p>Your list is empty!</p>
        <p class="empty-hint">Add some items above to get started</p>
      </div>
    `;
    return;
  }
  
  // Sort by category
  const sortedItems = items.sort((a, b) => a.category.localeCompare(b.category));
  
  itemsList.innerHTML = sortedItems.map(item => `
    <div class="item-card" data-id="${item.id}">
      <div class="item-emoji">${categoryEmojis[item.category] || '📦'}</div>
      <div class="item-details">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">
          <span class="item-quantity">
            <span>×</span> ${item.quantity}
          </span>
          ${item.notes ? `<span class="item-notes">${escapeHtml(item.notes)}</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="item-btn delete" onclick="deleteItem('${item.id}')" title="Remove">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

// Update items count
function updateItemsCount(count) {
  itemsCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

// Delete item
async function deleteItem(id) {
  try {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.style.transform = 'translateX(100%)';
      card.style.opacity = '0';
    }
    
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    
    setTimeout(() => loadItems(), 300);
    showToast('Item removed! 👋');
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast('Could not delete item 😕', 'error');
  }
}

// Toast notification
function showToast(message, type = 'success') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: ${type === 'error' ? '#FF3B30' : '#34C759'};
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 16px;
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Focus search on / key
  if (e.key === '/' && document.activeElement !== itemNameInput) {
    e.preventDefault();
    itemNameInput.focus();
  }
});
