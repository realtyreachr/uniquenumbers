import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// ================== CONFIGURATION ==================
const VERIFY_TOKEN = "RealtyReach@2025";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

console.log("🚀 WhatsApp Auto Reply Server Starting...");
console.log("📞 Phone Number ID:", PHONE_NUMBER_ID ? "✅ Set" : "❌ Missing");
console.log("🔑 WhatsApp Token:", WHATSAPP_TOKEN ? "✅ Set" : "❌ Missing");

// ================== HELPER FUNCTIONS ====================

// Enhanced auto reply logic
function generateAutoReply(userMessage, userNumber) {
  const lowerMessage = userMessage.toLowerCase();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  
  // Time-based greetings
  let greeting = "Hello";
  if (currentHour < 12) greeting = "Good Morning";
  else if (currentHour < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";
  
  // Business hours check
  const isBusinessHours = currentHour >= 9 && currentHour <= 18;
  
  // Keyword-based responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `${greeting} 👋! Welcome to RealtyReach!\n\nThank you for contacting us. Our team will get back to you soon.\n\n${!isBusinessHours ? '⏰ We are currently outside business hours (9 AM - 6 PM). We will respond during business hours.' : ''}`;
    
  } else if (lowerMessage.includes('property') || lowerMessage.includes('real estate') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
    return `🏠 **Property Inquiry Received**\n\n${greeting}! Thank you for your interest in real estate services.\n\nOur property experts will contact you shortly with:\n• Available properties\n• Market insights\n• Best deals in your area\n\n📞 For immediate assistance: Call us directly!`;
    
  } else if (lowerMessage.includes('rent') || lowerMessage.includes('rental')) {
    return `🏡 **Rental Inquiry Received**\n\n${greeting}! Looking for rental properties?\n\nOur rental specialists will help you with:\n• Verified rental listings\n• Best rental deals\n• Documentation assistance\n\nWe'll contact you within 2 hours! 🕐`;
    
  } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    return `💰 **Pricing Information**\n\n${greeting}! For detailed pricing and cost information:\n\n• Our sales team will call you with current rates\n• We offer competitive market prices\n• Special discounts available for serious buyers\n\n📊 Get personalized pricing based on your requirements!`;
    
  } else if (lowerMessage.includes('location') || lowerMessage.includes('area') || lowerMessage.includes('where')) {
    return `📍 **Location Inquiry**\n\n${greeting}! We serve multiple prime locations:\n\n🌟 Popular Areas:\n• Commercial districts\n• Residential complexes\n• Upcoming development zones\n\nOur location expert will share detailed area information with you!`;
    
  } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return `😊 You're most welcome!\n\nWe're here to help you find the perfect property solution. Feel free to ask any questions!\n\n🤝 RealtyReach - Your trusted real estate partner`;
    
  } else if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('assistance')) {
    return `🤝 **Customer Support**\n\n${greeting}! We're here to help you with:\n\n✅ Property buying/selling\n✅ Rental services\n✅ Legal documentation\n✅ Market analysis\n✅ Investment guidance\n\nOur support team will assist you shortly!`;
    
  } else if (lowerMessage.includes('urgent') || lowerMessage.includes('immediate') || lowerMessage.includes('asap')) {
    return `🚨 **Urgent Request Noted**\n\n${greeting}! We understand this is urgent.\n\nPriority response initiated! 📞\nOur senior consultant will call you within 30 minutes.\n\nFor immediate assistance: Call our hotline directly!`;
    
  } else if (lowerMessage.includes('visit') || lowerMessage.includes('viewing') || lowerMessage.includes('inspection')) {
    return `🏠 **Property Viewing Request**\n\n${greeting}! Ready for property viewing?\n\nOur viewing coordinator will:\n• Schedule convenient timing\n• Arrange guided tours\n• Provide detailed property information\n\n📅 Available slots: Monday to Saturday, 10 AM - 6 PM`;
    
  } else if (lowerMessage.includes('loan') || lowerMessage.includes('mortgage') || lowerMessage.includes('finance')) {
    return `🏦 **Loan & Finance Assistance**\n\n${greeting}! Need financing help?\n\nOur finance partners offer:\n• Home loans at best rates\n• Quick approval process\n• Minimal documentation\n• Expert guidance\n\nFinance consultant will contact you soon! 💳`;
    
  } else {
    return `${greeting}! 🌟 Welcome to **RealtyReach**\n\nThank you for reaching out to us!\n\n🏢 **Our Services:**\n• Property Buying & Selling\n• Rental Services\n• Investment Consultation\n• Legal Documentation\n\n👥 Our expert team will contact you shortly to discuss your requirements.\n\n${!isBusinessHours ? '\n⏰ **Note:** We are currently outside business hours (9 AM - 6 PM). We will respond first thing during business hours!' : '\n⚡ **Quick Response:** Expect our call within 1 hour!'}`;
  }
}

// Function to send WhatsApp messages
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
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const result = await res.json();
    console.log(`📤 WhatsApp reply sent successfully to ${toNumber}`);
    return result;
    
  } catch (err) {
    console.error(`❌ Error sending WhatsApp message to ${toNumber}:`, err.message);
    throw err;
  }
}

// Store user interactions (in-memory for now)
const userInteractions = {};

function logUserInteraction(userNumber, message) {
  if (!userInteractions[userNumber]) {
    userInteractions[userNumber] = [];
  }
  
  userInteractions[userNumber].push({
    message: message,
    timestamp: new Date().toISOString(),
    replied: true
  });
  
  console.log(`📊 User interaction logged for ${userNumber}`);
}

// ================ WEBHOOK VERIFICATION ================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Webhook verification attempt:", { 
    mode, 
    token: token ? "Present" : "Missing",
    challenge: challenge ? "Present" : "Missing"
  });

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    console.log("Expected token:", VERIFY_TOKEN);
    console.log("Received token:", token);
    res.sendStatus(403);
  }
});

// ================ WEBHOOK RECEIVER =================
app.post("/webhook", async (req, res) => {
  console.log("📨 Incoming Webhook Data:", JSON.stringify(req.body, null, 2));
  
  try {
    if (req.body.entry && req.body.entry.length > 0) {
      for (const entry of req.body.entry) {
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages && change.value.messages.length > 0) {
              for (const msg of change.value.messages) {
                const from = msg.from;
                const text = msg.text?.body || "No text content";
                const messageId = msg.id;
                const messageType = msg.type || "text";
                
                console.log(`📩 Processing ${messageType} message from ${from}: "${text}" (ID: ${messageId})`);
                
                try {
                  // Generate and send auto reply
                  const autoReply = generateAutoReply(text, from);
                  await sendWhatsAppReply(from, autoReply);
                  
                  // Log interaction
                  logUserInteraction(from, text);
                  
                  console.log(`✅ Successfully processed message from ${from}`);
                  
                } catch (processingError) {
                  console.error(`❌ Error processing message from ${from}:`, processingError.message);
                  
                  // Send error message to user
                  const errorMessage = `Sorry! There was a technical issue. Our team has been notified and will contact you shortly. 🛠️\n\nFor immediate assistance, please call us directly!`;
                  try {
                    await sendWhatsAppReply(from, errorMessage);
                  } catch (replyError) {
                    console.error(`❌ Failed to send error message to ${from}:`, replyError.message);
                  }
                }
              }
            }
          }
        }
      }
    } else {
      console.log("📨 Webhook received but no messages to process");
    }
    
    res.status(200).send("EVENT_RECEIVED");
    
  } catch (err) {
    console.error("❌ Critical webhook processing error:", err.message);
    res.status(500).send("INTERNAL_SERVER_ERROR");
  }
});

// ================ HEALTH CHECK & INFO ROUTES =================
app.get("/", (req, res) => {
  const totalUsers = Object.keys(userInteractions).length;
  const totalMessages = Object.values(userInteractions).reduce((total, user) => total + user.length, 0);
  
  const status = {
    status: "🚀 RealtyReach WhatsApp Auto Reply Bot - Running Successfully!",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    environment: {
      whatsapp_token: WHATSAPP_TOKEN ? "✅ Configured" : "❌ Missing",
      phone_number_id: PHONE_NUMBER_ID ? "✅ Configured" : "❌ Missing",
      node_version: process.version,
    },
    statistics: {
      total_users_interacted: totalUsers,
      total_messages_processed: totalMessages,
    },
    endpoints: {
      webhook_verification: "GET /webhook",
      webhook_receiver: "POST /webhook", 
      health_check: "GET /health",
      user_stats: "GET /stats"
    },
    features: [
      "✅ Time-based greetings",
      "✅ Keyword-based responses", 
      "✅ Business hours awareness",
      "✅ Property inquiry handling",
      "✅ Customer support automation",
      "✅ Error handling & recovery"
    ]
  };
  
  res.json(status);
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get("/stats", (req, res) => {
  const stats = {
    total_users: Object.keys(userInteractions).length,
    total_messages: Object.values(userInteractions).reduce((total, user) => total + user.length, 0),
    recent_interactions: Object.entries(userInteractions)
      .map(([user, messages]) => ({
        user: user,
        last_message: messages[messages.length - 1]?.message || "No messages",
        last_interaction: messages[messages.length - 1]?.timestamp || "Never",
        total_messages: messages.length
      }))
      .sort((a, b) => new Date(b.last_interaction) - new Date(a.last_interaction))
      .slice(0, 10) // Show last 10 users
  };
  
  res.json(stats);
});

// Test endpoint to send manual message
app.post("/send-test-message", async (req, res) => {
  const { to, message } = req.body;
  
  if (!to || !message) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["to", "message"]
    });
  }
  
  try {
    await sendWhatsAppReply(to, message);
    res.json({
      success: true,
      message: "Test message sent successfully",
      to: to
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================= ERROR HANDLING ===================
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong!",
    timestamp: new Date().toISOString()
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    available_routes: [
      "GET /",
      "GET /webhook", 
      "POST /webhook",
      "GET /health",
      "GET /stats",
      "POST /send-test-message"
    ]
  });
});

// ================= START SERVER ===================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(`🚀 RealtyReach WhatsApp Auto Reply Bot Started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  console.log("📋 Configuration Status:");
  console.log(`   WhatsApp Token: ${WHATSAPP_TOKEN ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   Phone Number ID: ${PHONE_NUMBER_ID ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   Verify Token: ${VERIFY_TOKEN ? '✅ Ready' : '❌ Missing'}`);
  console.log("=".repeat(60));
  console.log("🎯 Bot Features Enabled:");
  console.log("   ✅ Smart Auto Replies");
  console.log("   ✅ Time-based Greetings");
  console.log("   ✅ Business Hours Awareness");
  console.log("   ✅ Property Query Handling");
  console.log("   ✅ Customer Support Automation");
  console.log("   ✅ Error Recovery");
  console.log("=".repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;

