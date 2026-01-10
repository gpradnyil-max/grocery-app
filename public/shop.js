/**
 * Grocery Buddy - Shopping Page
 * Logic for the shopping/checkout experience
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

const categoryNames = {
  fruits: 'Fruits',
  vegetables: 'Vegetables',
  dairy: 'Dairy',
  meat: 'Meat & Fish',
  bakery: 'Bakery',
  snacks: 'Snacks & Treats',
  drinks: 'Drinks',
  frozen: 'Frozen',
  household: 'Household',
  other: 'Other Items'
};

// Fun progress messages
const progressMessages = [
  { threshold: 0, message: "Let's start shopping! 🛒" },
  { threshold: 10, message: "Great start! Keep going! 🌟" },
  { threshold: 25, message: "You're doing amazing! 💪" },
  { threshold: 50, message: "Halfway there! 🎯" },
  { threshold: 75, message: "Almost done! So close! 🏃" },
  { threshold: 90, message: "Just a few more items! 🔥" },
  { threshold: 100, message: "All done! You're a superstar! 🌟" }
];

// DOM Elements
const shoppingList = document.getElementById('shopping-list');
const boughtCount = document.getElementById('bought-count');
const totalCount = document.getElementById('total-count');
const progressFill = document.getElementById('progress-fill');
const progressMessage = document.getElementById('progress-message');
const celebrationModal = document.getElementById('celebration-modal');

let allItems = [];
let celebrationShown = false;

// Load items on page load
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
});

// Load and display items
async function loadItems() {
  try {
    const response = await fetch('/api/items');
    allItems = await response.json();
    
    renderShoppingList(allItems);
    updateProgress();
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

// Render shopping list grouped by category
function renderShoppingList(items) {
  if (items.length === 0) {
    shoppingList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">✨</span>
        <p>No items to buy!</p>
        <p class="empty-hint">Go add some items first</p>
        <a href="/" class="empty-btn">
          <span>➕</span> Add Items
        </a>
      </div>
    `;
    return;
  }
  
  // Group items by category
  const grouped = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});
  
  // Sort categories and render
  const categoryOrder = ['fruits', 'vegetables', 'dairy', 'meat', 'bakery', 'snacks', 'drinks', 'frozen', 'household', 'other'];
  
  let html = '';
  
  categoryOrder.forEach(category => {
    if (grouped[category] && grouped[category].length > 0) {
      const items = grouped[category];
      const boughtInCategory = items.filter(i => i.bought).length;
      const allBought = boughtInCategory === items.length;
      
      html += `
        <div class="category-section ${allBought ? 'completed' : ''}">
          <div class="category-header">
            <span class="category-icon">${categoryEmojis[category]}</span>
            <span>${categoryNames[category]}</span>
            <span style="margin-left: auto; font-size: 14px; opacity: 0.7;">
              ${boughtInCategory}/${items.length}
            </span>
          </div>
          <div class="category-items">
            ${items.map(item => renderShopItem(item)).join('')}
          </div>
        </div>
      `;
    }
  });
  
  shoppingList.innerHTML = html;
}

// Render individual shopping item
function renderShopItem(item) {
  return `
    <div class="shop-item ${item.bought ? 'bought' : ''}" 
         data-id="${item.id}" 
         onclick="toggleItem('${item.id}', event)">
      <div class="shop-checkbox">
        ${item.bought ? '✓' : ''}
      </div>
      <span class="shop-item-emoji">${categoryEmojis[item.category] || '📦'}</span>
      <div class="shop-item-details">
        <div class="shop-item-name">${escapeHtml(item.name)}</div>
        ${item.notes ? `<div class="shop-item-info">${escapeHtml(item.notes)}</div>` : ''}
      </div>
      <span class="shop-item-quantity">×${item.quantity}</span>
    </div>
  `;
}

// Toggle item bought status
async function toggleItem(id, event) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  
  const newBoughtStatus = !item.bought;
  
  try {
    // Optimistic update
    item.bought = newBoughtStatus;
    
    // Get element for animation
    const element = document.querySelector(`[data-id="${id}"]`);
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Trigger celebration if item is being checked
    if (newBoughtStatus) {
      element.classList.add('success-pulse');
      partyTime(x, y);
      
      // Play a fun sound effect (optional - browser may block)
      playCheckSound();
    }
    
    // Update UI
    renderShoppingList(allItems);
    updateProgress();
    
    // Send to server
    await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bought: newBoughtStatus })
    });
    
    // Check if all items are bought
    checkCompletion();
    
  } catch (error) {
    console.error('Error updating item:', error);
    // Revert on error
    item.bought = !newBoughtStatus;
    renderShoppingList(allItems);
    updateProgress();
  }
}

// Update progress bar and stats
function updateProgress() {
  const total = allItems.length;
  const bought = allItems.filter(i => i.bought).length;
  const percentage = total > 0 ? Math.round((bought / total) * 100) : 0;
  
  boughtCount.textContent = bought;
  totalCount.textContent = total;
  progressFill.style.width = `${percentage}%`;
  
  // Update progress message
  let message = progressMessages[0].message;
  for (const pm of progressMessages) {
    if (percentage >= pm.threshold) {
      message = pm.message;
    }
  }
  progressMessage.textContent = message;
  
  // Change progress bar color based on completion
  if (percentage === 100) {
    progressFill.style.background = 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
  } else if (percentage >= 50) {
    progressFill.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
  }
}

// Check if shopping is complete
function checkCompletion() {
  const total = allItems.length;
  const bought = allItems.filter(i => i.bought).length;
  
  if (total > 0 && bought === total && !celebrationShown) {
    celebrationShown = true;
    
    // Delay to let the last item animation complete
    setTimeout(() => {
      showCelebration();
    }, 500);
  } else if (bought < total) {
    celebrationShown = false;
  }
}

// Show celebration modal
function showCelebration() {
  celebrationModal.classList.add('active');
  megaCelebration();
}

// Close celebration modal
function closeModal() {
  celebrationModal.classList.remove('active');
}

// Clear all bought items
async function clearBoughtItems() {
  const boughtItems = allItems.filter(i => i.bought);
  
  if (boughtItems.length === 0) {
    showToast('No bought items to clear! 🤷');
    return;
  }
  
  // Confirm with user
  if (!confirm(`Remove ${boughtItems.length} bought item${boughtItems.length > 1 ? 's' : ''} from your list?`)) {
    return;
  }
  
  try {
    // Delete each bought item
    for (const item of boughtItems) {
      await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
    }
    
    showToast(`Cleared ${boughtItems.length} item${boughtItems.length > 1 ? 's' : ''}! ✨`);
    celebrationShown = false;
    loadItems();
  } catch (error) {
    console.error('Error clearing items:', error);
    showToast('Could not clear items 😕', 'error');
  }
}

// Play check sound (subtle feedback)
function playCheckSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Audio not supported or blocked
  }
}

// Toast notification
function showToast(message, type = 'success') {
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
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on outside click
celebrationModal.addEventListener('click', (e) => {
  if (e.target === celebrationModal) {
    closeModal();
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && celebrationModal.classList.contains('active')) {
    closeModal();
  }
});
