const API_BASE_URL = 'http://localhost:3000';

async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard-stats`);

        if (!response.ok) throw new Error('Network response was not ok');

        const result = await response.json();
        return result.data;

    } catch (error) {
        console.error("API Fetch Error:", error);
        return null;
    }
}


async function createNewTask(taskData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        return await response.json();
    } catch (error) {
        console.error("API Post Error:", error);
        return { success: false, error: "Network failed" };
    }
}

async function markTaskCompleted(rowIndex) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowIndex: rowIndex })
        });
        return await response.json();
    } catch (error) {
        console.error("API Update Error:", error);
        return { success: false };
    }
}

async function fetchEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/employees`);
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error("Failed to fetch employees:", error);
        return [];
    }
}