import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TEMPLATE_SHEET_ID = process.env.TEMPLATE_SHEET_ID;

const SERVICE_ACCOUNT_FILE = "./service_account.json"; // Render me Secret File ka naam

// ✅ Google Auth
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"],
});
const drive = google.drive({ version: "v3", auth });

// ✅ Create new sheet
async function createNewSheet(phone) {
  try {
    const copy = await drive.files.copy({
      fileId: TEMPLATE_SHEET_ID,
      requestBody: { name: `Leads_${phone}` },
    });

    const fileId = copy.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  } catch (err) {
    console.error("❌ Error creating sheet:", err.message);
    return null;
  }
}

// ✅ Send WhatsApp reply
async function sendWhatsAppReply(to, message) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: message },
    }),
  });

  const data = await res.json();
  console.log("📤 WhatsApp API Response:", data);
}

// ✅ Webhook Verify
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Webhook Receiver
app.post("/webhook", async (req, res) => {
  try {
    if (req.body.entry && req.body.entry[0].changes[0].value.messages) {
      const msg = req.body.entry[0].changes[0].value.messages[0];
      const from = msg.from;
      const text = msg.text?.body;

      console.log(`📩 New message from ${from}: ${text}`);

      const sheetLink = await createNewSheet(from);
      if (sheetLink) {
        await sendWhatsAppReply(from, `Hi! Your lead sheet is ready: ${sheetLink}`);
      } else {
        await sendWhatsAppReply(from, "❌ Sorry, Google Sheet banane me problem aayi.");
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    res.sendStatus(500);
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
