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
app.post('/api/supply', async (req, res) => {
    try {
        const { date, type, item, qty, value, user } = req.body;

        // --- PILLAR #3: STRICT DATA VALIDATION ---
        if (!item || item.trim() === '') return res.status(400).json({ success: false, message: "Item name cannot be empty." });
        if (qty <= 0) return res.status(400).json({ success: false, message: "Quantity must be greater than zero." });
        if (value < 0) return res.status(400).json({ success: false, message: "Value cannot be negative." });

        const auditLog = `Logged by ${user || 'Unknown User'}`;

        // ACTION 1: Save to Supply Ledger
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Supply!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[date, type, item, qty, value, auditLog]] }
        });

        // ACTION 2: Auto-Sync to Financial Core
        // Logic: Purchase = Expense (Money lost), Sale = Income (Money gained)
        const financeType = type === 'Purchase' ? 'Expense' : 'Income';
        const financeCategory = type === 'Purchase' ? 'Raw Materials' : 'Product Sales';
        const financeDesc = `Auto-Synced from Supply: ${qty}x ${item}`;
        const txnId = 'AUTO-' + Math.floor(100000 + Math.random() * 900000);

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Finance!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[txnId, date, financeType, financeCategory, value, financeDesc]] }
        });

        res.status(201).json({ success: true });
    } catch (error) {
        console.error("❌ API Add Supply Error:", error.message);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));