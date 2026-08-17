if (localStorage.getItem('nexora_session_role') !== 'super_admin') {
    window.location.href = 'index.html';
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
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Failed to load data or sheet is empty.</td></tr>`;
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

        let statusStyle = '';
        let actionBtn = '<span style="color: #bdc3c7; font-size: 13px;">No Action Needed</span>';
        let isDelayed = false;

        if (status === 'Completed') {
            statusStyle = 'color: #16a34a; font-weight: 600; background: #dcfce7; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';
            actionBtn = '<span style="color: #94a3b8; font-size: 12px; font-weight: 500;"><span style="color:#10b981; margin-right:4px;">✓</span> Done</span>';
        } else if (status === 'Pending') {
            activeTasksCount++;
            statusStyle = 'color: #ea580c; font-weight: 600; background: #ffedd5; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';

            const taskDate = new Date(dateStr);
            if (taskDate < today) {
                delayedTasksCount++;
                isDelayed = true;

                statusStyle = 'color: #dc2626; font-weight: 600; background: #fee2e2; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';

                const message = encodeURIComponent(`⚠️ URGENT: Hello ${empName}, your assigned task "${taskDesc}" was due on ${dateStr} and is currently OVERDUE. Please update the status immediately.`);

                actionBtn = `<a href="https://wa.me/?text=${message}" target="_blank" style="color: #059669; background: #ecfdf5; border: 1px solid #34d399; padding: 6px 14px; font-size: 12px; text-decoration: none; border-radius: 6px; font-weight: 600; transition: all 0.2s; display: inline-block;">📲 Send Reminder</a>`;
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${empName}</strong></td>
            <td>${taskDesc}</td>
            <td style="${statusStyle}">${status}</td>
            <td>${dateStr}</td>
            <td>${actionBtn}</td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('activeTasksCount').textContent = activeTasksCount;
    const delayedElem = document.getElementById('delayedTasksCount');
    delayedElem.textContent = delayedTasksCount;

    const badge = document.getElementById('alertBadge');
    if (delayedTasksCount > 0 && badge) {
        badge.style.display = 'block';
        badge.textContent = delayedTasksCount;
    } else if (badge) {
        badge.style.display = 'none';
    }

    const alertBanner = document.getElementById('globalAlertBanner');
    if (delayedTasksCount > 0) {
        delayedElem.style.color = '#e74c3c';
        delayedElem.style.fontWeight = 'bold';
        if (alertBanner) alertBanner.style.display = 'block';
    } else {
        if (alertBanner) alertBanner.style.display = 'none';
    }

    if (window.workflowChartInstance) {
        window.workflowChartInstance.destroy();
    }
    const ctx = document.getElementById('workflowChart');
    if (ctx) {
        window.workflowChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Active Tasks', 'Completed Tasks', 'Delayed Tasks'],
                datasets: [{
                    label: 'Task Volume',
                    data: [activeTasksCount, sheetData.length - activeTasksCount, delayedTasksCount],
                    backgroundColor: [
                        'rgba(56, 189, 248, 0.4)', // Muted Blue
                        'rgba(52, 211, 153, 0.4)', // Muted Green
                        'rgba(248, 113, 113, 0.4)' // Muted Red
                    ],
                    borderColor: [
                        '#0284c7', // Solid Blue
                        '#059669', // Solid Green
                        '#dc2626'  // Solid Red
                    ],
                    borderWidth: 1.5,
                    borderRadius: 4,
                    barThickness: 45
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        ticks: { color: '#64748b', font: { size: 12, weight: 500 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

if (window.location.pathname.includes('dashboard.html')) {
    loadTableData();
}

if (window.location.pathname.includes('tasks.html')) {

    const taskForm = document.getElementById('taskForm');

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('submitTaskBtn');
            const feedback = document.getElementById('formFeedback');

            btn.textContent = "Assigning...";
            btn.disabled = true;

            const payload = {
                employee: document.getElementById('empName').value.trim(),
                task: document.getElementById('taskDesc').value.trim(),
                status: 'Pending',
                date: document.getElementById('dueDate').value
            };

            const result = await createNewTask(payload);

            if (result.success) {
                feedback.textContent = "✅ Task successfully assigned to Google Sheet!";
                feedback.style.color = "#2ecc71";
                taskForm.reset();
            } else {
                feedback.textContent = "❌ Failed to assign task.";
                feedback.style.color = "#e74c3c";
            }

            feedback.style.display = "block";
            btn.textContent = "Assign Task";
            btn.disabled = false;

            setTimeout(() => { feedback.style.display = "none"; }, 3000);
        });
    }

    async function loadManagementTable() {
        const tbody = document.getElementById('managementTableBody');
        if (!tbody) return;

        const data = await fetchDashboardStats();
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No tasks found.</td></tr>`;
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');

            let actionHtml = '';
            if (row[2] === 'Pending') {
                actionHtml = `<button onclick="completeTask(${index})" class="btn-primary" style="padding: 5px 10px; font-size: 12px; background-color: #2ecc71;">✔ Mark Done</button>`;
            } else {
                actionHtml = `<span style="color: #bdc3c7; font-size: 13px;">Completed</span>`;
            }

            tr.innerHTML = `
                <td><strong>${row[0] || 'N/A'}</strong></td>
                <td>${row[1] || 'N/A'}</td>
                <td>${row[3] || 'N/A'}</td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    loadManagementTable();

    window.completeTask = async function (index) {
        event.target.textContent = "Updating...";
        event.target.disabled = true;

        const result = await markTaskCompleted(index);
        if (result.success) {
            loadManagementTable();
        } else {
            alert("Failed to update task.");
            event.target.textContent = "✔ Mark Done";
            event.target.disabled = false;
        }
    };
}