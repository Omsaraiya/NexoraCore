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

function setFormProcessing(form, processing, processingLabel = 'Processing...') {
    const submitButton = form && form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    if (processing) {
        submitButton.dataset.defaultLabel = submitButton.textContent;
        submitButton.textContent = processingLabel;
        submitButton.disabled = true;
    } else {
        submitButton.textContent = submitButton.dataset.defaultLabel || submitButton.textContent;
        submitButton.disabled = false;
    }
}

function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

const $ = id => document.getElementById(id);

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

    function renderEmployeeStatusBadge(status) {
        const normalizedStatus = String(status || '').trim();
        if (!normalizedStatus || normalizedStatus === 'Active') return '<span class="badge-active">Active</span>';
        if (normalizedStatus === 'Suspended') return '<span class="badge-suspended">Suspended</span>';
        if (normalizedStatus === 'Inactive') return '<span class="badge-inactive">Inactive</span>';
        return '<span class="badge-active">Active</span>';
    }

    if (openBtn && closeBtn && addModal) {
        openBtn.addEventListener('click', () => addModal.classList.add('active'));
        closeBtn.addEventListener('click', () => {
            addModal.classList.remove('active');
            const credentialsDisplay = document.getElementById('newCredentialsDisplay');
            if (credentialsDisplay) credentialsDisplay.style.display = 'none';
        });
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) addModal.classList.remove('active');
        });
    }

    async function loadDirectory() {
        const tbody = document.getElementById('hrTableBody');
        if (!tbody) return;

        try {
            const data = await fetchEmployees();
            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">No staff found.</td></tr>';
                return;
            }

            data.forEach((row) => {
                const statusBadge = renderEmployeeStatusBadge(row[4] || 'Active');
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="font-weight:bold; color:#072a4f;">${row[0] || 'N/A'}</td><td>${row[1] || 'N/A'}</td><td>${row[2] || 'Unassigned'}</td><td>${statusBadge}</td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">System offline. Please retry later.</td></tr>';
            showErrorToast(error.message || 'Network Error: Failed to fetch employee directory.');
        }
    }
    loadDirectory();

    const hrForm = document.getElementById('hrForm');
    if (hrForm) {
        hrForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const employeeName = document.getElementById('empName').value.trim();
            const employeeRole = document.getElementById('empRole').value.trim();
            const employeeDepartment = document.getElementById('empDepartment').value.trim();

            if (!employeeName || !employeeRole || !employeeDepartment) {
                showErrorToast('Please provide the employee name, role, and department before onboarding.');
                return;
            }

            setFormProcessing(hrForm, true, 'Provisioning...');
            try {
                const generatedId = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
                const generatedKey = Math.random().toString(36).slice(-6).toUpperCase();
                const payload = {
                    empId: generatedId,
                    name: employeeName,
                    role: employeeRole,
                    department: employeeDepartment,
                    passkey: generatedKey,
                    status: 'Active'
                };
                const result = await registerEmployee(payload);
                if (!result || result.success === false) {
                    throw new Error(result && result.message ? result.message : 'Failed to provision employee.');
                }

                hrForm.reset();
                await loadDirectory();

                const credentialsDisplay = document.getElementById('newCredentialsDisplay');
                if (credentialsDisplay) {
                    credentialsDisplay.style.display = 'block';
                    document.getElementById('displayId').textContent = generatedId;
                    document.getElementById('displayKey').textContent = generatedKey;
                }
            } catch (error) {
                showErrorToast(error.message || 'Unable to provision employee.');
            } finally {
                setFormProcessing(hrForm, false);
            }
        });
    }

    const clockInBtn = document.getElementById('clockInBtn');
    if (clockInBtn) {
        clockInBtn.addEventListener('click', async () => {
            const empId = document.getElementById('attEmpId').value.trim();
            try {
                const data = await apiCall('/api/attendance', 'POST', { empId });
                if (!data || data.success === false) throw new Error(data && data.message ? data.message : 'Unable to log shift.');
                showErrorToast('Shift logged successfully.');
            } catch (error) {
                showErrorToast(error.message || 'Unable to log shift.');
            }
        });
    }

    const runPayrollBtn = document.getElementById('runPayrollBtn');
    if (runPayrollBtn) {
        runPayrollBtn.addEventListener('click', async () => {
            const empId = document.getElementById('payrollEmpId').value.trim();
            const user = localStorage.getItem('nexora_session_name') || 'Unknown';
            try {
                const data = await apiCall('/api/payroll', 'POST', { empId, user });
                if (!data || data.success === false) throw new Error(data && data.message ? data.message : 'Unable to process payroll.');
                showErrorToast(data.message || 'Payroll processed.');
            } catch (error) {
                showErrorToast(error.message || 'Unable to process payroll.');
            }
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
    function renderTaskStatusBadge(status) {
        const normalizedStatus = String(status || '').trim();
        if (!normalizedStatus) return '<span class="badge-pending">Pending</span>';
        if (normalizedStatus === 'Completed') return '<span class="badge-success">Completed</span>';
        if (normalizedStatus === 'In Progress') return '<span class="badge-in-progress">In Progress</span>';
        return '<span class="badge-pending">Pending</span>';
    }

    async function populateEmployeeDropdown() {
        const empSelect = document.getElementById('empName');
        if (!empSelect) return;

        try {
            const employees = await fetchEmployees();
            empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
            (employees || []).forEach(emp => {
                if (emp[1]) empSelect.appendChild(new Option(`${emp[1]} (${emp[2] || 'Staff'})`, emp[1]));
            });
        } catch (error) {
            empSelect.innerHTML = '<option value="">Unable to load employees</option>';
            showErrorToast(error.message || 'Failed to load employees.');
        }
    }
    populateEmployeeDropdown();

    async function loadManagementTable() {
        const tbody = document.getElementById('managementTableBody');
        if (!tbody) return;

        try {
            const data = await fetchDashboardStats();
            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">No tasks found for this period.</td></tr>';
                return;
            }

            (data || []).forEach((row, index) => {
                const tr = document.createElement('tr');
                const taskStatus = String(row[2] || '').trim() || 'Pending';
                const qaStatus = row[5] || '';
                let actionHtml = taskStatus === 'Pending'
                    ? `<button onclick="completeTask(${index})" class="btn-primary" style="padding: 5px 10px; font-size: 12px;">✔ Mark Done</button>`
                    : (taskStatus === 'Completed' && qaStatus === '' ? `<button onclick="submitQA(${index}, 'Pass')" style="background: #3b82f6; color: white; border: none; padding: 5px; cursor: pointer; border-radius:4px;">Pass</button> <button onclick="submitQA(${index}, 'Fail')" style="background: #dc2626; color: white; border: none; padding: 5px; cursor: pointer; border-radius:4px;">Fail</button>` : `<span style="color: ${qaStatus === 'Pass' ? '#16a34a' : '#dc2626'}; font-size: 13px; font-weight: bold;">QA: ${qaStatus}</span>`);
                tr.innerHTML = `<td><strong>${row[0] || 'N/A'}</strong></td><td>${row[1] || 'N/A'}</td><td>${row[3] || 'N/A'}</td><td>${renderTaskStatusBadge(taskStatus)}</td><td>${actionHtml}</td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">System offline. Please retry later.</td></tr>';
            showErrorToast(error.message || 'Network Error: Failed to fetch tasks.');
        }
    }
    loadManagementTable();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const assignee = document.getElementById('empName').value.trim();
            const taskDescription = document.getElementById('taskDesc').value.trim();
            const dueDate = document.getElementById('dueDate').value;

            if (!assignee || !taskDescription || !dueDate) {
                showErrorToast('Please provide the assignee, task description, and due date.');
                return;
            }

            setFormProcessing(taskForm, true);
            const payload = { employee: assignee, task: taskDescription, status: 'Pending', date: dueDate };

            try {
                const result = await createNewTask(payload);
                if (!result || result.success === false) {
                    throw new Error(result && result.message ? result.message : 'Unable to create task.');
                }
                taskForm.reset();
                await loadManagementTable();
            } catch (error) {
                showErrorToast(error.message || 'Unable to create task.');
            } finally {
                setFormProcessing(taskForm, false);
            }
        });
    }

    window.completeTask = async function (index) {
        try {
            const result = await markTaskCompleted(index);
            if (!result || result.success === false) throw new Error(result && result.message ? result.message : 'Unable to complete task.');
            await loadManagementTable();
        } catch (error) {
            showErrorToast(error.message || 'Unable to complete task.');
        }
    };

    window.submitQA = async function (index, status) {
        try {
            const result = await updateQAStatus(index, status);
            if (!result || result.success === false) throw new Error(result && result.message ? result.message : 'Unable to submit QA result.');
            await loadManagementTable();
        } catch (error) {
            showErrorToast(error.message || 'Unable to submit QA result.');
        }
    };
}

if (window.location.pathname.includes('inventory.html')) {
    const inventoryModal = document.getElementById('addInventoryModal');
    const openInventoryModal = document.getElementById('openInventoryModal');
    const closeInventoryModal = document.getElementById('closeInventoryModal');

    if (inventoryModal && openInventoryModal && closeInventoryModal) {
        openInventoryModal.addEventListener('click', () => inventoryModal.classList.add('active'));
        closeInventoryModal.addEventListener('click', () => inventoryModal.classList.remove('active'));
        inventoryModal.addEventListener('click', (event) => {
            if (event.target === inventoryModal) inventoryModal.classList.remove('active');
        });
    }

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

    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setFormProcessing(inventoryForm, true);
            try {
                const result = await addInventoryItem({
                    name: document.getElementById('inventoryItemName').value.trim(),
                    category: document.getElementById('inventoryCategory').value.trim(),
                    stock: document.getElementById('inventoryStock').value,
                    reorderLevel: document.getElementById('inventoryReorderLevel').value
                });
                if (!result.success) throw new Error(result.message || 'Unable to add inventory item.');
                inventoryForm.reset();
                document.getElementById('inventoryCategory').value = 'Raw Material';
                inventoryModal.classList.remove('active');
                loadInventoryTable();
            } catch (error) {
                alert(error.message);
            } finally {
                setFormProcessing(inventoryForm, false);
            }
        });
    }
}

if (window.location.pathname.includes('finance.html')) {
    async function loadFinanceLedger() {
        const tbody = document.getElementById('financeTableBody');
        if (!tbody) return;

        try {
            const data = await fetchFinanceData();
            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">No records found for this period.</td></tr>';
                return;
            }

            let totalInc = 0, totalExp = 0;

            data.slice().reverse().forEach((row) => {
                const amt = Number.parseFloat(row[4]) || 0;
                const rawType = String(row[2] || '').trim();
                const normalizedType = rawType === 'Expense' ? 'Expense' : 'Income';
                if (normalizedType === 'Income') totalInc += amt;
                if (normalizedType === 'Expense') totalExp += amt;

                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="color: #64748b;">${row[1] || '-'}</td><td style="font-weight: bold; color: #072a4f;">${row[0] || '-'}</td><td><span class="${normalizedType === 'Income' ? 'badge-income' : 'badge-expense'}">${normalizedType.toUpperCase()}</span></td><td>${row[3] || '-'}</td><td style="font-weight: bold; color: ${normalizedType === 'Income' ? '#16a34a' : '#dc2626'};">₹${amt.toLocaleString('en-IN')}</td>`;
                tbody.appendChild(tr);
            });

            document.getElementById('totalIncome').textContent = `₹${totalInc.toLocaleString('en-IN')}`;
            document.getElementById('totalExpense').textContent = `₹${totalExp.toLocaleString('en-IN')}`;
            const netElem = document.getElementById('netBalance');
            netElem.textContent = `₹${(totalInc - totalExp).toLocaleString('en-IN')}`;
            netElem.style.color = (totalInc - totalExp) >= 0 ? '#16a34a' : '#dc2626';

            try {
                if (typeof calculateTaxWithPython === "function") {
                    const pyResult = await calculateTaxWithPython(totalInc, totalExp);
                    if (pyResult && pyResult.success) {
                        document.getElementById('pyGrossProfit').textContent = `₹${Number(pyResult.gross_profit || 0).toLocaleString('en-IN')}`;
                        document.getElementById('pyTax').textContent = `₹${Number(pyResult.estimated_tax || 0).toLocaleString('en-IN')}`;
                        document.getElementById('pyNetProfit').textContent = `₹${Number(pyResult.net_profit || 0).toLocaleString('en-IN')}`;
                    }
                }
            } catch (e) { console.warn("Python engine offline."); }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="text-align:center; padding: 20px; color: #64748b;">System offline. Please check your connection.</td></tr>';
            showErrorToast('Network Error: Failed to fetch ledger data.');
        }
    }
    loadFinanceLedger();

    const financeForm = document.getElementById('financeForm');
    if (financeForm) {
        financeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const txnType = document.getElementById('txnType').value.trim();
            const txnCategory = document.getElementById('txnCategory').value.trim();
            const txnAmountRaw = document.getElementById('txnAmount').value;
            const parsedAmount = Number.parseFloat(txnAmountRaw);

            if (!txnType || !txnCategory || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                showErrorToast('Please provide a valid transaction type, category, and amount greater than zero.');
                return;
            }

            setFormProcessing(financeForm, true);
            const payload = {
                txnId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                date: new Date().toISOString().split('T')[0],
                type: txnType,
                category: txnCategory,
                amount: parsedAmount,
                description: document.getElementById('txnDesc').value.trim()
            };

            try {
                const result = await addTransaction(payload);
                if (!result || result.success === false) {
                    throw new Error(result && result.message ? result.message : 'Unable to save transaction.');
                }
                financeForm.reset();
                await loadFinanceLedger();
            } catch (error) {
                showErrorToast(error.message || 'Unable to save transaction.');
            } finally {
                setFormProcessing(financeForm, false);
            }
        });
    }
}

if (window.location.pathname.includes('supply.html')) {
    function renderStatusBadge(status) {
        const safeStatus = (status || '').toString().trim();
        if (!safeStatus) return '<span class="status-badge status-pending">—</span>';
        if (safeStatus === 'Pending') return '<span class="status-badge status-pending">⏳ Pending</span>';
        if (safeStatus.includes('Dispatched') || safeStatus.includes('Delivered')) return '<span class="status-badge status-dispatched">🚚 In Transit</span>';
        if (safeStatus.includes('Invoiced') || safeStatus.includes('Settled')) return '<span class="status-badge status-invoiced">✅ Invoiced</span>';
        return `<span class="status-badge status-pending">${safeStatus}</span>`;
    }

    async function loadSupplyLedger() {
        const tbody = document.getElementById('supplyTableBody');
        if (!tbody) return;

        try {
            const data = await fetchSupplyLedger();
            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<div class="empty-state">No records found for this period.</div>';
                return;
            }

            data.slice().reverse().forEach((row) => {
                const safeStatus = Array.isArray(row) && row[7] ? row[7] : '';
                const safeType = Array.isArray(row) && row[2] ? row[2] : '';
                const typeBadge = safeType.includes('Purchase') ? '<span class="badge-warning">PO</span>' : '<span class="badge-success">SO</span>';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="font-weight: bold; color: #072a4f;">${row[0] || 'N/A'}</td><td style="color: #64748b;">${row[1] || 'N/A'}</td><td>${typeBadge}</td><td style="font-weight: 500;">${row[3] || 'N/A'}</td><td>${row[4] || 'N/A'}</td><td>${row[5] || 0}</td><td style="font-weight: bold;">₹${parseFloat(row[6] || 0).toLocaleString('en-IN')}</td><td>${renderStatusBadge(safeStatus)}</td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = '<div class="empty-state">System offline. Please check your connection.</div>';
            showErrorToast('Network Error: Failed to fetch ledger data.');
        }
    }
    loadSupplyLedger();

    const supplyForm = document.getElementById('supplyForm');
    if (supplyForm) {
        supplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const partner = document.getElementById('supplyPartner').value.trim();
            const item = document.getElementById('supplyItem').value.trim();

            if (!partner || !item) {
                alert('Supplier Name and Item Name are required before submitting a supply event.');
                return;
            }

            setFormProcessing(supplyForm, true);
            const payload = {
                date: new Date().toISOString().split('T')[0],
                type: document.getElementById('supplyType').value,
                partner,
                item,
                qty: parseInt(document.getElementById('supplyQty').value) || 0,
                value: parseFloat(document.getElementById('supplyValue').value) || 0,
                status: document.getElementById('supplyStatus').value,
                user: localStorage.getItem('nexora_session_name') || 'Unknown'
            };
            try {
                const result = await addSupplyEvent(payload);
                if (!result.success) throw new Error(result.message || "Unable to save supply event.");
                supplyForm.reset();
                await loadSupplyLedger();
            } catch (error) {
                alert(error.message || "Unable to save supply event.");
            } finally {
                setFormProcessing(supplyForm, false);
            }
        });
    }
}

if (window.location.pathname.includes('qc.html')) {
    async function loadPendingQC() {
        const tbody = document.getElementById('qcTableBody');
        if (!tbody) return;
        const result = await apiCall('/api/qc/pending');
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
        if ((await apiCall('/api/qc/process', 'POST', payload)).success) loadPendingQC();
    };
    loadPendingQC();
}

if (window.location.pathname.includes('production.html')) {
    function renderProductionStatusBadge(status) {
        const safeStatus = (status || '').toString().trim();
        if (!safeStatus) return '<span class="status-badge status-in-progress">—</span>';
        if (safeStatus.toLowerCase().includes('completed')) return '<span class="status-badge status-completed">✔ Completed</span>';
        if (safeStatus.toLowerCase().includes('in progress') || safeStatus.toLowerCase().includes('progress')) return '<span class="status-badge status-in-progress">🟦 In Progress</span>';
        if (safeStatus.toLowerCase().includes('blocked') || safeStatus.toLowerCase().includes('rejected')) return '<span class="status-badge status-blocked">⚠ Blocked</span>';
        return `<span class="status-badge status-in-progress">${safeStatus}</span>`;
    }

    async function loadProductionLedger() {
        const tbody = document.getElementById('prodTableBody');
        if (!tbody) return;

        try {
            const result = await apiCall('/api/production');
            tbody.innerHTML = '';

            if (!result.data || result.data.length === 0) {
                tbody.innerHTML = '<div class="empty-state">No production records found.</div>';
                return;
            }

            (result.data || []).slice().reverse().forEach((row) => {
                const status = row[5] || 'Completed';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="font-weight: bold; color: #072a4f;">${row[0] || 'N/A'}</td><td style="color: #64748b;">${row[1] || 'N/A'}</td><td>${row[2] || 'N/A'}</td><td style="font-weight: bold;">${row[3] || 0}</td><td>${renderProductionStatusBadge(status)}</td>`;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = '<div class="empty-state">System offline. Please check your connection.</div>';
            showErrorToast('Network Error: Failed to fetch production ledger data.');
        }
    }
    loadProductionLedger();

    const prodForm = document.getElementById('productionForm');
    if (prodForm) {
        prodForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const product = document.getElementById('prodItem').value.trim();
            const rmItem = document.getElementById('rmItem').value.trim();
            const prodQty = parseFloat(document.getElementById('prodQty').value);
            const rmQty = parseFloat(document.getElementById('rmQty').value);

            if (!product || !rmItem || !Number.isFinite(prodQty) || prodQty <= 0 || !Number.isFinite(rmQty) || rmQty <= 0) {
                showErrorToast('Production validation failed: Product, raw material, and quantity are required.');
                return;
            }

            setFormProcessing(prodForm, true);
            const payload = {
                date: new Date().toISOString().split('T')[0],
                product,
                prodQty,
                rmItem,
                rmQty,
                user: localStorage.getItem('nexora_session_name') || 'Operator'
            };
            try {
                const result = await apiCall('/api/production', 'POST', payload);
                if (result.success) {
                    prodForm.reset();
                    await loadProductionLedger();
                    showErrorToast('Production logged successfully.');
                } else {
                    const message = result.message || 'Insufficient raw material stock.';
                    showErrorToast(message);
                    throw new Error(message);
                }
            } catch (error) {
                showErrorToast(error.message || 'Unable to log production.');
            } finally {
                setFormProcessing(prodForm, false);
            }
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
