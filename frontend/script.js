const form = document.getElementById('transaction-form');
const descInput = document.getElementById('desc');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const historyList = document.getElementById('history');
const incomeDisplay = document.getElementById('income');
const expenseDisplay = document.getElementById('expense');
const balanceDisplay = document.getElementById('balance');

let authToken = null;
let transactions = [];
let pieChart = null;

// Tab switching
document.getElementById('login-tab').addEventListener('click', () => {
  document.getElementById('login-tab').classList.add('active');
  document.getElementById('signup-tab').classList.remove('active');
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('signup-form').style.display = 'none';
});

document.getElementById('signup-tab').addEventListener('click', () => {
  document.getElementById('signup-tab').classList.add('active');
  document.getElementById('login-tab').classList.remove('active');
  document.getElementById('signup-form').style.display = 'block';
  document.getElementById('login-form').style.display = 'none';
});

// 🔐 Login handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      await initializeApp();
    } else {
      alert('Login failed: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

// Initialize app after login
async function initializeApp() {
  await loadTransactions();
  const hasSalary = transactions.some(tx => tx.desc === 'Monthly Salary');

  if (hasSalary) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app').style.display = 'block';
  } else {
    showSalaryModal();
  }
}

// 📝 Signup handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;

  try {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.message) {
      alert('Signup successful! Please login.');
      document.getElementById('signup-tab').click();
    } else {
      alert('Signup failed: ' + data.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

// 💰 Salary modal
function showSalaryModal() {
  const modal = document.createElement('div');
  modal.id = 'salary-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Welcome! Please enter your monthly salary</h3>
      <input type="number" id="salary-input" placeholder="Monthly Salary" required />
      <button id="salary-submit">Submit</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('salary-submit').addEventListener('click', async () => {
    const salary = parseFloat(document.getElementById('salary-input').value);
    if (isNaN(salary) || salary <= 0) {
      alert('Please enter a valid salary amount.');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          desc: 'Monthly Salary',
          amount: salary,
          type: 'credit'
        })
      });

      document.body.removeChild(modal);
      document.getElementById('app').style.display = 'block';
      await loadTransactions();
    } catch (err) {
      alert('Failed to save salary: ' + err.message);
    }
  });
}

// 📥 Load transactions from backend
async function loadTransactions() {
  try {
    const res = await fetch('http://localhost:5000/api/transactions', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    transactions = await res.json();
    updateUI();
  } catch (err) {
    console.error('Failed to load transactions:', err);
  }
}

// ➕ Add transaction
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;

  if (!desc || isNaN(amount) || amount <= 0) return;

  const transaction = { desc, amount, type };

  try {
    await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(transaction)
    });

    await loadTransactions();
    form.reset();
  } catch (err) {
    alert('Failed to add transaction: ' + err.message);
  }
});

// 🔁 Reset all transactions
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset all data?')) return;

  try {
    for (const tx of transactions) {
      await fetch(`http://localhost:5000/api/transactions/${tx._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
    }

    await loadTransactions();
    alert('All data has been reset.');
  } catch (err) {
    alert('Reset failed: ' + err.message);
  }
});

// 📊 Update UI and chart
function updateUI() {
  historyList.innerHTML = '';
  let income = 0, expense = 0;

  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.classList.add(tx.type);
    li.textContent = `${tx.desc} - ₹${tx.amount}`;
    historyList.appendChild(li);

    if (tx.type === 'credit') income += tx.amount;
    else expense += tx.amount;
  });

  incomeDisplay.textContent = income;
  expenseDisplay.textContent = expense;
  balanceDisplay.textContent = income - expense;

  updateChart(income, expense);
}

// 📈 Update pie chart
function updateChart(income, expense) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ₹${ctx.raw}`
          }
        }
      }
    }
  });
}

// 📁 Download CSV
document.getElementById('download').addEventListener('click', () => {
  let csv = 'Description,Amount,Type\n';
  transactions.forEach(tx => {
    csv += `${tx.desc},${tx.amount},${tx.type}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// 📧 Share via Email
document.getElementById('emailBtn').addEventListener('click', () => {
  let body = '💸 Transaction Summary:\n\n';
  transactions.forEach(tx => {
    body += `• ${tx.desc} - ₹${tx.amount} (${tx.type})\n`;
  });

  const subject = 'My Expense Tracker Summary';
  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
});

// 📱 Share via WhatsApp
document.getElementById('whatsappBtn').addEventListener('click', () => {
  let message = '💸 Transaction Summary:\n\n';
  transactions.forEach(tx => {
    message += `• ${tx.desc} - ₹${tx.amount} (${tx.type})\n`;
  });

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappLink, '_blank');
});