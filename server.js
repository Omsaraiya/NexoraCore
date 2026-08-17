const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const gsapi = google.sheets({ version: 'v4', auth: auth });
const SPREADSHEET_ID = '1f2ZFLwR53j78eiYJiyfJS49V58RIycUIHlxDhL7XmmQ';


app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const opt = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A2:D'
        };

        let data = await gsapi.spreadsheets.values.get(opt);

        res.status(200).json({
            success: true,
            message: "Data fetched securely",
            data: data.data.values || []
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch data from database" });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { employee, task, status, date } = req.body;

        if (!employee || !task || !date) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const opt = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:D',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[employee, task, status || 'Pending', date]]
            }
        };

        await gsapi.spreadsheets.values.append(opt);

        res.status(201).json({ success: true, message: "Task assigned successfully" });

    } catch (error) {
        console.error("API Write Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to save task to database" });
    }
});

app.put('/api/tasks/complete', async (req, res) => {
    try {
        const { rowIndex } = req.body;

        if (rowIndex === undefined) {
            return res.status(400).json({ success: false, error: "Row index required" });
        }


        const actualSheetRow = rowIndex + 2;

        const opt = {
            spreadsheetId: SPREADSHEET_ID,
            range: `Sheet1!C${actualSheetRow}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Completed']] }
        };

        await gsapi.spreadsheets.values.update(opt);

        res.status(200).json({ success: true, message: "Task marked as Completed!" });

    } catch (error) {
        console.error("API Update Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update task" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 NexoraCore API Server running on http://localhost:${PORT}`);
});