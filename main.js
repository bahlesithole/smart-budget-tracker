// --- Data Model & Persistence ---
const STORAGE_KEY = 'smartBudgetTrackerData';
const DEFAULT_CURRENCY = 'USD';
const currencySymbols = {
	'USD': '$',
	'ZAR': 'R',
	'EUR': '€'
};

function getInitialData() {
	return {
		currency: DEFAULT_CURRENCY,
		reminders: [],
		transactions: [],
		budgetGoals: [],
		savingsGoals: []
	};
}

function loadData() {
	const data = localStorage.getItem(STORAGE_KEY);
	return data ? JSON.parse(data) : getInitialData();
}

function saveData(data) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let appData = loadData();

// --- Utility Functions ---
function formatAmount(amount) {
	const symbol = currencySymbols[appData.currency] || '$';
	return symbol + parseFloat(amount).toFixed(2);
}

function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

// --- Currency Switcher ---
const currencySelect = document.getElementById('currency-select');
currencySelect.value = appData.currency;
currencySelect.addEventListener('change', e => {
	appData.currency = e.target.value;
	saveData(appData);
	renderAll();
});

// --- Bill Reminders ---
const remindersList = document.getElementById('reminders-list');
const addReminderBtn = document.getElementById('add-reminder-btn');
const reminderForm = document.getElementById('reminder-form');
const reminderDesc = document.getElementById('reminder-desc');
const reminderDate = document.getElementById('reminder-date');
const reminderCancel = document.getElementById('reminder-cancel');

addReminderBtn.addEventListener('click', () => {
	reminderForm.style.display = 'flex';
	addReminderBtn.style.display = 'none';
	reminderDesc.value = '';
	reminderDate.value = todayStr();
	reminderDesc.focus();
});

reminderCancel.addEventListener('click', () => {
	reminderForm.style.display = 'none';
	addReminderBtn.style.display = '';
});

reminderForm.addEventListener('submit', e => {
	e.preventDefault();
	const desc = reminderDesc.value.trim();
	const dueDate = reminderDate.value;
	if (!desc || !dueDate || isNaN(Date.parse(dueDate))) return;
	appData.reminders.push({ id: Date.now(), desc, dueDate });
	saveData(appData);
	renderReminders();
	reminderForm.style.display = 'none';
	addReminderBtn.style.display = '';
});

function renderReminders() {
	remindersList.innerHTML = '';
	if (appData.reminders.length === 0) {
		remindersList.innerHTML = '<div style="color:#4a5568;">No bill reminders yet</div>';
		return;
	}
	appData.reminders.forEach(rem => {
		const div = document.createElement('div');
		div.className = 'reminder-item';
		div.innerHTML = `<span>📝 ${rem.desc} <span style='color:#6c63ff;'>(${rem.dueDate})</span></span> <button class='delete-btn' title='Delete'>&times;</button>`;
		div.querySelector('.delete-btn').onclick = () => {
			appData.reminders = appData.reminders.filter(r => r.id !== rem.id);
			saveData(appData);
			renderReminders();
		};
		remindersList.appendChild(div);
	});
}

// --- Transactions ---
const transactionForm = document.getElementById('transaction-form');
const transactionTableBody = document.getElementById('transaction-table-body');
let currentFilter = 'all';
let editTransactionId = null;

transactionForm.date.value = todayStr();

transactionForm.addEventListener('submit', e => {
	e.preventDefault();
	const desc = transactionForm.description.value.trim();
	const amount = parseFloat(transactionForm.amount.value);
	const type = transactionForm.type.value;
	const category = transactionForm.category.value;
	const date = transactionForm.date.value;
	if (!desc || isNaN(amount) || amount <= 0 || !date) return;
	if (editTransactionId) {
		// Edit mode: update existing transaction
		const tx = appData.transactions.find(t => t.id === editTransactionId);
		if (tx) {
			tx.desc = desc;
			tx.amount = amount;
			tx.type = type;
			tx.category = category;
			tx.date = date;
		}
		editTransactionId = null;
	} else {
		// Add mode: add new transaction
		appData.transactions.push({
			id: Date.now(), desc, amount, type, category, date
		});
	}
	saveData(appData);
	transactionForm.reset();
	transactionForm.date.value = todayStr();
	// Restore button text if it was changed
	transactionForm.querySelector('button[type="submit"]').textContent = '+ Add Transaction';
	renderTransactions();
	renderSummary();
	renderMonthlySummary();
	renderSpendingTrends();
});

function renderTransactions() {
	let filtered = appData.transactions;
	if (currentFilter === 'income') filtered = filtered.filter(t => t.type === 'income');
	else if (currentFilter === 'expense') filtered = filtered.filter(t => t.type === 'expense');
	else if (['Food','Shopping','Transportation','Entertainment'].includes(currentFilter)) filtered = filtered.filter(t => t.category === currentFilter);
	transactionTableBody.innerHTML = '';
	if (filtered.length === 0) {
		transactionTableBody.innerHTML = `<tr class='no-transactions'><td colspan='6' style='text-align:center;'><div class='no-transactions-icon'>🧾</div><div>No transactions yet</div></td></tr>`;
		return;
	}
	filtered.forEach(t => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${t.desc}</td>
			<td>${t.category}</td>
			<td>${t.date}</td>
			<td>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
			<td>${formatAmount(t.amount)}</td>
			<td>
								<button class='edit-btn' title='Edit' style="margin-right:6px; background:#e2e8f0; color:#232b3b; border:none; border-radius:5px; padding:4px 10px; cursor:pointer; font-size:1rem;">✎</button>
								<button class='delete-btn' title='Delete' style="background:#e2e8f0; color:#232b3b; border:none; border-radius:5px; padding:4px 10px; cursor:pointer; font-size:1rem; display:inline-flex; align-items:center; justify-content:center; height:28px; width:28px;">
									<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
										<rect x="5" y="7" width="10" height="8" rx="2" fill="#232b3b"/>
										<rect x="8.2" y="9.2" width="1.2" height="4.2" rx="0.6" fill="#fff"/>
										<rect x="10.6" y="9.2" width="1.2" height="4.2" rx="0.6" fill="#fff"/>
										<rect x="7" y="4" width="6" height="2.2" rx="1.1" fill="#232b3b"/>
										<rect x="8" y="2.5" width="4" height="1.2" rx="0.6" fill="#232b3b"/>
									</svg>
								</button>
			</td>
		`;
		tr.querySelector('.delete-btn').onclick = () => {
			appData.transactions = appData.transactions.filter(tx => tx.id !== t.id);
			saveData(appData);
			renderTransactions();
			renderSummary();
			renderMonthlySummary();
			renderSpendingTrends();
		};
		tr.querySelector('.edit-btn').onclick = () => {
			// Fill form with transaction data
			transactionForm.description.value = t.desc;
			transactionForm.amount.value = t.amount;
			transactionForm.type.value = t.type;
			transactionForm.category.value = t.category;
			transactionForm.date.value = t.date;
			editTransactionId = t.id;
			// Change button text to indicate edit mode
			transactionForm.querySelector('button[type="submit"]').textContent = 'Save Changes';
			transactionForm.description.focus();
		};
		transactionTableBody.appendChild(tr);
	});
}

document.querySelectorAll('.filter-btn').forEach(btn => {
	btn.onclick = () => {
		document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		currentFilter = btn.dataset.filter;
		renderTransactions();
	};
});

// --- Summary Cards ---
function renderSummary() {
	const income = appData.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
	const expenses = appData.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
	document.getElementById('total-income').textContent = formatAmount(income);
	document.getElementById('total-expenses').textContent = formatAmount(expenses);
	document.getElementById('current-balance').textContent = formatAmount(income - expenses);
}

// --- Budget Goals ---
const budgetGoalsList = document.getElementById('budget-goals-list');
const addBudgetGoalBtn = document.getElementById('add-budget-goal-btn');
const budgetGoalForm = document.getElementById('budget-goal-form');
const budgetGoalName = document.getElementById('budget-goal-name');
const budgetGoalTarget = document.getElementById('budget-goal-target');
const budgetGoalCancel = document.getElementById('budget-goal-cancel');

addBudgetGoalBtn.addEventListener('click', () => {
	budgetGoalForm.style.display = 'flex';
	addBudgetGoalBtn.style.display = 'none';
	budgetGoalName.value = '';
	budgetGoalTarget.value = '';
	budgetGoalName.focus();
});

budgetGoalCancel.addEventListener('click', () => {
	budgetGoalForm.style.display = 'none';
	addBudgetGoalBtn.style.display = '';
});

budgetGoalForm.addEventListener('submit', e => {
	e.preventDefault();
	const name = budgetGoalName.value.trim();
	const target = parseFloat(budgetGoalTarget.value);
	if (!name || isNaN(target) || target <= 0) return;
	appData.budgetGoals.push({ id: Date.now(), name, target });
	saveData(appData);
	renderBudgetGoals();
	budgetGoalForm.style.display = 'none';
	addBudgetGoalBtn.style.display = '';
});

function renderBudgetGoals() {
	budgetGoalsList.innerHTML = '';
	if (appData.budgetGoals.length === 0) {
		budgetGoalsList.innerHTML = '<div style="color:#4a5568;">No budget goals yet</div>';
		return;
	}
	appData.budgetGoals.forEach(goal => {
		const div = document.createElement('div');
		div.className = 'goal-item';
		div.innerHTML = `<span>🎯 ${goal.name} <span style='color:#2ec4b6;'>(Target: ${formatAmount(goal.target)})</span></span> <button class='delete-btn' title='Delete'>&times;</button>`;
		div.querySelector('.delete-btn').onclick = () => {
			appData.budgetGoals = appData.budgetGoals.filter(g => g.id !== goal.id);
			saveData(appData);
			renderBudgetGoals();
		};
		budgetGoalsList.appendChild(div);
	});
}

// --- Savings Goals ---
const savingsGoalsList = document.getElementById('savings-goals-list');
const addSavingsGoalBtn = document.getElementById('add-savings-goal-btn');
const savingsGoalForm = document.getElementById('savings-goal-form');
const savingsGoalName = document.getElementById('savings-goal-name');
const savingsGoalTarget = document.getElementById('savings-goal-target');
const savingsGoalCancel = document.getElementById('savings-goal-cancel');

addSavingsGoalBtn.addEventListener('click', () => {
	savingsGoalForm.style.display = 'flex';
	addSavingsGoalBtn.style.display = 'none';
	savingsGoalName.value = '';
	savingsGoalTarget.value = '';
	savingsGoalName.focus();
});

savingsGoalCancel.addEventListener('click', () => {
	savingsGoalForm.style.display = 'none';
	addSavingsGoalBtn.style.display = '';
});

savingsGoalForm.addEventListener('submit', e => {
	e.preventDefault();
	const name = savingsGoalName.value.trim();
	const target = parseFloat(savingsGoalTarget.value);
	if (!name || isNaN(target) || target <= 0) return;
	appData.savingsGoals.push({ id: Date.now(), name, target });
	saveData(appData);
	renderSavingsGoals();
	savingsGoalForm.style.display = 'none';
	addSavingsGoalBtn.style.display = '';
});

function renderSavingsGoals() {
	savingsGoalsList.innerHTML = '';
	if (appData.savingsGoals.length === 0) {
		savingsGoalsList.innerHTML = '<div style="color:#4a5568;">No savings goals yet</div>';
		return;
	}
	appData.savingsGoals.forEach(goal => {
		const div = document.createElement('div');
		div.className = 'goal-item';
		div.innerHTML = `<span>🐷 ${goal.name} <span style='color:#6c63ff;'>(Target: ${formatAmount(goal.target)})</span></span> <button class='delete-btn' title='Delete'>&times;</button>`;
		div.querySelector('.delete-btn').onclick = () => {
			appData.savingsGoals = appData.savingsGoals.filter(g => g.id !== goal.id);
			saveData(appData);
			renderSavingsGoals();
		};
		savingsGoalsList.appendChild(div);
	});
}

// --- Spending Trends (Pie Chart + Legend) ---
function renderSpendingTrends() {
	const chartDiv = document.getElementById('spending-trends-chart');
	chartDiv.innerHTML = '';
	const categories = [
		{ name: 'Food', color: '#6c63ff' },
		{ name: 'Shopping', color: '#2ec4b6' },
		{ name: 'Transportation', color: '#ffb703' },
		{ name: 'Entertainment', color: '#ff5e5b' },
		{ name: 'Other', color: '#b0b6c1' }
	];
	const data = {};
	categories.forEach(cat => data[cat.name] = 0);
	// Map dropdown categories to pie chart categories
	const categoryMap = {
		'Food': 'Food',
		'Food & Dining': 'Food',
		'Shopping': 'Shopping',
		'Transportation': 'Transportation',
		'Entertainment': 'Entertainment',
		'Utilities': 'Other',
		'Healthcare': 'Other',
		'Other': 'Other',
		'Salary': 'Other',
		'Freelance': 'Other',
		'Investment': 'Other'
	};
	appData.transactions.filter(t => t.type === 'expense').forEach(t => {
		const mapped = categoryMap[t.category] || 'Other';
		data[mapped] += t.amount;
	});
	const values = categories.map(cat => data[cat.name]);
	const total = values.reduce((a, b) => a + b, 0);
	// Pie chart SVG
	const size = 180, radius = 80, cx = size/2, cy = size/2;
	let startAngle = 0;
	let paths = '';
	categories.forEach((cat, i) => {
		const value = data[cat.name];
		const angle = total === 0 ? 0 : (value / total) * 360;
		const endAngle = startAngle + angle;
		const largeArc = angle > 180 ? 1 : 0;
		const x1 = cx + radius * Math.cos((Math.PI/180) * (startAngle-90));
		const y1 = cy + radius * Math.sin((Math.PI/180) * (startAngle-90));
		const x2 = cx + radius * Math.cos((Math.PI/180) * (endAngle-90));
		const y2 = cy + radius * Math.sin((Math.PI/180) * (endAngle-90));
		if (value > 0 || total === 0) {
			paths += `<path d="M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${cat.color}" />`;
		}
		startAngle = endAngle;
	});
	if (total === 0) {
		// Show a full gray circle if no data
		paths = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#e2e8f0" />`;
	}
	const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
	// Legend
	const legend = document.createElement('div');
	legend.className = 'pie-legend';
	legend.innerHTML = categories.map(cat =>
		`<div class="pie-legend-item"><span class="pie-legend-color" style="background:${cat.color}"></span>${cat.name}</div>`
	).join('');
	// Layout
	const pieWrapper = document.createElement('div');
	pieWrapper.className = 'pie-chart-wrapper';
	pieWrapper.innerHTML = svg;
	chartDiv.appendChild(pieWrapper);
	chartDiv.appendChild(legend);
}

// --- Monthly Summary ---
function renderMonthlySummary() {
	const now = new Date();
	const monthStr = now.toISOString().slice(0,7);
	const monthTx = appData.transactions.filter(t => t.date.startsWith(monthStr));
	const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
	const expenses = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
	document.getElementById('monthly-income').textContent = formatAmount(income);
	document.getElementById('monthly-expenses').textContent = formatAmount(expenses);
}

// --- Initial Render ---
function renderAll() {
	renderReminders();
	renderTransactions();
	renderSummary();
	renderBudgetGoals();
	renderSavingsGoals();
	renderSpendingTrends();
	renderMonthlySummary();
}

renderAll();
