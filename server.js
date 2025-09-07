import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { google } from "googleapis";
import path from "path";

const app = express();
app.use(bodyParser.json());

// ===================== CONFIGURATION =====================
const VERIFY_TOKEN = "RealtyReach@2025";   
const WHATSAPP_TOKEN = "EAAPrwJa32VMBPdGkspXMFAF7PY0ewti2ACOIOiD176cS74dUMfpZASTs1FzDK1exDCXLvpppYYBotfEbkKEm2LSIHbNmcEDyzshT6nCW7pTZAneI0cA4UnSKx94SSZBQorZCCIZAn1jMaY7q1vLOCaI8ZCtuA3Cvqq32NnZAZADJqxW9iIwcIizAmEGHeNX1cRZCTBcelxXklHaUDJA5GQsg1YOAvy7dCBfByJoFj4GpurAZDZD";   
const PHONE_NUMBER_ID = "782266531631708";  
const TEMPLATE_SHEET_ID = "103pEGY7WjmIVDaV38-24_3wcMXFkcisTaf-41aTTm6g";  

// Absolute path for service account (Render safe)
const SERVICE_ACCOUNT_FILE = path.resolve("./service_account.json");

// ===================== GOOGLE DRIVE AUTH =====================
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

// Test auth
auth.getClient()
  .then(() => console.log("✅ Google Drive Authenticated"))
  .catch(err => console.error("❌ Google Drive Auth Error:", err));

// ===================== FUNCTIONS =====================
async function createNewSheet(userNumber) {
  try {
    const copyTitle = `Leads_${userNumber}`;
    const copiedFile = await drive.files.copy({
      fileId: TEMPLATE_SHEET_ID,
      requestBody: { name: copyTitle },
    });

    const fileId = copiedFile.data.id;

    // Give anyone with the link read access
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const sheetLink = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
    console.log(`✅ Sheet created for ${userNumber}: ${sheetLink}`);
    return sheetLink;
  } catch (err) {
    console.error(`❌ Error creating sheet for ${userNumber}:`, err.message);
    throw err;
  }
}

async function sendWhatsAppReply(toNumber, message) {
  try {
    const url = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`; 
    const data = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: { body: message },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
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

// ===================== WEBHOOK VERIFICATION =====================
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===================== WEBHOOK RECEIVER =====================
app.post("/webhook", async (req, res) => {
  console.log("Incoming Webhook: ", JSON.stringify(req.body, null, 2));

  try {
    if (req.body.entry) {
      let changes = req.body.entry[0].changes;
      if (changes && changes[0].value && changes[0].value.messages) {
        let msg = changes[0].value.messages[0];
        let from = msg.from;
        let text = msg.text?.body;
        console.log(`📩 New message from ${from}: ${text}`);

        // Create Google Sheet and send link to WhatsApp
        const sheetLink = await createNewSheet(from);
        await sendWhatsAppReply(from, `Hi! Your lead sheet is ready: ${sheetLink}`);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
    res.sendStatus(500);
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
