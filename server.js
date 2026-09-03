const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const gsapi = google.sheets({ version: 'v4', auth: auth });

auth.getClient()
    .then(() => console.log("✅ Securely Connected to Google Sheets API"))
    .catch(err => console.error("❌ Google API Connection Error:", err.message));

const SPREADSHEET_ID = '1f2ZFLwR53j78eiYJiyfJS49V58RIycUIHlxDhL7XmmQ';

app.get('/api/dashboard', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        console.error("❌ API Dashboard Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data" });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { employee, task, status, date } = req.body;
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[employee, task, status, date]] }
        });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("❌ API Add Task Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.put('/api/tasks/complete', async (req, res) => {
    try {
        const { rowIndex } = req.body;
        const actualRow = rowIndex + 2;
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Sheet1!C${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [['Completed']] }
        });
        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Sheet1!E${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [[timestamp]] }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ API Complete Task Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Employees!A2:C' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        console.error("❌ API Fetch Employees Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.put('/api/tasks/qa', async (req, res) => {
    try {
        const { rowIndex, qaStatus } = req.body;
        const actualRow = rowIndex + 2;
        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Sheet1!F${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [[qaStatus]] }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ API QA Update Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A2:E' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        console.error("❌ API Fetch Inventory Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.get('/api/finance', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Finance!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        console.error("❌ API Fetch Finance Error:", error.message);
        res.status(500).json({ success: false });
    }
});

app.post('/api/finance', async (req, res) => {
    try {
        const { txnId, date, type, category, amount, description } = req.body;
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Finance!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[txnId, date, type, category, amount, description]] }
        });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("❌ API Add Transaction Error:", error.message);
        res.status(500).json({ success: false });
    }
});

// 9. Add New Employee (HR Provisioning)
app.post('/api/employees', async (req, res) => {
    try {
        const { empId, name, role, passkey, status } = req.body;
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Employees!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[empId, name, role, passkey, status]] }
        });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("❌ API HR Provisioning Error:", error.message);
        res.status(500).json({ success: false });
    }
});

// 10. Dynamic Login Authentication
app.post('/api/login', async (req, res) => {
    try {
        const { empId, passkey } = req.body;

        const response = await gsapi.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Employees!A:E'
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(401).json({ success: false, message: "No active users found." });
        }

        for (let i = 1; i < rows.length; i++) {
            const dbId = rows[i][0];
            const dbRole = rows[i][2];
            const dbKey = rows[i][3];
            const dbStatus = rows[i][4];

            if (dbId === empId && dbKey === passkey) {
                if (dbStatus !== 'Active') {
                    return res.status(403).json({ success: false, message: "Account is suspended." });
                }

                return res.json({ success: true, role: dbRole, name: rows[i][1] });
            }
        }

        return res.status(401).json({ success: false, message: "Invalid ID or Passkey." });

    } catch (error) {
        console.error("❌ Login API Error:", error.message);
        res.status(500).json({ success: false, message: "Server error during authentication." });
    }
});

// 11. Fetch Supply Chain Ledger
app.get('/api/supply', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Supply!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        console.error("❌ API Fetch Supply Error:", error.message);
        res.status(500).json({ success: false });
    }
});

// 12. Add Supply Chain Event (Strict Validation & Cross-Module Automation)
// --- ENTERPRISE FY 26-27 DOCUMENT NUMBERING ENGINE ---
async function getNextDocNumber(prefix, range) {
    try {
        const response = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
        const rows = response.data.values || [];
        const count = rows.length === 0 ? 1 : rows.length;
        const paddedSequence = count.toString().padStart(4, '0');
        return `${prefix}/26-27/${paddedSequence}`;
    } catch (e) {
        return `${prefix}/26-27/9999`;
    }
}

// 12. Add Supply Chain Event (O2C Pipeline & Validation)
app.post('/api/supply', async (req, res) => {
    try {
        const { date, type, partner, item, qty, value, status, user } = req.body;

        if (!item || item.trim() === '') return res.status(400).json({ success: false, message: "Item name cannot be empty." });
        if (qty <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than zero." });
        if (value < 0) return res.status(400).json({ success: false, message: "Value cannot be negative." });

        let prefix = type.includes('Purchase') ? 'PO' : 'SO';
        const docId = await getNextDocNumber(prefix, 'Supply!A:A');
        const auditLog = `Logged by ${user || 'Unknown'}`;

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Supply!A:I',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[docId, date, type, partner, item, qty, value, status, auditLog]] }
        });

        const financeType = type.includes('Purchase') ? 'Expense' : 'Income';
        const financeCategory = type.includes('Purchase') ? 'Supplier Payout' : 'Client Revenue';
        const financeDesc = `Auto-Synced ${docId}: ${qty}x ${item} (${partner})`;

        const invId = await getNextDocNumber('INV', 'Finance!A:A');

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Finance!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[invId, date, financeType, financeCategory, value, financeDesc]] }
        });

        res.status(201).json({ success: true, docId });
    } catch (error) {
        console.error("❌ API Add Supply Error:", error.message);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 13. Log Attendance
app.post('/api/attendance', async (req, res) => {
    try {
        const { empId } = req.body;
        const dateStr = new Date().toISOString().split('T')[0];

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Attendance!A:C',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[dateStr, empId, 'Present']] }
        });
        res.status(201).json({ success: true, message: "Shift logged successfully." });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 14. Run Payroll (Cross-Module Sync to Finance)
app.post('/api/payroll', async (req, res) => {
    try {
        const { empId, user } = req.body;
        const empResponse = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Employees!A:E' });
        const employee = (empResponse.data.values || []).find(row => row[0] === empId);

        if (!employee) return res.status(404).json({ success: false, message: "Employee not found." });

        const role = employee[2];
        const salary = role === 'MD' ? 150000 : (role === 'Manager' ? 70000 : 25000);
        const txnId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
        const dateStr = new Date().toISOString().split('T')[0];

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Finance!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[txnId, dateStr, 'Expense', 'Salary', salary, `Auto-Payroll: ${empId} (${role}) | Logged by ${user}`]] }
        });
        res.status(200).json({ success: true, message: `₹${salary.toLocaleString('en-IN')} payroll disbursed for ${empId}.` });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 15. Fetch Pending QC (Intercepts Supply Purchases)
app.get('/api/qc/pending', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Supply!A2:I' };
        let data = await gsapi.spreadsheets.values.get(opt);
        const pending = [];
        (data.data.values || []).forEach((row, index) => {
            if (row[2] && row[2].includes('Purchase') && row[7] === 'Pending') {
                pending.push({ rowIndex: index + 2, data: row });
            }
        });
        res.status(200).json({ success: true, data: pending });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 16. Process Quality Disposition
app.post('/api/qc/process', async (req, res) => {
    try {
        const { rowIndex, poRef, item, qty, status, inspector, remarks } = req.body;
        const dateStr = new Date().toISOString().split('T')[0];
        const qcId = await getNextDocNumber('QC', 'Quality!A:A');

        // 1. Log to NCR/CAPA Quality Ledger
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Quality!A:H', valueInputOption: 'USER_ENTERED',
            resource: { values: [[qcId, dateStr, poRef, item, qty, status, inspector, remarks]] }
        });

        // 2. Clear from Supply Queue
        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Supply!H${rowIndex}`, valueInputOption: 'USER_ENTERED',
            resource: { values: [['QC Processed']] }
        });

        // 3. Push to Live Inventory if Passed
        if (status === 'Passed') {
            const invId = 'RM-' + Math.floor(1000 + Math.random() * 9000);
            await gsapi.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E', valueInputOption: 'USER_ENTERED',
                resource: { values: [[invId, item, 'Raw Material', qty, 50]] } // Default reorder threshold: 50
            });
        }
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 17. Fetch Production Logs
app.get('/api/production', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Production!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 18. Process Manufacturing Run (Inventory Math)
app.post('/api/production', async (req, res) => {
    try {
        const { date, product, prodQty, rmItem, rmQty, user } = req.body;
        const prodId = await getNextDocNumber('PRD', 'Production!A:A');

        // 1. Log the Production Run
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Production!A:F', valueInputOption: 'USER_ENTERED',
            resource: { values: [[prodId, date, product, prodQty, user, 'Completed']] }
        });

        // 2. Fetch Current Inventory for Adjustments
        const invResp = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E' });
        const invRows = invResp.data.values || [];
        let fgUpdated = false;

        // 3. Deduct RM & Add FG
        for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][1] === rmItem) {
                const newRmQty = parseInt(invRows[i][3]) - parseInt(rmQty);
                await gsapi.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID, range: `Inventory!D${i + 1}`, valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newRmQty]] }
                });
            }
            if (invRows[i][1] === product) {
                const newFgQty = parseInt(invRows[i][3] || 0) + parseInt(prodQty);
                await gsapi.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID, range: `Inventory!D${i + 1}`, valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newFgQty]] }
                });
                fgUpdated = true;
            }
        }

        // 4. If Finished Good doesn't exist yet, create it
        if (!fgUpdated) {
            const invId = 'FG-' + Math.floor(1000 + Math.random() * 9000);
            await gsapi.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E', valueInputOption: 'USER_ENTERED',
                resource: { values: [[invId, product, 'Finished Good', prodQty, 100]] }
            });
        }
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));