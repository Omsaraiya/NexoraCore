const API_BASE_URL = 'http://localhost:3000';

async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) { return []; }
}

async function createNewTask(taskData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData)
        });
        return await response.json();
    } catch (error) { return { success: false }; }
}

async function markTaskCompleted(rowIndex) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/complete`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowIndex })
        });
        return await response.json();
    } catch (error) { return { success: false }; }
}

async function fetchEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) { return []; }
}

async function updateQAStatus(rowIndex, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/qa`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowIndex: rowIndex, qaStatus: status })
        });
        return await response.json();
    } catch (error) { return { success: false }; }
}

async function fetchInventory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/inventory`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Inventory Fetch Error:", error);
        return [];
    }
}