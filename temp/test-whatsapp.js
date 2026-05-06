/**
 * WhatsApp Configuration Test
 * Run this to verify your WhatsApp Cloud API setup
 * 
 * Usage: node test-whatsapp.js YOUR_PHONE_NUMBER
 */

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

async function testWhatsAppConfig(recipientPhone) {
    console.log('🧪 Testing WhatsApp Cloud API Configuration...\n')

    // Check credentials
    if (!WHATSAPP_ACCESS_TOKEN) {
        console.error('❌ WHATSAPP_ACCESS_TOKEN not found in environment')
        return false
    }
    console.log('✅ Access Token found')

    if (!WHATSAPP_PHONE_NUMBER_ID) {
        console.error('❌ WHATSAPP_PHONE_NUMBER_ID not found in environment')
        return false
    }
    console.log('✅ Phone Number ID found:', WHATSAPP_PHONE_NUMBER_ID)

    // Test API connection
    try {
        console.log('\n📡 Testing API connection...')

        const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientPhone || '919876543210', // Replace with your number
                type: 'text',
                text: {
                    body: '🧪 Test message from Crown & Crest! Your WhatsApp is configured correctly! 🎉'
                }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('❌ API Error:', data.error?.message || 'Unknown error')
            console.error('Details:', JSON.stringify(data, null, 2))
            return false
        }

        console.log('✅ WhatsApp message sent successfully!')
        console.log('📱 Message ID:', data.messages?.[0]?.id)
        console.log('\n🎉 Configuration is working! Check your WhatsApp!')
        return true

    } catch (error) {
        console.error('❌ Connection error:', error.message)
        return false
    }
}

// Run test
const recipientPhone = process.argv[2]

if (!recipientPhone) {
    console.log('Usage: node test-whatsapp.js YOUR_PHONE_NUMBER')
    console.log('Example: node test-whatsapp.js 919876543210')
    process.exit(1)
}

testWhatsAppConfig(recipientPhone)
    .then(success => {
        process.exit(success ? 0 : 1)
    })
    .catch(error => {
        console.error('Test failed:', error)
        process.exit(1)
    })
