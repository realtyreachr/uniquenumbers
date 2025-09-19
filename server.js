// server.js

import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// =============== CONFIGURATION ===============
const VERIFY_TOKEN = "RealtyReach@2025";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// =============== DEBUG ENDPOINT ===============
app.get("/debug-config", (req, res) => {
  res.json({
    whatsapp_token: WHATSAPP_TOKEN ? "✅ Present" : "❌ Missing",
    phone_number_id: PHONE_NUMBER_ID ? "✅ Present" : "❌ Missing",
    verify_token: VERIFY_TOKEN,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// =============== HELPER FUNCTIONS ===============
function generateAutoReply(userMessage) {
  const lower = userMessage.toLowerCase();
  const hour = new Date().getHours();
  let greet = "Hello";
  if (hour < 12) greet = "Good Morning";
  else if (hour < 17) greet = "Good Afternoon";
  else greet = "Good Evening";

  const business = hour >= 9 && hour <= 18;
  if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
    return `${greet}! Thanks for contacting RealtyReach. ${!business ? "⏰ We're currently outside 9–6 business hours." : ""}`;
  }
  if (lower.includes("property") || lower.includes("real estate")) {
    return `🏠 Property inquiry noted. ${greet}! Our experts will reach out soon.`;
  }
  if (lower.includes("rent") || lower.includes("rental")) {
    return `🏡 Rental inquiry noted. ${greet}! We’ll call you within 2 hours.`;
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("budget")) {
    return `💰 Pricing info requested. ${greet}! Our sales team will share rates shortly.`;
  }
  if (lower.includes("location") || lower.includes("where")) {
    return `📍 Location inquiry noted. ${greet}! We'll send area details soon.`;
  }
  if (lower.includes("help") || lower.includes("support")) {
    return `🤝 Support is on the way. ${greet}! Our team will assist you shortly.`;
  }
  if (lower.includes("thank")) {
    return `😊 You’re welcome! Happy to help.`;
  }
  return `${greet}! Welcome to RealtyReach. How can we assist you today?`;
}

async function sendWhatsAppReply(to, message) {
  const url = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
}

// ============= WEBHOOK VERIFICATION ============
app.get("/webhook", (req, res) => {
  console.log("🔍 Incoming GET /webhook", req.query);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Verified");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verification failed", { mode, token });
    res.sendStatus(403);
  }
});

// ============= WEBHOOK RECEIVER ==============
app.post("/webhook", async (req, res) => {
  console.log("📩 Incoming POST /webhook", JSON.stringify(req.body));
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (message) {
      const from = message.from;
      const text = message.text?.body || "";
      const reply = generateAutoReply(text);
      await sendWhatsAppReply(from, reply);
      console.log("📤 Replied to", from);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Processing error", e.message);
    res.sendStatus(500);
  }
});

// =============== HEALTH CHECK ===============
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ============== START SERVER ================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
  console.log("📋 Config:", {
    verify_token: VERIFY_TOKEN,
    whatsapp_token: WHATSAPP_TOKEN ? "✅" : "❌",
    phone_number_id: PHONE_NUMBER_ID ? "✅" : "❌"
  });
});
