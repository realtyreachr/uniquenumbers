const express = require('express');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json());

// Environment Variables
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'RealtyReach@2025';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Validate environment variables
if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
  console.error('❌ Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID environment variables');
  process.exit(1);
}

console.log('📋 Config loaded:', {
  verify_token: VERIFY_TOKEN,
  whatsapp_token: WHATSAPP_TOKEN ? '✅' : '❌',
  phone_number_id: PHONE_NUMBER_ID ? '✅' : '❌'
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WhatsApp Webhook Server Running',
    status: 'active',
    endpoints: ['/webhook', '/health']
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Incoming GET /webhook', {
    'hub.mode': mode,
    'hub.verify_token': token,
    'hub.challenge': challenge
  });

  // Handle health checks or empty requests
  if (!mode && !token && !challenge) {
    return res.status(200).json({ status: 'webhook_endpoint' });
  }

  // Verify webhook
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  } else {
    console.log('❌ Verification failed', { mode, token });
    return res.sendStatus(403);
  }
});

// Send WhatsApp message function
async function sendWhatsAppMessage(to, message) {
  try {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      text: { body: message }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

// Generate automated response based on message
function generateAutoResponse(messageText, userName = '') {
  const text = messageText.toLowerCase();
  
  const responses = {
    greetings: [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'
    ],
    property: [
      'property', 'house', 'flat', 'apartment', 'buy', 'rent', 'sale'
    ],
    price: [
      'price', 'cost', 'budget', 'cheap', 'expensive', 'affordable'
    ],
    location: [
      'location', 'area', 'where', 'address', 'near', 'locality'
    ]
  };

  // Check greeting
  if (responses.greetings.some(word => text.includes(word))) {
    return `Hello ${userName}! 👋 Welcome to RealtyReach. How can I help you with your property needs today?`;
  }

  // Check property inquiry
  if (responses.property.some(word => text.includes(word))) {
    return `🏠 Great! I can help you with property options. Are you looking to buy or rent? Please share your preferred location and budget.`;
  }

  // Check price inquiry
  if (responses.price.some(word => text.includes(word))) {
    return `💰 I'd be happy to help with pricing information. Could you please specify the type of property and location you're interested in?`;
  }

  // Check location inquiry
  if (responses.location.some(word => text.includes(word))) {
    return `📍 We have properties in various locations. Could you please specify your preferred area or nearby landmarks?`;
  }

  // Default response
  return `Thank you for contacting RealtyReach! 🏢 Our team will get back to you shortly. For immediate assistance, please call us or share more details about your property requirements.`;
}

// Webhook message receiver (POST)
app.post('/webhook', async (req, res) => {
  console.log('📨 Incoming POST /webhook:', JSON.stringify(req.body, null, 2));

  try {
    const body = req.body;

    // Check if it's a WhatsApp message
    if (body.object === 'whatsapp_business_account' && 
        body.entry && 
        body.entry[0] && 
        body.entry[0].changes && 
        body.entry[0].changes[0] && 
        body.entry[0].changes[0].value) {
      
      const changes = body.entry[0].changes[0].value;
      
      // Handle incoming messages
      if (changes.messages && changes.messages.length > 0) {
        const message = changes.messages[0];
        const from = message.from;
        const messageId = message.id;
        const timestamp = message.timestamp;

        // Get contact name if available
        const contact = changes.contacts && changes.contacts[0];
        const userName = contact?.profile?.name || '';

        console.log(`📩 New message from ${userName} (${from}):`, {
          id: messageId,
          timestamp: timestamp,
          type: message.type
        });

        // Handle different message types
        let messageText = '';
        
        if (message.type === 'text') {
          messageText = message.text.body;
          console.log(`💬 Text message: "${messageText}"`);
        } else if (message.type === 'button') {
          messageText = message.button.text;
          console.log(`🔘 Button pressed: "${messageText}"`);
        } else if (message.type === 'interactive') {
          if (message.interactive.type === 'button_reply') {
            messageText = message.interactive.button_reply.title;
          } else if (message.interactive.type === 'list_reply') {
            messageText = message.interactive.list_reply.title;
          }
          console.log(`🎯 Interactive message: "${messageText}"`);
        } else {
          messageText = `Received ${message.type} message`;
          console.log(`📎 ${message.type} message received`);
        }

        // Generate and send automated response
        const autoResponse = generateAutoResponse(messageText, userName);
        
        // Send reply after small delay to appear more natural
        setTimeout(async () => {
          try {
            await sendWhatsAppMessage(from, autoResponse);
            console.log(`✅ Auto-reply sent to ${userName} (${from})`);
          } catch (error) {
            console.error(`❌ Failed to send auto-reply to ${from}:`, error.message);
          }
        }, 2000);
      }

      // Handle message status updates
      if (changes.statuses && changes.statuses.length > 0) {
        const status = changes.statuses[0];
        console.log(`📊 Message status update:`, {
          id: status.id,
          status: status.status,
          timestamp: status.timestamp
        });
      }
    }

    // Always return 200 OK to acknowledge receipt
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    res.sendStatus(500);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Webhook URL: https://your-app.onrender.com/webhook`);
  console.log(`🏥 Health check: https://your-app.onrender.com/health`);
});
