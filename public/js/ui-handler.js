// ==========================================
// UNIVERSAL CSV EXPORT UTILITY
// ==========================================
window.exportTableToCSV = function (filename) {
    const tables = document.querySelectorAll("table.data-table");
    if (tables.length === 0) return;

    let csv = [];
    let rows = tables[0].querySelectorAll("tr");

    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, "").trim();
            data = data.replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(","));
    }

    const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

// ==========================================
// GLOBAL LOGIC & RBAC
// ==========================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('nexora_session_role');
        localStorage.removeItem('nexora_token'); // Deletes the secure JWT
        window.location.href = 'index.html';
    });
}

const userInfoDisplay = document.querySelector('.user-info');
if (userInfoDisplay) {
    let currentName = localStorage.getItem('nexora_session_name') || 'Authorized User';
    userInfoDisplay.textContent = `Welcome, ${currentName}`;
}

const currentSystemRole = localStorage.getItem('nexora_session_role') || 'Guest';
const restrictedPages = ['dashboard.html', 'hr.html', 'finance.html', 'settings.html', 'qc.html'];

if (currentSystemRole === 'Staff' && restrictedPages.some(page => window.location.pathname.includes(page))) {
    alert("🔒 Access Denied: Administrator clearance required.");
    window.location.href = 'tasks.html';
}

document.addEventListener('DOMContentLoaded', () => {
    if (currentSystemRole === 'Staff') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
});

// ==========================================
// HR & PROVISIONING
// ==========================================
if (window.location.pathname.includes('hr.html')) {
    const addModal = document.getElementById('addEmployeeModal');
    const openBtn = document.getElementById('openAddEmployeeModal');
    const closeBtn = document.getElementById('closeModalBtn');

    if (openBtn && closeBtn && addModal) {
        openBtn.addEventListener('click', () => addModal.classList.add('active'));
        closeBtn.addEventListener('click', () => {
            addModal.classList.remove('active');
            document.getElementById('newCredentialsDisplay').style.display = 'none';
        });
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.classList.remove('active');
        });
    }

    async function loadDirectory() {
        const tbody = document.getElementById('hrTableBody');
        if (!tbody) return;
        const data = await fetchEmployees();
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No staff found.</td></tr>`;
            return;
        }
        data.forEach((row) => {
            const statusBadge = (row[4] || 'Active') === 'Active' ? '<span class="badge-success">Active</span>' : '<span class="badge-warning">Suspended</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight:bold; color:#072a4f;">${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${statusBadge}</td>`;
            tbody.appendChild(tr);
        });
    }
    loadDirectory();

    const hrForm = document.getElementById('hrForm');
    if (hrForm) {
        hrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('hrSubmitBtn');
            btn.textContent = "Provisioning..."; btn.disabled = true;

            const generatedId = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
            const generatedKey = Math.random().toString(36).slice(-6).toUpperCase();

            const payload = {
                empId: generatedId,
                name: document.getElementById('empName').value.trim(),
                role: document.getElementById('empRole').value,
                passkey: generatedKey,
                status: 'Active'
            };

            const result = await registerEmployee(payload);
            if (result.success) {
                hrForm.reset();
                loadDirectory();
                document.getElementById('newCredentialsDisplay').style.display = 'block';
                document.getElementById('displayId').textContent = generatedId;
                document.getElementById('displayKey').textContent = generatedKey;
            } else {
                alert("Failed to provision employee.");
            }
            btn.textContent = "Generate Credentials"; btn.disabled = false;
        });
    }

    const clockInBtn = document.getElementById('clockInBtn');
    if (clockInBtn) {
        clockInBtn.addEventListener('click', async () => {
            const empId = document.getElementById('attEmpId').value.trim();
            const res = await fetch('http://localhost:3000/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId }) });
            const data = await res.json();
            alert(data.message || "Shift logged.");
        });
    }

    const runPayrollBtn = document.getElementById('runPayrollBtn');
    if (runPayrollBtn) {
        runPayrollBtn.addEventListener('click', async () => {
            const empId = document.getElementById('payrollEmpId').value.trim();
            const user = localStorage.getItem('nexora_session_name') || 'Unknown';
            const res = await fetch('http://localhost:3000/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId, user }) });
            const data = await res.json();
            alert(data.message || "Payroll processed.");
        });
    }
}

// ==========================================
// EXECUTIVE DASHBOARD (GOD VIEW)
// ==========================================
if (window.location.pathname.includes('dashboard.html')) {
    async function loadGodView() {
        const tableBody = document.getElementById('recentTasksTable');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">Aggregating multi-source data...</td></tr>`;

        const [tasks, inventory, finance] = await Promise.all([fetchDashboardStats(), fetchInventory(), fetchFinanceData()]);
        let activeTasksCount = 0, delayedTasksCount = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);

        if (tableBody) tableBody.innerHTML = '';

        (tasks || []).forEach((row) => {
            const status = row[2] || 'N/A', qaStatus = row[5] || '';
            let statusStyle = '', actionBtn = '<span style="color: #bdc3c7; font-size: 13px;">No Action Needed</span>';

            if (status === 'Completed') {
                statusStyle = 'color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block;';
                actionBtn = qaStatus === 'Pass' ? '<span style="color: #16a34a; font-size: 12px; font-weight: bold;">QA Passed ✔</span>' : (qaStatus === 'Fail' ? '<span style="color: #dc2626; font-size: 12px; font-weight: bold;">QA Failed ✖</span>' : '<span style="color: #ca8a04; font-size: 12px; font-weight: bold;">Pending QA</span>');
            } else if (status === 'Pending') {
                activeTasksCount++;
                statusStyle = 'color: #ea580c; font-weight: bold; background: #ffedd5; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block;';
                if (new Date(row[3]) < today) {
                    delayedTasksCount++;
                    statusStyle = 'color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block;';
                    actionBtn = `<span style="color: #dc2626; font-size: 12px; font-weight: bold;">⚠️ OVERDUE</span>`;
                }
            }

            if (tableBody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding: 12px 15px; font-weight: 500; color:#0f172a;">${row[0]}</td><td style="padding: 12px 15px; color:#475569;">${row[1]}</td><td style="padding: 12px 15px;">${statusStyle ? `<span style="${statusStyle}">${status}</span>` : status}</td><td style="padding: 12px 15px;">${actionBtn}</td>`;
                tableBody.appendChild(tr);
            }
        });

        let lowStockCount = 0;
        (inventory || []).forEach(row => { if ((parseInt(row[3]) || 0) <= (parseInt(row[4]) || 0)) lowStockCount++; });

        let totalInc = 0, totalExp = 0;
        (finance || []).forEach(row => {
            const amt = parseFloat(row[4]) || 0;
            if (row[2] === 'Income') totalInc += amt;
            if (row[2] === 'Expense') totalExp += amt;
        });

        try {
            if (typeof calculateTaxWithPython === "function") {
                const pyResult = await calculateTaxWithPython(totalInc, totalExp);
                if (pyResult && pyResult.success && document.getElementById('godNetProfit')) {
                    document.getElementById('godNetProfit').textContent = `₹${pyResult.net_profit.toLocaleString('en-IN')}`;
                }
            }
        } catch (e) { console.warn("Python engine skipped locally."); }

        if (document.getElementById('godActiveTasks')) document.getElementById('godActiveTasks').textContent = activeTasksCount;
        if (document.getElementById('godDelayedTasks')) document.getElementById('godDelayedTasks').textContent = delayedTasksCount;
        if (document.getElementById('godInventoryAlerts')) document.getElementById('godInventoryAlerts').textContent = lowStockCount;

        // --- RESTORED CHART.JS LOGIC WITH CORRECTED MATH ---
        const ctx = document.getElementById('workflowChart');
        if (ctx) {
            if (window.workflowChartInstance) window.workflowChartInstance.destroy();

            // Explicitly count completed tasks by filtering the raw data
            const completedCount = (tasks || []).filter(row => row[2] === 'Completed').length;
            // Subtract delayed from active so they aren't double-counted in the bar graph
            const onTimeActiveCount = Math.max(0, activeTasksCount - delayedTasksCount);

            window.workflowChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Active (On Time)', 'Completed', 'Delayed'],
                    datasets: [{
                        data: [onTimeActiveCount, completedCount, delayedTasksCount],
                        backgroundColor: ['rgba(59, 130, 246, 0.2)', 'rgba(22, 163, 74, 0.2)', 'rgba(220, 38, 38, 0.2)'],
                        borderColor: ['#3b82f6', '#16a34a', '#dc2626'],
                        borderWidth: 2, borderRadius: 4, barThickness: 30
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
            });
        }
    }
    loadGodView();
}

// ==========================================
// TASKS, INVENTORY, FINANCE, SUPPLY, QC, PROD
// ==========================================
if (window.location.pathname.includes('tasks.html')) {
    async function populateEmployeeDropdown() {
        const empSelect = document.getElementById('empName');
        if (!empSelect) return;
        const employees = await fetchEmployees();
        empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
        employees.forEach(emp => {
            if (emp[1]) empSelect.appendChild(new Option(`${emp[1]} (${emp[2] || 'Staff'})`, emp[1]));
        });
    }
    populateEmployeeDropdown();

    async function loadManagementTable() {
        const tbody = document.getElementById('managementTableBody');
        if (!tbody) return;
        const data = await fetchDashboardStats();
        tbody.innerHTML = '';
        (data || []).forEach((row, index) => {
            const tr = document.createElement('tr');
            const qaStatus = row[5] || '';
            let actionHtml = row[2] === 'Pending'
                ? `<button onclick="completeTask(${index})" class="btn-primary" style="padding: 5px 10px; font-size: 12px;">✔ Mark Done</button>`
                : (row[2] === 'Completed' && qaStatus === '' ? `<button onclick="submitQA(${index}, 'Pass')" style="background: #3b82f6; color: white; border: none; padding: 5px; cursor: pointer; border-radius:4px;">Pass</button> <button onclick="submitQA(${index}, 'Fail')" style="background: #dc2626; color: white; border: none; padding: 5px; cursor: pointer; border-radius:4px;">Fail</button>` : `<span style="color: ${qaStatus === 'Pass' ? '#16a34a' : '#dc2626'}; font-size: 13px; font-weight: bold;">QA: ${qaStatus}</span>`);
            tr.innerHTML = `<td><strong>${row[0] || 'N/A'}</strong></td><td>${row[1] || 'N/A'}</td><td>${row[3] || 'N/A'}</td><td>${actionHtml}</td>`;
            tbody.appendChild(tr);
        });
    }
    loadManagementTable();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = { employee: document.getElementById('empName').value.trim(), task: document.getElementById('taskDesc').value.trim(), status: 'Pending', date: document.getElementById('dueDate').value };
            await createNewTask(payload);
            taskForm.reset();
            loadManagementTable();
        });
    }

    window.completeTask = async function (index) { await markTaskCompleted(index); loadManagementTable(); };
    window.submitQA = async function (index, status) { await updateQAStatus(index, status); loadManagementTable(); };
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
            const stock = parseInt(row[3]) || 0;
            const statusBadge = stock <= (parseInt(row[4]) || 0) ? '<span class="badge-warning">⚠️ Reorder Required</span>' : '<span class="badge-success">Healthy</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td style="font-weight: bold; font-size: 14px;">${stock}</td><td>${statusBadge}</td>`;
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
        let totalInc = 0, totalExp = 0;

        (data || []).slice().reverse().forEach((row) => {
            const amt = parseFloat(row[4]) || 0;
            if (row[2] === 'Income') totalInc += amt;
            if (row[2] === 'Expense') totalExp += amt;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="color: #64748b;">${row[1]}</td><td style="font-weight: bold; color: #072a4f;">${row[0]}</td><td><span class="${row[2] === 'Income' ? 'badge-success' : 'badge-warning'}">${row[2].toUpperCase()}</span></td><td>${row[3]}</td><td style="font-weight: bold; color: ${row[2] === 'Income' ? '#16a34a' : '#dc2626'};">₹${amt.toLocaleString('en-IN')}</td>`;
            tbody.appendChild(tr);
        });

        document.getElementById('totalIncome').textContent = `₹${totalInc.toLocaleString('en-IN')}`;
        document.getElementById('totalExpense').textContent = `₹${totalExp.toLocaleString('en-IN')}`;
        const netElem = document.getElementById('netBalance');
        netElem.textContent = `₹${(totalInc - totalExp).toLocaleString('en-IN')}`;
        netElem.style.color = (totalInc - totalExp) >= 0 ? '#16a34a' : '#dc2626';

        // --- PING PYTHON ENGINE FOR ADVANCED ANALYTICS ---
        try {
            if (typeof calculateTaxWithPython === "function") {
                const pyResult = await calculateTaxWithPython(totalInc, totalExp);
                if (pyResult && pyResult.success) {
                    document.getElementById('pyGrossProfit').textContent = `₹${pyResult.gross_profit.toLocaleString('en-IN')}`;
                    document.getElementById('pyTax').textContent = `₹${pyResult.estimated_tax.toLocaleString('en-IN')}`;
                    document.getElementById('pyNetProfit').textContent = `₹${pyResult.net_profit.toLocaleString('en-IN')}`;
                }
            }
        } catch (e) { console.warn("Python engine offline."); }
    }
    loadFinanceLedger();

    const financeForm = document.getElementById('financeForm');
    if (financeForm) {
        financeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                txnId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                date: new Date().toISOString().split('T')[0],
                type: document.getElementById('txnType').value,
                category: document.getElementById('txnCategory').value.trim(),
                amount: document.getElementById('txnAmount').value,
                description: document.getElementById('txnDesc').value.trim()
            };
            await addTransaction(payload);
            financeForm.reset();
            loadFinanceLedger();
        });
    }
}

if (window.location.pathname.includes('supply.html')) {
    async function loadSupplyLedger() {
        const tbody = document.getElementById('supplyTableBody');
        if (!tbody) return;
        const data = await fetchSupplyLedger();
        tbody.innerHTML = '';
        (data || []).slice().reverse().forEach((row) => {
            const statusBadge = row[7] === 'Pending' ? '<span style="color: #ca8a04; font-weight: 600;">⏳ Pending</span>' : (row[7].includes('Dispatched') ? '<span style="color: #3b82f6; font-weight: 600;">🚚 Dispatched</span>' : '<span style="color: #16a34a; font-weight: 600;">✅ Invoiced</span>');
            const typeBadge = row[2].includes('Purchase') ? '<span class="badge-warning">PO</span>' : '<span class="badge-success">SO</span>';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight: bold; color: #072a4f;">${row[0]}</td><td style="color: #64748b;">${row[1]}</td><td>${typeBadge}</td><td style="font-weight: 500;">${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td><td style="font-weight: bold;">₹${parseFloat(row[6] || 0).toLocaleString('en-IN')}</td><td>${statusBadge}</td>`;
            tbody.appendChild(tr);
        });
    }
    loadSupplyLedger();

    const supplyForm = document.getElementById('supplyForm');
    if (supplyForm) {
        supplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                date: new Date().toISOString().split('T')[0],
                type: document.getElementById('supplyType').value,
                partner: document.getElementById('supplyPartner').value.trim(),
                item: document.getElementById('supplyItem').value.trim(),
                qty: parseInt(document.getElementById('supplyQty').value),
                value: parseFloat(document.getElementById('supplyValue').value),
                status: document.getElementById('supplyStatus').value,
                user: localStorage.getItem('nexora_session_name') || 'Unknown'
            };
            const result = await addSupplyEvent(payload);
            if (result.success) { supplyForm.reset(); loadSupplyLedger(); } else { alert(result.message || "Failed."); }
        });
    }
}

if (window.location.pathname.includes('qc.html')) {
    async function loadPendingQC() {
        const tbody = document.getElementById('qcTableBody');
        if (!tbody) return;
        const res = await fetch('http://localhost:3000/api/qc/pending');
        const result = await res.json();
        tbody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending materials.</td></tr>`;
            return;
        }
        result.data.forEach((obj) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight: bold; color: #072a4f;">${obj.data[0]}</td><td>${obj.data[1]}</td><td>${obj.data[4]}</td><td style="font-weight: bold;">${obj.data[5]}</td><td><span class="badge-warning">⏳ Awaiting IQC</span></td>
                <td><button onclick="processQC(${obj.rowIndex}, '${obj.data[0]}', '${obj.data[4]}', ${obj.data[5]}, 'Passed')" class="btn-primary" style="padding: 4px 8px; width:auto; background: #16a34a;">✔</button> <button onclick="processQC(${obj.rowIndex}, '${obj.data[0]}', '${obj.data[4]}', ${obj.data[5]}, 'Rejected')" class="btn-primary" style="padding: 4px 8px; width:auto; background: #dc2626;">✖</button></td>`;
            tbody.appendChild(tr);
        });
    }

    window.processQC = async function (rowIndex, poRef, item, qty, status) {
        const defaultRemark = status === 'Passed' ? "Visual checks passed." : "Out of tolerance.";
        const remarks = prompt(`Enter inspection remarks for ${item} (${status}):`, defaultRemark);
        if (remarks === null) return;
        const payload = { rowIndex, poRef, item, qty, status, inspector: localStorage.getItem('nexora_session_name') || 'Unknown', remarks };
        const res = await fetch('http://localhost:3000/api/qc/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if ((await res.json()).success) loadPendingQC();
    };
    loadPendingQC();
}

if (window.location.pathname.includes('production.html')) {
    async function loadProductionLedger() {
        const tbody = document.getElementById('prodTableBody');
        if (!tbody) return;
        const res = await fetch('http://localhost:3000/api/production');
        const result = await res.json();
        tbody.innerHTML = '';
        (result.data || []).slice().reverse().forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight: bold; color: #072a4f;">${row[0]}</td><td style="color: #64748b;">${row[1]}</td><td>${row[2]}</td><td style="font-weight: bold;">${row[3]}</td><td><span class="badge-success">✔ Completed</span></td>`;
            tbody.appendChild(tr);
        });
    }
    loadProductionLedger();

    const prodForm = document.getElementById('productionForm');
    if (prodForm) {
        prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                date: new Date().toISOString().split('T')[0],
                product: document.getElementById('prodItem').value.trim(),
                prodQty: parseInt(document.getElementById('prodQty').value),
                rmItem: document.getElementById('rmItem').value.trim(),
                rmQty: parseInt(document.getElementById('rmQty').value),
                user: localStorage.getItem('nexora_session_name') || 'Operator'
            };
            const res = await fetch('http://localhost:3000/api/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) { prodForm.reset(); loadProductionLedger(); alert("Production logged."); }
        });
    }
}

if (window.location.pathname.includes('settings.html')) {
    const roleDisplay = document.getElementById('settingUserRole');
    if (document.getElementById('settingUserName') && roleDisplay) {
        const role = localStorage.getItem('nexora_session_role') || 'Unauthorized';
        document.getElementById('settingUserName').textContent = localStorage.getItem('nexora_session_name') || 'Unknown User';
        roleDisplay.textContent = `${role} Designation`;
        roleDisplay.className = role === 'MD' || role === 'Manager' ? 'badge-success' : 'badge-warning';
    }
}