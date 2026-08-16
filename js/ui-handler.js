if (localStorage.getItem('nexora_session_role') !== 'super_admin') {
    window.location.href = 'index.html'; // Kick out unauthorized users
}

document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('nexora_session_role');
    localStorage.removeItem('nexora_session_id');
    window.location.href = 'index.html';
});

async function loadTableData() {
    const tableBody = document.getElementById('recentTasksTable');
    const sheetData = await fetchDashboardStats();

    if (!sheetData || sheetData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: red;">Failed to load data or sheet is empty.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    let activeTasksCount = 0;
    let delayedTasksCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sheetData.forEach((row) => {
        const empName = row[0] || 'N/A';
        const taskDesc = row[1] || 'N/A';
        const status = row[2] || 'N/A';
        const dateStr = row[3] || 'N/A';

        if (status === 'Pending') {
            activeTasksCount++;

            const taskDate = new Date(dateStr);
            if (taskDate < today) {
                delayedTasksCount++;
            }
        }

        const tr = document.createElement('tr');
        let statusStyle = '';

        if (status === 'Completed') {
            statusStyle = 'color: #2ecc71; font-weight: bold;';
        } else if (status === 'Pending') {
            statusStyle = 'color: #e74c3c; font-weight: bold;';
        }

        tr.innerHTML = `
            <td><strong>${empName}</strong></td>
            <td>${taskDesc}</td>
            <td style="${statusStyle}">${status}</td>
            <td>${dateStr}</td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('activeTasksCount').textContent = activeTasksCount;

    const delayedElem = document.getElementById('delayedTasksCount');
    delayedElem.textContent = delayedTasksCount;
    if (delayedTasksCount > 0) {
        delayedElem.style.color = '#e74c3c';
        delayedElem.style.fontWeight = 'bold';
    }
}

if (window.location.pathname.includes('dashboard.html')) {
    loadTableData();
}