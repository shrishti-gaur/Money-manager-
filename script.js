// script.js
// Constant for local storage key to ensure consistency
const DB_KEY = 'moneyManager_transactions';

/**
 * Represents a single financial transaction.
 * This class encapsulates the data for a transaction.
 */
class Transaction {
    /**
     * @param {number} id - Unique identifier for the transaction.
     * @param {number|string} amount - The amount of the transaction.
     * @param {string} date - The date of the transaction (YYYY-MM-DD format).
     * @param {string} category - The transaction category ('income' or 'expense').
     * @param {string} subCategory - The specific sub-category.
     * @param {string} description - A short description of the transaction.
     */
    constructor(id, amount, date, category, subCategory, description) {
        this.id = id;
        this.amount = parseFloat(amount);
        this.date = date;
        this.category = category;
        this.subCategory = subCategory;
        this.description = description.trim();
    }
}

/**
 * The main application class.
 * This class handles all application logic, including data management,
 * UI manipulation, and event handling.
 */
class MoneyManager {
    constructor() {
        this.transactions = [];
        this.nextId = 1;
        this.setupEventListeners();
        this.loadInitialData();
    }

    /**
     * Asynchronously loads transactions from local storage and initializes the app state.
     */
    async loadInitialData() {
        try {
            // Retrieve stored data from localForage, a robust local storage library
            const storedTransactions = await localforage.getItem(DB_KEY);
            if (storedTransactions) {
                // Rehydrate the data into Transaction objects to restore class functionality
                this.transactions = storedTransactions.map(t => new Transaction(t.id, t.amount, t.date, t.category, t.subCategory, t.description));
                // Set the nextId based on the highest existing ID to avoid conflicts
                this.nextId = this.transactions.length > 0 ? Math.max(...this.transactions.map(t => t.id)) + 1 : 1;
            }
        } catch (error) {
            console.error("Failed to load data from local storage:", error);
        }
        // Always render the UI and update the summary after loading is complete
        this.renderTransactions();
        this.updateSummary();
    }

    /**
     * Saves the current transactions array to local storage.
     * This is an asynchronous operation.
     */
    async saveTransactions() {
        try {
            await localforage.setItem(DB_KEY, this.transactions);
        } catch (error) {
            console.error("Failed to save data to local storage:", error);
        }
    }

    /**
     * Adds a new transaction to the manager.
     * @param {Object} formData - The data from the transaction form.
     */
    addTransaction(formData) {
        // Create a new Transaction object with a unique ID
        const newTransaction = new Transaction(
            this.nextId++,
            formData.amount,
            formData.date,
            formData.category,
            formData.subCategory,
            formData.description
        );
        this.transactions.push(newTransaction);
        this.saveTransactions();
        this.renderTransactions();
        this.updateSummary();
    }

    /**
     * Updates an existing transaction.
     * @param {number} id - The ID of the transaction to update.
     * @param {Object} updatedData - The new data for the transaction.
     */
    updateTransaction(id, updatedData) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index > -1) {
            this.transactions[index] = new Transaction(
                id,
                updatedData.amount,
                updatedData.date,
                updatedData.category,
                updatedData.subCategory,
                updatedData.description
            );
            this.saveTransactions();
            this.renderTransactions();
            this.updateSummary();
        }
    }

    /**
     * Deletes a transaction by ID after user confirmation.
     * @param {number} id - The ID of the transaction to delete.
     */
    deleteTransaction(id) {
        // Note: A custom modal UI would be used in a production environment
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.renderTransactions();
            this.updateSummary();
        }
    }

    /**
     * Renders the transactions to the table, applying filters and sorting.
     */
    renderTransactions() {
        const tableBody = document.getElementById('transaction-table-body');
        tableBody.innerHTML = ''; // Clear existing table rows
        
        // Get filter and sort values from the UI
        const categoryFilter = document.getElementById('category-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const sortOption = document.getElementById('sort-option').value;
        
        let filteredAndSorted = [...this.transactions];
        
        // Apply Filters based on user selection
        if (categoryFilter !== 'all') {
            filteredAndSorted = filteredAndSorted.filter(t => t.category === categoryFilter);
        }
        if (dateFilter) {
            filteredAndSorted = filteredAndSorted.filter(t => t.date === dateFilter);
        }
        
        // Apply Sorting based on user selection
        filteredAndSorted.sort((a, b) => {
            switch (sortOption) {
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'amount-asc':
                    return a.amount - b.amount;
                case 'amount-desc':
                    return b.amount - a.amount;
                default:
                    return 0; // No sorting if option is not recognized
            }
        });
        
        if (filteredAndSorted.length === 0) {
            // Display a message if no transactions are found
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No transactions to display.</td></tr>`;
            return;
        }

        // Generate and append a table row for each transaction
        filteredAndSorted.forEach(transaction => {
            const row = tableBody.insertRow();
            row.dataset.id = transaction.id; // Store ID on the row for easy access
            const amountClass = transaction.category === 'income' ? 'income' : 'expense';
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.category}</td>
                <td>${transaction.subCategory}</td>
                <td>${transaction.description || '-'}</td>
                <td class="transaction-amount ${amountClass}">₹${transaction.amount.toFixed(2)}</td>
                <td class="action-buttons">
                    <button class="btn secondary edit-btn" data-id="${transaction.id}">Edit</button>
                    <button class="btn danger delete-btn" data-id="${transaction.id}">Delete</button>
                </td>
            `;
        });
    }

    /**
     * Updates the financial summary cards.
     */
    updateSummary() {
        const totalIncome = this.transactions
            .filter(t => t.category === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = this.transactions
            .filter(t => t.category === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netBalance = totalIncome - totalExpenses;

        document.getElementById('total-income').textContent = `₹${totalIncome.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `₹${totalExpenses.toFixed(2)}`;
        document.getElementById('net-balance').textContent = `₹${netBalance.toFixed(2)}`;
    }

    /**
     * Validates the transaction form data.
     * @param {Object} formData - The data from the form fields.
     * @returns {boolean} - True if the form is valid, false otherwise.
     */
    validateForm(formData) {
        let isValid = true;
        this.clearFormErrors();

        const amountInput = document.getElementById('amount');
        if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
            this.showError('amount-error', 'Please enter a positive numeric amount.');
            amountInput.classList.add('invalid');
            isValid = false;
        }

        const dateInput = document.getElementById('date');
        const transactionDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (!formData.date || transactionDate > today) {
            this.showError('date-error', 'Date cannot be in the future.');
            dateInput.classList.add('invalid');
            isValid = false;
        }
        
        if (!formData.category) {
            this.showError('category-error', 'Please select a category.');
            isValid = false;
        }
        
        const subCategorySelect = document.getElementById('sub-category');
        if (!formData.subCategory) {
            this.showError('sub-category-error', 'Please select a sub-category.');
            subCategorySelect.classList.add('invalid');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Displays a validation error message.
     * @param {string} elementId - The ID of the element to show the error in.
     * @param {string} message - The error message text.
     */
    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }
    
    /**
     * Clears all validation error messages and invalid classes.
     */
    clearFormErrors() {
        document.querySelectorAll('.error').forEach(el => el.textContent = '');
        document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    }

    /**
     * Populates the sub-category dropdown based on the selected category type.
     * @param {string} category - The selected category ('income' or 'expense').
     * @param {string} selectedSubCat - The value of the sub-category to pre-select.
     */
    populateSubCategories(category, selectedSubCat = '') {
        const subCategorySelect = document.getElementById('sub-category');
        subCategorySelect.innerHTML = '<option value="">Select a sub-category</option>';
        
        let options = [];
        if (category === 'income') {
            options = ['Salary', 'Bonus', 'Investment', 'Gift', 'Other'];
        } else if (category === 'expense') {
            options = ['Rent', 'Groceries', 'Utilities', 'Shopping', 'Entertainment', 'Transportation', 'Other'];
        }
        
        options.forEach(optText => {
            const option = document.createElement('option');
            option.value = optText.toLowerCase().replace(/\s/g, '');
            option.textContent = optText;
            if (option.value === selectedSubCat) {
                option.selected = true;
            }
            subCategorySelect.appendChild(option);
        });
    }

    /**
     * Shows the transaction modal, populating it with data if editing.
     * @param {Transaction | null} transaction - The transaction object to edit, or null to add.
     */
    showModal(transaction = null) {
        const modal = document.getElementById('transaction-modal');
        const form = document.getElementById('transaction-form');
        const modalTitle = document.getElementById('modal-title');
        const transactionIdField = document.getElementById('transaction-id');
        
        this.clearFormErrors();
        form.reset();
        
        if (transaction) {
            modalTitle.textContent = 'Edit Transaction';
            transactionIdField.value = transaction.id;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('date').value = transaction.date;
            document.getElementById('description').value = transaction.description;
            if (transaction.category === 'income') {
                document.getElementById('radio-income').checked = true;
            } else {
                document.getElementById('radio-expense').checked = true;
            }
            this.populateSubCategories(transaction.category, transaction.subCategory);
        } else {
            modalTitle.textContent = 'Add Transaction';
            transactionIdField.value = '';
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            this.populateSubCategories('');
        }
        
        modal.style.display = 'flex';
    }

    /**
     * Hides the transaction modal.
     */
    hideModal() {
        document.getElementById('transaction-modal').style.display = 'none';
        this.clearFormErrors();
    }

    /**
     * Binds all necessary event listeners for the application.
     */
    setupEventListeners() {
        // Event listener for the main "Add New Transaction" button
        document.getElementById('add-transaction-btn').addEventListener('click', () => this.showModal());

        // Event listeners for closing the modal
        document.querySelector('.close-btn').addEventListener('click', () => this.hideModal());
        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('transaction-modal')) {
                this.hideModal();
            }
        });

        // Event listener for the form submission
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('transaction-id').value,
                amount: document.getElementById('amount').value,
                date: document.getElementById('date').value,
                category: document.querySelector('input[name="type"]:checked')?.value,
                subCategory: document.getElementById('sub-category').value,
                description: document.getElementById('description').value
            };
            
            if (this.validateForm(formData)) {
                if (formData.id) {
                    // Update existing transaction if ID is present
                    this.updateTransaction(parseInt(formData.id), formData);
                } else {
                    // Add a new transaction if no ID is present
                    this.addTransaction(formData);
                }
                this.hideModal();
            }
        });

        // Event delegation for the edit and delete buttons on the transaction table
        document.getElementById('transaction-table-body').addEventListener('click', (e) => {
            const target = e.target;
            const transactionId = parseInt(target.dataset.id);
            if (target.classList.contains('edit-btn')) {
                const transactionToEdit = this.transactions.find(t => t.id === transactionId);
                this.showModal(transactionToEdit);
            } else if (target.classList.contains('delete-btn')) {
                this.deleteTransaction(transactionId);
            }
        });

        // Event listeners for filter and sort controls to trigger re-rendering
        document.getElementById('category-filter').addEventListener('change', () => this.renderTransactions());
        document.getElementById('date-filter').addEventListener('change', () => this.renderTransactions());
        document.getElementById('sort-option').addEventListener('change', () => this.renderTransactions());
        
        // Event listeners for dynamic sub-category population based on category selection
        document.getElementById('radio-income').addEventListener('change', (e) => this.populateSubCategories(e.target.value));
        document.getElementById('radio-expense').addEventListener('change', (e) => this.populateSubCategories(e.target.value));
    }
}

// Instantiate the app when the DOM is fully loaded to start the application
document.addEventListener('DOMContentLoaded', () => {
    new MoneyManager();
});
