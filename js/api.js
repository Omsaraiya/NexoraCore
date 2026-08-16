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