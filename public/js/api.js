// Relative path ensures the app works seamlessly on local network or cloud host
const API_BASE_URL = '';
// Python microservice (Requires CORS configuration on the Python server for production)
const PYTHON_ENGINE_URL = 'http://127.0.0.1:5000';

// Centralized API handler to eliminate repetitive fetch/catch blocks
async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        return { success: false, data: [] };
    }
}

const fetchDashboardStats = async () => (await apiCall('/api/dashboard')).data || [];
const createNewTask = async (taskData) => await apiCall('/api/tasks', 'POST', taskData);
const markTaskCompleted = async (rowIndex) => await apiCall('/api/tasks/complete', 'PUT', { rowIndex });
const fetchEmployees = async () => (await apiCall('/api/employees')).data || [];
const updateQAStatus = async (rowIndex, status) => await apiCall('/api/tasks/qa', 'PUT', { rowIndex, qaStatus: status });
const fetchInventory = async () => (await apiCall('/api/inventory')).data || [];
const fetchFinanceData = async () => (await apiCall('/api/finance')).data || [];
const addTransaction = async (txnData) => await apiCall('/api/finance', 'POST', txnData);
const registerEmployee = async (empData) => await apiCall('/api/employees', 'POST', empData);
const fetchSupplyLedger = async () => (await apiCall('/api/supply')).data || [];
const addSupplyEvent = async (payload) => await apiCall('/api/supply', 'POST', payload);

// Python Microservice Connector
async function calculateTaxWithPython(income, expense) {
    try {
        const response = await fetch(`${PYTHON_ENGINE_URL}/api/calculate-tax`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ income, expense })
        });
        return await response.json();
    } catch (error) {
        console.warn("Python Engine Offline/Skipped.");
        return { success: false };
    }
}