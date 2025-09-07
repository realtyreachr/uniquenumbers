import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// CONFIGURATION
const VERIFY_TOKEN = "RealtyReach@2025";   
const WHATSAPP_TOKEN = "EAAPrwJa32VMBPdGkspXMFAF7PY0ewti2ACOIOiD176cS74dUMfpZASTs1FzDK1exDCXLvpppYYBotfEbkKEm2LSIHbNmcEDyzshT6nCW7pTZAneI0cA4UnSKx94SSZBQorZCCIZAn1jMaY7q1vLOCaI8ZCtuA3Cvqq32NnZAZADJqxW9iIwcIizAmEGHeNX1cRZCTBcelxXklHaUDJA5GQsg1YOAvy7dCBfByJoFj4GpurAZDZD";  
const PHONE_NUMBER_ID = "782266531631708"; 
const TEMPLATE_SHEET_ID = "https://docs.google.com/spreadsheets/d/103pEGY7WjmIVDaV38-24_3wcMXFkcisTaf-41aTTm6g/edit"; 
const SERVICE_ACCOUNT_FILE = "service_account.json"; 

// Google API Auth
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

// FUNCTIONS
async function createNewSheet(userNumber) {
  const copyTitle = `Leads_${userNumber}`;
  const copiedFile = await drive.files.copy({
    fileId: TEMPLATE_SHEET_ID,
    requestBody: { name: copyTitle },
  });

  const fileId = copiedFile.data.id;
  await drive.permissions.create({
    fileId: fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

async function sendWhatsAppReply(toNumber, message) {
  const url = `https://graph.facebook.com/v23.0/782266531631708/messages`;
  const data = {
    messaging_product: "whatsapp",
    to: toNumber,
    type: "text",
    text: { body: message },
  };

  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
// Remove any `require()` statements
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // agar WhatsApp API call use karoge

const app = express();
app.use(bodyParser.json());

// Webhook verification
app.get("/webhook", (req, res) => {
  const verify_token = "my_verify_token";

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("Webhook verified!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Webhook receiver
app.post("/webhook", (req, res) => {
  console.log("Incoming Webhook: ", JSON.stringify(req.body, null, 2));

  if (req.body.entry) {
    let changes = req.body.entry[0].changes;
    if (changes && changes[0].value && changes[0].value.messages) {
      let msg = changes[0].value.messages[0];
      let from = msg.from;
      let text = msg.text?.body;

      console.log(`📩 New message from ${from}: ${text}`);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));












