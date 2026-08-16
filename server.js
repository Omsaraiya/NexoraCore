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

app.listen(PORT, () => {
    console.log(`🚀 NexoraCore API Server running on http://localhost:${PORT}`);
});