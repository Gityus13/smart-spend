// ============================================
// DATA MANAGEMENT
// ============================================

const STORAGE_KEY = 'smartspend_data';
const RECENTS_KEY = 'smartspend_recents';

// Default categories for reference
const DEFAULT_CATEGORIES = {
  food: { icon: '🍔', color: '#FF6B6B' },
  transport: { icon: '🚗', color: '#4ECDC4' },
  games: { icon: '🎮', color: '#FFE66D' },
  shopping: { icon: '🛍️', color: '#95E1D3' },
  bills: { icon: '📄', color: '#C7CEEA' },
};

// Function to get icon for a category (custom or default)
function getCategoryIcon(category) {
  const lower = category.toLowerCase();
  if (DEFAULT_CATEGORIES[lower]) {
    return DEFAULT_CATEGORIES[lower].icon;
  }
  // Generate a random emoji for custom categories
  const emojis = ['💰', '🎯', '📱', '🎁', '✈️', '🏠', '🍽️', '🎬', '📚', '⚽', '🎵', '💻'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// Function to get color for a category (custom or default)
function getCategoryColor(category) {
  const lower = category.toLowerCase();
  if (DEFAULT_CATEGORIES[lower]) {
    return DEFAULT_CATEGORIES[lower].color;
  }
  // Generate a random color for custom categories
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#C7CEEA', '#FF8B94', '#A8E6CF', '#FFD3B6', '#FFAAA5', '#FF8B94'];
  return colors[Math.floor(Math.random() * colors.length)];
}

const TIPS = {
  food: [
    'Try cooking at home instead of eating out to save money.',
    'Buying snacks in bulk can be cheaper than single items.',
    'Plan your meals to avoid impulse food purchases.',
  ],
  transport: [
    'Try walking or cycling instead of taking transport.',
    'Consider carpooling to share transportation costs.',
    'Using public transport passes can save money.',
  ],
  games: [
    'Looks like you\'re spending on games—maybe limit it!',
    'Consider free alternatives to paid games.',
    'Set a weekly budget for entertainment.',
  ],
  shopping: [
    'Make a shopping list to avoid impulse buys.',
    'Look for discounts and sales before purchasing.',
    'Consider secondhand options for better deals.',
  ],
  bills: [
    'Review your subscriptions and cancel unused ones.',
    'Compare utility providers for better rates.',
    'Set reminders to pay bills on time to avoid late fees.',
  ],
};

let appState = {
  currentPage: 'home',
  todayData: null,
  recentsData: [],
  charts: {},
};

// Initialize data from localStorage
function initializeData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's data
  const storedToday = localStorage.getItem(STORAGE_KEY);
  let currentDay;

  if (storedToday) {
    const parsed = JSON.parse(storedToday);
    
    // Check if we need to reset (24 hours passed)
    if (parsed.date === today && parsed.firstEntryTime) {
      const hoursPassed = (Date.now() - parsed.firstEntryTime) / (1000 * 60 * 60);
      if (hoursPassed >= 24) {
        // Move today to recents
        moveToRecents(parsed);
        currentDay = createNewDay(today);
      } else {
        currentDay = parsed;
      }
    } else if (parsed.date !== today) {
      // Different day - move old to recents and create new
      if (parsed.spendings.length > 0) {
        moveToRecents(parsed);
      }
      currentDay = createNewDay(today);
    } else {
      currentDay = parsed;
    }
  } else {
    currentDay = createNewDay(today);
  }

  // Get recents data
  const storedRecents = localStorage.getItem(RECENTS_KEY);
  const recents = storedRecents ? JSON.parse(storedRecents) : [];

  appState.todayData = currentDay;
  appState.recentsData = recents;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDay));
}

function createNewDay(date) {
  return {
    date,
    spendings: [],
    total: 0,
    firstEntryTime: 0,
  };
}

function moveToRecents(dayData) {
  appState.recentsData.unshift(dayData);
  // Keep only last 90 days
  if (appState.recentsData.length > 90) {
    appState.recentsData.pop();
  }
  localStorage.setItem(RECENTS_KEY, JSON.stringify(appState.recentsData));
}

function addSpending(amount, description, category) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const spending = {
    id: Date.now().toString(),
    amount: parseFloat(amount),
    description,
    category,
    timestamp: Date.now(),
    time,
  };

  appState.todayData.spendings.push(spending);
  appState.todayData.total += spending.amount;
  appState.todayData.firstEntryTime = appState.todayData.firstEntryTime || Date.now();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.todayData));
  
  return spending;
}

function deleteSpending(id) {
  const spending = appState.todayData.spendings.find(s => s.id === id);
  if (!spending) return;

  appState.todayData.spendings = appState.todayData.spendings.filter(s => s.id !== id);
  appState.todayData.total -= spending.amount;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.todayData));
}

function clearHistory() {
  appState.recentsData = [];
  localStorage.setItem(RECENTS_KEY, JSON.stringify([]));
}

function getWeeklyStats() {
  const stats = {};
  const today = new Date();

  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    stats[dateStr] = 0;
  }

  // Add today's total
  if (appState.todayData) {
    stats[appState.todayData.date] = appState.todayData.total;
  }

  // Add recents data
  appState.recentsData.forEach(day => {
    if (stats.hasOwnProperty(day.date)) {
      stats[day.date] = day.total;
    }
  });

  return stats;
}

function getCategoryStats() {
  const stats = {};

  if (appState.todayData) {
    appState.todayData.spendings.forEach(spending => {
      stats[spending.category] = (stats[spending.category] || 0) + 1;
    });
  }

  return stats;
}

// ============================================
// UI RENDERING
// ============================================

function updateCurrentDate() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  document.getElementById('current-date').textContent = today;
}

function updateTodayTotal() {
  const total = appState.todayData?.total || 0;
  document.getElementById('today-total').textContent = `$${total.toFixed(2)}`;
}

function renderSpendingsList() {
  const container = document.getElementById('spendings-list');
  
  if (!appState.todayData || appState.todayData.spendings.length === 0) {
    container.innerHTML = '<p class="empty-message">No spendings yet. Add one to get started!</p>';
    return;
  }

  container.innerHTML = appState.todayData.spendings
    .map(spending => `
      <div class="spending-item">
        <div class="spending-info">
          <span class="spending-icon">${getCategoryIcon(spending.category)}</span>
          <div class="spending-details">
            <p class="spending-category">${spending.category}</p>
            <p class="spending-description">${spending.description}</p>
            <p class="spending-time">${spending.time}</p>
          </div>
        </div>
        <div class="spending-actions">
          <span class="spending-amount">$${spending.amount.toFixed(2)}</span>
          <button class="btn-delete" onclick="handleDeleteSpending('${spending.id}')">🗑️</button>
        </div>
      </div>
    `)
    .join('');
}

function renderRecents() {
  const container = document.getElementById('recents-list');
  
  if (appState.recentsData.length === 0) {
    container.innerHTML = '<div class="card"><p class="empty-message">No spending history yet.</p></div>';
    return;
  }

  container.innerHTML = appState.recentsData
    .map(day => `
      <div class="card recents-card">
        <button class="recents-header" onclick="toggleRecentsCard(this)">
          <div class="recents-info">
            <p class="recents-date">${formatDate(day.date)}</p>
            <p class="recents-count">${day.spendings.length} transactions</p>
          </div>
          <div class="recents-total">
            <span class="recents-amount">$${day.total.toFixed(2)}</span>
            <span class="recents-toggle">▼</span>
          </div>
        </button>
        <div class="recents-content" style="display: none;">
          ${day.spendings
            .map(spending => `
              <div class="recents-item">
                <div class="recents-item-info">
                  <span class="recents-item-icon">${getCategoryIcon(spending.category)}</span>
                  <div class="recents-item-details">
                    <p class="recents-item-category">${spending.category}</p>
                    <p class="recents-item-description">${spending.description}</p>
                    <p class="recents-item-time">${spending.time}</p>
                  </div>
                </div>
                <span class="recents-item-amount">$${spending.amount.toFixed(2)}</span>
              </div>
            `)
            .join('')}
        </div>
      </div>
    `)
    .join('');

  // Add clear history button
  const clearBtnContainer = document.getElementById('clear-history-btn-container');
  clearBtnContainer.innerHTML = appState.recentsData.length > 0
    ? '<button class="btn btn-danger" onclick="handleClearHistory()">🗑️ Clear History</button>'
    : '';
}

function renderAnalytics() {
  // Update stats
  const totalSpent = (appState.todayData?.total || 0) + 
    appState.recentsData.reduce((sum, day) => sum + day.total, 0);
  const avgDaily = appState.recentsData.length > 0 
    ? appState.recentsData.reduce((sum, day) => sum + day.total, 0) / appState.recentsData.length 
    : 0;

  document.getElementById('total-spent').textContent = `$${totalSpent.toFixed(2)}`;
  document.getElementById('avg-daily').textContent = `$${avgDaily.toFixed(2)}`;

  // Render charts
  renderWeeklyChart();
  renderCategoryChart();
  renderTrendChart();
}

function renderWeeklyChart() {
  const ctx = document.getElementById('weekly-chart').getContext('2d');
  
  if (appState.charts.weekly) {
    appState.charts.weekly.destroy();
  }

  const weeklyStats = getWeeklyStats();
  const dates = Object.keys(weeklyStats).sort();
  const amounts = dates.map(date => weeklyStats[date]);

  appState.charts.weekly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Daily Spending',
        data: amounts,
        backgroundColor: 'rgba(0, 212, 255, 0.6)',
        borderColor: 'rgba(0, 212, 255, 1)',
        borderWidth: 2,
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: 'rgba(255, 255, 255, 0.8)' },
        },
      },
      scales: {
        y: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        x: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
    },
  });
}

function renderCategoryChart() {
  const ctx = document.getElementById('category-chart').getContext('2d');
  
  if (appState.charts.category) {
    appState.charts.category.destroy();
  }

  const categoryStats = getCategoryStats();
  const labels = Object.keys(categoryStats);
  const data = labels.map(cat => categoryStats[cat]);
  const colors = labels.map(cat => CATEGORIES[cat]?.color || '#808080');

  appState.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(cat => CATEGORIES[cat]?.name || cat),
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: 'rgba(255, 255, 255, 0.8)' },
        },
      },
    },
  });
}

function renderTrendChart() {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  
  if (appState.charts.trend) {
    appState.charts.trend.destroy();
  }

  const weeklyStats = getWeeklyStats();
  const dates = Object.keys(weeklyStats).sort();
  const amounts = dates.map(date => weeklyStats[date]);

  appState.charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Spending Trend',
        data: amounts,
        borderColor: 'rgba(166, 126, 255, 1)',
        backgroundColor: 'rgba(166, 126, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(166, 126, 255, 1)',
        pointBorderColor: 'rgba(255, 255, 255, 1)',
        pointBorderWidth: 2,
        pointRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: 'rgba(255, 255, 255, 0.8)' },
        },
      },
      scales: {
        y: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        x: {
          ticks: { color: 'rgba(255, 255, 255, 0.6)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
        },
      },
    },
  });
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleAddSpending(event) {
  event.preventDefault();

  const amount = document.getElementById('amount-input').value;
  const description = document.getElementById('description-input').value;
  const category = document.getElementById('category-input').value.trim();

  if (!amount || !description || !category) {
    alert('Please fill in all fields');
    return;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  addSpending(numAmount, description, category);

  // Generate and show tip
  const tip = generateTip(numAmount, category, appState.todayData.total);
  showTip(tip);

  // Reset form
  event.target.reset();

  // Update UI
  updateTodayTotal();
  renderSpendingsList();
}

function handleDeleteSpending(id) {
  deleteSpending(id);
  updateTodayTotal();
  renderSpendingsList();
}

function handleClearHistory() {
  if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    clearHistory();
    renderRecents();
  }
}

function generateTip(amount, category, currentTotal) {
  const categoryTips = TIPS[category] || TIPS.food;
  const randomTip = categoryTips[Math.floor(Math.random() * categoryTips.length)];

  if (currentTotal > 50) {
    return 'You\'re spending quite a bit today—maybe take a break!';
  }

  return randomTip;
}

function showTip(message) {
  const container = document.getElementById('tip-container');
  container.innerHTML = `
    <div class="tip-bubble">
      <span class="tip-icon">💡</span>
      <p class="tip-message">${message}</p>
    </div>
  `;

  setTimeout(() => {
    container.innerHTML = '';
  }, 4000);
}

function toggleRecentsCard(button) {
  const content = button.nextElementSibling;
  const toggle = button.querySelector('.recents-toggle');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    toggle.style.transform = 'rotate(0deg)';
  }
}

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show selected page
  document.getElementById(`${page}-page`).classList.add('active');
  
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  
  appState.currentPage = page;
  
  // Render page-specific content
  if (page === 'recents') {
    renderRecents();
  } else if (page === 'analytics') {
    renderAnalytics();
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeData();
  updateCurrentDate();
  updateTodayTotal();
  renderSpendingsList();
});
