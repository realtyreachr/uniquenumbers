import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// ================== CONFIGURATION ==================
const VERIFY_TOKEN = "RealtyReach@2025";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ================ GOOGLE AUTH INIT ================
let googleAuth;

if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
  const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
  googleAuth = new google.auth.GoogleAuth({
    credentials: JSON.parse(json),
    scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"],
  });
} else {
  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_BASE64 environment variable");
}

const drive = google.drive({ version: "v3", auth: googleAuth });
const sheets = google.sheets({ version: "v4", auth: googleAuth });

// Test auth on startup
(async () => {
  try {
    await googleAuth.getClient();
    console.log("✅ Google Drive Authenticated");
  } catch (error) {
    console.error("❌ Google Drive Auth Error:", error);
    process.exit(1);
  }
})();

// ================== FUNCTIONS ====================
async function createNewSheet(userNumber) {
  try {
    const sheet = await sheets.spreadsheets.create({
      resource: {
        properties: { title: `LeadSheet_${userNumber}` },
      },
      fields: "spreadsheetId",
    });

    const sheetId = sheet.data.spreadsheetId;

    // Make sheet readable by anyone with the link
    await drive.permissions.create({
      fileId: sheetId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const sheetLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    console.log(`✅ Sheet created for ${userNumber}: ${sheetLink}`);
    return sheetLink;
  } catch (err) {
    console.error(`❌ Error creating sheet for ${userNumber}:`, err.message);
    throw err;
  }
}

async function sendWhatsAppReply(toNumber, message) {
  try {
    const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
    const data = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: { body: message },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    console.log(`📤 WhatsApp reply sent to ${toNumber}:`, result);
  } catch (err) {
    console.error(`❌ Error sending WhatsApp message to ${toNumber}:`, err.message);
  }
}

// ================ WEBHOOK VERIFICATION ================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ================ WEBHOOK RECEIVER =================
app.post("/webhook", async (req, res) => {
  console.log("Incoming Webhook: ", JSON.stringify(req.body, null, 2));

  try {
    if (req.body.entry) {
      const changes = req.body.entry[0].changes;
      if (changes && changes[0].value && changes[0].value.messages) {
        const msg = changes[0].value.messages[0];
        const from = msg.from;
        const text = msg.text?.body;
        console.log(`📩 New message from ${from}: ${text}`);

        // Create Google Sheet and send link
        const sheetLink = await createNewSheet(from);
        await sendWhatsAppReply(from, `Hi 👋 Your lead sheet is ready: ${sheetLink}`);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.sendStatus(500);
  }
});

// ================= START SERVER ===================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
