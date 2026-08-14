const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const gsapi = google.sheets({ version: 'v4', auth: auth });

async function checkConnection() {
    try {
        console.log("⏳ Trying to connect to Google Cloud...");

        const opt = {
            spreadsheetId: '1f2ZFLwR53j78eiYJiyfJS49V58RIycUIHlxDhL7XmmQ',
            range: 'Sheet1!A1:D5'
        };

        let data = await gsapi.spreadsheets.values.get(opt);

        console.log("✅ SUCCESS! Authentication Verified.");
        console.log("✅ Connected to NexoraCore_Database.");
        console.log("Data from sheet:", data.data.values || "Sheet is empty, but connection is perfect!");

    } catch (error) {
        console.log("❌ ERROR! Connection failed.");
        console.log("Error Details:", error.message);
    }
}

checkConnection();