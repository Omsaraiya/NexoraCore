const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('nexora_session_role');
        window.location.href = 'index.html';
    });
}

async function loadTableData() {
    const tableBody = document.getElementById('recentTasksTable');
    if (!tableBody) return;

    const sheetData = await fetchDashboardStats();
    if (!sheetData || sheetData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Failed to load data.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    let activeTasksCount = 0, delayedTasksCount = 0, passCount = 0, failCount = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    sheetData.forEach((row) => {
        const empName = row[0] || 'N/A', taskDesc = row[1] || 'N/A', status = row[2] || 'N/A', dateStr = row[3] || 'N/A', qaStatus = row[5] || '';
        let statusStyle = '', actionBtn = '<span style="color: #bdc3c7; font-size: 13px;">No Action Needed</span>';

        if (qaStatus === 'Pass') passCount++;
        if (qaStatus === 'Fail') failCount++;

        if (status === 'Completed') {
            statusStyle = 'color: #16a34a; font-weight: 600; background: #dcfce7; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';
            if (qaStatus === 'Pass') actionBtn = '<span style="color: #16a34a; font-size: 12px; font-weight: 600;">QA Passed ✔</span>';
            else if (qaStatus === 'Fail') actionBtn = '<span style="color: #dc2626; font-size: 12px; font-weight: 600;">QA Failed ✖</span>';
            else actionBtn = '<span style="color: #ca8a04; font-size: 12px; font-weight: 500;">Pending QA Check</span>';
        } else if (status === 'Pending') {
            activeTasksCount++;
            statusStyle = 'color: #ea580c; font-weight: 600; background: #ffedd5; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';
            const taskDate = new Date(dateStr);
            if (taskDate < today) {
                delayedTasksCount++;
                statusStyle = 'color: #dc2626; font-weight: 600; background: #fee2e2; padding: 4px 10px; border-radius: 12px; font-size: 12px; display: inline-block;';
                const message = encodeURIComponent(`⚠️ URGENT: Hello ${empName}, your task "${taskDesc}" is OVERDUE.`);
                actionBtn = `<a href="https://wa.me/?text=${message}" target="_blank" style="color: #059669; background: #ecfdf5; border: 1px solid #34d399; padding: 6px 14px; font-size: 12px; text-decoration: none; border-radius: 6px; font-weight: 600;">📲 Reminder</a>`;
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${empName}</strong></td><td>${taskDesc}</td><td style="${statusStyle}">${status}</td><td>${dateStr}</td><td>${actionBtn}</td>`;
        tableBody.appendChild(tr);
    });

    document.getElementById('activeTasksCount').textContent = activeTasksCount;
    document.getElementById('delayedTasksCount').textContent = delayedTasksCount;
    if (document.getElementById('passCount')) document.getElementById('passCount').textContent = passCount;
    if (document.getElementById('failCount')) document.getElementById('failCount').textContent = failCount;

    const badge = document.getElementById('alertBadge');
    if (badge) badge.style.display = delayedTasksCount > 0 ? 'block' : 'none';
    if (badge) badge.textContent = delayedTasksCount;

    const ctx = document.getElementById('workflowChart');
    if (ctx) {
        if (window.workflowChartInstance) window.workflowChartInstance.destroy();
        window.workflowChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Active', 'Completed', 'Delayed'],
                datasets: [{
                    label: 'Volume', data: [activeTasksCount, sheetData.length - activeTasksCount, delayedTasksCount],
                    backgroundColor: ['rgba(56, 189, 248, 0.4)', 'rgba(52, 211, 153, 0.4)', 'rgba(248, 113, 113, 0.4)'],
                    borderColor: ['#0284c7', '#059669', '#dc2626'], borderWidth: 1.5, borderRadius: 4, barThickness: 45
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });
    }
}

if (window.location.pathname.includes('dashboard.html')) loadTableData();

if (window.location.pathname.includes('tasks.html')) {

    async function populateEmployeeDropdown() {
        const empSelect = document.getElementById('empName');
        if (!empSelect) return;
        const employees = await fetchEmployees();
        empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
        employees.forEach(emp => {
            if (emp[1]) {
                const option = document.createElement('option');
                option.value = emp[1]; option.textContent = `${emp[1]} (${emp[2] || 'Staff'})`;
                empSelect.appendChild(option);
            }
        });
    }
    populateEmployeeDropdown();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitTaskBtn');
            btn.textContent = "Assigning..."; btn.disabled = true;
            const payload = { employee: document.getElementById('empName').value.trim(), task: document.getElementById('taskDesc').value.trim(), status: 'Pending', date: document.getElementById('dueDate').value };
            await createNewTask(payload);
            taskForm.reset();
            btn.textContent = "Assign Task"; btn.disabled = false;
            loadManagementTable();
        });
    }

    async function loadManagementTable() {
        const tbody = document.getElementById('managementTableBody');
        if (!tbody) return;
        const data = await fetchDashboardStats();
        tbody.innerHTML = '';
        if (!data || data.length === 0) return;

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            let actionHtml = '';
            const qaStatus = row[5] || '';

            if (row[2] === 'Pending') {
                actionHtml = `<button onclick="completeTask(${index})" style="padding: 5px 10px; font-size: 12px; background-color: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">✔ Mark Done</button>`;
            } else if (row[2] === 'Completed' && qaStatus === '') {
                actionHtml = `
                    <button onclick="submitQA(${index}, 'Pass')" style="padding: 5px 10px; font-size: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">Pass</button>
                    <button onclick="submitQA(${index}, 'Fail')" style="padding: 5px 10px; font-size: 12px; background-color: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Fail</button>
                `;
            } else {
                const color = qaStatus === 'Pass' ? '#16a34a' : '#dc2626';
                actionHtml = `<span style="color: ${color}; font-size: 13px; font-weight: bold;">QA: ${qaStatus}</span>`;
            }

            tr.innerHTML = `<td><strong>${row[0] || 'N/A'}</strong></td><td>${row[1] || 'N/A'}</td><td>${row[3] || 'N/A'}</td><td>${actionHtml}</td>`;
            tbody.appendChild(tr);
        });
    }
    loadManagementTable();

    window.completeTask = async function (index) {
        event.target.textContent = "..."; event.target.disabled = true;
        await markTaskCompleted(index);
        loadManagementTable();
    };

    window.submitQA = async function (index, status) {
        event.target.textContent = "..."; event.target.disabled = true;
        await updateQAStatus(index, status);
        loadManagementTable();
    };
}

window.exportTableToCSV = function (filename) {
    const table = document.querySelector(".data-table");
    let csv = [];
    const rows = table.querySelectorAll("tr");
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            row.push(cols[j].innerText.replace(/(\r\n|\n|\r)/gm, "").replace(/,/g, ""));
        }
        csv.push(row.join(","));
    }
    const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename; downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none"; document.body.appendChild(downloadLink);
    downloadLink.click(); document.body.removeChild(downloadLink);
}

if (window.location.pathname.includes('inventory.html')) {
    async function loadInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        const data = await fetchInventory();
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No inventory records found.</td></tr>`;
            return;
        }

        data.forEach((row) => {
            const itemId = row[0] || 'N/A';
            const itemName = row[1] || 'N/A';
            const category = row[2] || 'N/A';
            const stock = parseInt(row[3]) || 0;
            const reorderLevel = parseInt(row[4]) || 0;
            let statusBadge = '';

            if (stock <= reorderLevel) {
                statusBadge = '<span style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⚠️ Reorder Required</span>';
            } else {
                statusBadge = '<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Healthy</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${itemId}</strong></td>
                <td>${itemName}</td>
                <td>${category}</td>
                <td style="font-weight: bold; font-size: 14px;">${stock}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    loadInventoryTable();
}

if (window.location.pathname.includes('finance.html')) {

    async function loadFinanceLedger() {
        const tbody = document.getElementById('financeTableBody');
        if (!tbody) return;

        const data = await fetchFinanceData();
        tbody.innerHTML = '';

        let totalInc = 0;
        let totalExp = 0;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No financial records found.</td></tr>`;
        } else {
            data.slice().reverse().forEach((row) => {
                const txnId = row[0] || '-';
                const dateStr = row[1] || '-';
                const type = row[2] || '-';
                const category = row[3] || '-';
                const amount = parseFloat(row[4]) || 0;

                let typeBadge = '';
                let amountStyle = '';

                if (type === 'Income') {
                    totalInc += amount;
                    typeBadge = '<span style="color: #16a34a; background: #dcfce7; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">INCOME</span>';
                    amountStyle = 'color: #16a34a; font-weight: bold;';
                } else if (type === 'Expense') {
                    totalExp += amount;
                    typeBadge = '<span style="color: #dc2626; background: #fee2e2; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">EXPENSE</span>';
                    amountStyle = 'color: #dc2626; font-weight: bold;';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px 8px; color: #64748b;">${dateStr}</td>
                    <td style="padding: 12px 8px; font-weight: bold; color: #072a4f;">${txnId}</td>
                    <td style="padding: 12px 8px;">${typeBadge}</td>
                    <td style="padding: 12px 8px;">${category}</td>
                    <td style="${amountStyle} padding: 12px 8px;">₹${amount.toLocaleString('en-IN')}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('totalIncome').textContent = `₹${totalInc.toLocaleString('en-IN')}`;
        document.getElementById('totalExpense').textContent = `₹${totalExp.toLocaleString('en-IN')}`;

        const net = totalInc - totalExp;
        const netElem = document.getElementById('netBalance');
        netElem.textContent = `₹${net.toLocaleString('en-IN')}`;
        netElem.style.color = net >= 0 ? '#16a34a' : '#dc2626';
    }

    loadFinanceLedger();

    const financeForm = document.getElementById('financeForm');
    if (financeForm) {
        financeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('financeSubmitBtn');
            btn.textContent = "Recording...";
            btn.disabled = true;

            const txnId = 'TXN-' + Math.floor(100000 + Math.random() * 900000);
            const dateStr = new Date().toISOString().split('T')[0];

            const payload = {
                txnId: txnId,
                date: dateStr,
                type: document.getElementById('txnType').value,
                category: document.getElementById('txnCategory').value.trim(),
                amount: document.getElementById('txnAmount').value,
                description: document.getElementById('txnDesc').value.trim()
            };

            const result = await addTransaction(payload);
            if (result.success) {
                financeForm.reset();
                loadFinanceLedger();
            } else {
                alert("Failed to record transaction.");
            }

            btn.textContent = "Record";
            btn.disabled = false;
        });
    }
}