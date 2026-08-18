const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API Server running on http://localhost:${PORT}`));