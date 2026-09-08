const API_BASE_URL = '';
const PYTHON_ENGINE_URL = 'http://127.0.0.1:5000';

async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const token = localStorage.getItem('nexora_token');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn("Unauthorized access. Token missing or expired.");
                localStorage.removeItem('nexora_token');
                localStorage.removeItem('nexora_session_role');
                localStorage.removeItem('nexora_session_name');
                window.location.href = 'index.html';
            }
            throw new Error(result.message || `Request failed (${response.status}).`);
        }
        return result;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

const fetchDashboardStats = async () => (await apiCall('/api/dashboard')).data || [];
const createNewTask = async (taskData) => await apiCall('/api/tasks', 'POST', taskData);
const markTaskCompleted = async (rowIndex) => await apiCall('/api/tasks/complete', 'PUT', { rowIndex });
const fetchEmployees = async () => (await apiCall('/api/employees')).data || [];
const updateQAStatus = async (rowIndex, status) => await apiCall('/api/tasks/qa', 'PUT', { rowIndex, qaStatus: status });
const fetchInventory = async () => (await apiCall('/api/inventory')).data || [];
const addInventoryItem = async (inventoryData) => await apiCall('/api/inventory', 'POST', inventoryData);
const fetchFinanceData = async () => (await apiCall('/api/finance')).data || [];
const addTransaction = async (txnData) => await apiCall('/api/finance', 'POST', txnData);
const registerEmployee = async (empData) => await apiCall('/api/employees', 'POST', empData);
const fetchSupplyLedger = async () => (await apiCall('/api/supply')).data || [];
const addSupplyEvent = async (payload) => await apiCall('/api/supply', 'POST', payload);

async function calculateTaxWithPython(income, expense) {
    try {
        const response = await fetch(`${PYTHON_ENGINE_URL}/api/calculate-tax`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ income, expense })
        });
        return await response.json();
    } catch (error) {
        return { success: false };
    }
}