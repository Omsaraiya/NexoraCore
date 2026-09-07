require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Secure Authentication
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const gsapi = google.sheets({ version: 'v4', auth: auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

auth.getClient()
    .then(() => console.log("✅ Securely Connected to Google Sheets API"))
    .catch(err => console.error("❌ Google API Connection Error:", err.message));

async function getNextDocNumber(prefix, range) {
    try {
        const response = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
        const rows = response.data.values || [];
        const count = rows.length === 0 ? 1 : rows.length;
        return `${prefix}/26-27/${count.toString().padStart(4, '0')}`;
    } catch (e) {
        return `${prefix}/26-27/9999`;
    }
}

// ---------------------------------------------------------
// PUBLIC ROUTES
// ---------------------------------------------------------

app.post('/api/login', async (req, res) => {
    try {
        const { empId, passkey } = req.body;
        const response = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Employees!A:E' });
        const rows = response.data.values || [];

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === empId) {
                if (rows[i][4] !== 'Active') return res.status(403).json({ success: false, message: "Account is suspended." });

                // Avoid passing legacy plaintext values to bcrypt.compare().
                const storedPasskey = String(rows[i][3] || '');
                const isLegacy = passkey === storedPasskey;
                const isBcryptHash = /^\$2[aby]?\$\d{2}\$/.test(storedPasskey);
                let validPassword = false;
                if (!isLegacy && isBcryptHash) {
                    try {
                        validPassword = await bcrypt.compare(String(passkey || ''), storedPasskey);
                    } catch (compareError) {
                        validPassword = false;
                    }
                }

                if (validPassword || isLegacy) {
                    const token = jwt.sign({ empId: rows[i][0], role: rows[i][2], name: rows[i][1] }, process.env.JWT_SECRET, { expiresIn: '24h' });
                    return res.json({ success: true, token, role: rows[i][2], name: rows[i][1] });
                }
            }
        }
        return res.status(401).json({ success: false, message: "Invalid ID or Passkey." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during authentication." });
    }
});

// ---------------------------------------------------------
// GLOBAL JWT SECURITY MIDDLEWARE
// ---------------------------------------------------------

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: "Access Denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Invalid or expired token." });
        req.user = user; // Injects verified user data into the request
        next();
    });
}

app.use('/api', authenticateToken); // Locks down EVERY route below this line

// ---------------------------------------------------------
// PROTECTED API ENDPOINTS
// ---------------------------------------------------------

app.get('/api/dashboard', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/employees', async (req, res) => {
    try {
        const { empId, name, role, passkey, status } = req.body;

        // Hash the password before saving to Google Sheets
        const salt = await bcrypt.genSalt(10);
        const hashedKey = await bcrypt.hash(passkey, salt);

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Employees!A:E', valueInputOption: 'USER_ENTERED',
            resource: { values: [[empId, name, role, hashedKey, status]] }
        });
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/employees', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Employees!A2:C' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const { empId } = req.body;
        const dateStr = new Date().toISOString().split('T')[0];
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Attendance!A:C', valueInputOption: 'USER_ENTERED',
            resource: { values: [[dateStr, empId, 'Present']] }
        });
        res.status(201).json({ success: true, message: "Shift logged successfully." });
    } catch (err) { res.status(500).json({ success: false }); }
});

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
            spreadsheetId: SPREADSHEET_ID, range: 'Finance!A:F', valueInputOption: 'USER_ENTERED',
            resource: { values: [[txnId, dateStr, 'Expense', 'Salary', salary, `Auto-Payroll: ${empId} (${role}) | Logged by ${user}`]] }
        });
        res.status(200).json({ success: true, message: `₹${salary.toLocaleString('en-IN')} payroll disbursed for ${empId}.` });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { employee, task, status, date } = req.body;
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A:D', valueInputOption: 'USER_ENTERED',
            resource: { values: [[employee, task, status, date]] }
        });
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.put('/api/tasks/complete', async (req, res) => {
    try {
        const { rowIndex } = req.body;
        const actualRow = rowIndex + 2;
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        await gsapi.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `Sheet1!C${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [['Completed']] } });
        await gsapi.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `Sheet1!E${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [[timestamp]] } });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.put('/api/tasks/qa', async (req, res) => {
    try {
        const { rowIndex, qaStatus } = req.body;
        const actualRow = rowIndex + 2;
        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Sheet1!F${actualRow}`, valueInputOption: 'USER_ENTERED', resource: { values: [[qaStatus]] }
        });
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A2:E' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const { name, category, stock, reorderLevel } = req.body;
        const quantity = Number(stock);
        const minimumStock = Number(reorderLevel);

        if (!name || !category || !Number.isFinite(quantity) || !Number.isFinite(minimumStock) || quantity < 0 || minimumStock < 0) {
            return res.status(400).json({ success: false, message: 'Provide valid item details and non-negative quantities.' });
        }

        const itemId = await getNextDocNumber('RM', 'Inventory!A:A');
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E', valueInputOption: 'USER_ENTERED',
            resource: { values: [[itemId, name.trim(), category.trim(), quantity, minimumStock]] }
        });
        res.status(201).json({ success: true, itemId });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/supply', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Supply!A2:H' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/supply', async (req, res) => {
    try {
        const { date, type, partner, item, qty, value, status, user } = req.body;
        let prefix = type.includes('Purchase') ? 'PO' : 'SO';
        const docId = await getNextDocNumber(prefix, 'Supply!A:A');
        const auditLog = `Logged by ${user || 'Unknown'}`;

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Supply!A:I', valueInputOption: 'USER_ENTERED',
            resource: { values: [[docId, date, type, partner, item, qty, value, status, auditLog]] }
        });

        const financeType = type.includes('Purchase') ? 'Expense' : 'Income';
        const financeCategory = type.includes('Purchase') ? 'Supplier Payout' : 'Client Revenue';
        const financeDesc = `Auto-Synced ${docId}: ${qty}x ${item} (${partner})`;

        const invId = await getNextDocNumber('INV', 'Finance!A:A');
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Finance!A:F', valueInputOption: 'USER_ENTERED',
            resource: { values: [[invId, date, financeType, financeCategory, value, financeDesc]] }
        });
        res.status(201).json({ success: true, docId });
    } catch (error) { res.status(500).json({ success: false }); }
});

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
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/qc/process', async (req, res) => {
    try {
        const { rowIndex, poRef, item, qty, status, inspector, remarks } = req.body;
        const dateStr = new Date().toISOString().split('T')[0];
        const qcId = await getNextDocNumber('QC', 'Quality!A:A');

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Quality!A:H', valueInputOption: 'USER_ENTERED',
            resource: { values: [[qcId, dateStr, poRef, item, qty, status, inspector, remarks]] }
        });

        await gsapi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID, range: `Supply!H${rowIndex}`, valueInputOption: 'USER_ENTERED',
            resource: { values: [['QC Processed']] }
        });

        if (status === 'Passed') {
            const invId = 'RM-' + Math.floor(1000 + Math.random() * 9000);
            await gsapi.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E', valueInputOption: 'USER_ENTERED',
                resource: { values: [[invId, item, 'Raw Material', qty, 50]] }
            });
        }
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/production', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Production!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/production', async (req, res) => {
    try {
        const { date, product, prodQty, rmItem, rmQty, user } = req.body;
        const prodId = await getNextDocNumber('PRD', 'Production!A:A');

        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Production!A:F', valueInputOption: 'USER_ENTERED',
            resource: { values: [[prodId, date, product, prodQty, user, 'Completed']] }
        });

        const invResp = await gsapi.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E' });
        const invRows = invResp.data.values || [];
        let fgUpdated = false;

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

        if (!fgUpdated) {
            const invId = 'FG-' + Math.floor(1000 + Math.random() * 9000);
            await gsapi.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:E', valueInputOption: 'USER_ENTERED',
                resource: { values: [[invId, product, 'Finished Good', prodQty, 100]] }
            });
        }
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/finance', async (req, res) => {
    try {
        const opt = { spreadsheetId: SPREADSHEET_ID, range: 'Finance!A2:F' };
        let data = await gsapi.spreadsheets.values.get(opt);
        res.status(200).json({ success: true, data: data.data.values || [] });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/finance', async (req, res) => {
    try {
        const { txnId, date, type, category, amount, description } = req.body;
        await gsapi.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: 'Finance!A:F', valueInputOption: 'USER_ENTERED',
            resource: { values: [[txnId, date, type, category, amount, description]] }
        });
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));