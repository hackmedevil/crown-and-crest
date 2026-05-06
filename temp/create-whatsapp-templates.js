#!/usr/bin/env node
/**
 * WhatsApp Template Creator
 * Creates message templates using official WhatsApp Cloud API format
 * 
 * Usage: node create-whatsapp-templates.js
 */

require('dotenv').config({ path: '.env.local' })

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID

// Template definitions matching official WhatsApp API format
const TEMPLATES = [
    {
        name: 'order_created',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, thank you for your order! 🎉\n\nOrder ID: {{2}}\nAmount: ₹{{3}}\n\nWe\'ll keep you updated via WhatsApp.\n\n- Crown & Crest',
                example: {
                    body_text: [['Rajesh', 'ORD12345', '999']]
                }
            }
        ]
    },
    {
        name: 'payment_confirmed',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Payment confirmed! ✅\n\nYour payment for order #{{1}} (₹{{2}}) has been received.\n\nYour order is now being processed.\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345', '999']]
                }
            }
        ]
    },
    {
        name: 'cod_confirmed',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Order confirmed! 📦\n\nYour COD order #{{1}} for ₹{{2}} has been confirmed.\n\nWe\'ll update you when it ships!\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345', '999']]
                }
            }
        ]
    },
    {
        name: 'order_packed',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Your order is packed! 📦\n\nOrder #{{1}} has been packed and is ready to ship.\n\nYou\'ll receive tracking details soon.\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345']]
                }
            }
        ]
    },
    {
        name: 'order_shipped',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Your order is on the way! 📦\n\nOrder: #{{1}}\nCourier: {{2}}\nTracking: {{3}}\n\nTrack: {{4}}\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345', 'Blue Dart', 'BD123456', 'https://track.example.com']]
                }
            }
        ]
    },
    {
        name: 'out_for_delivery',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Your order is out for delivery! 🚚\n\nOrder: #{{1}}\nCourier: {{2}}\n\nYou should receive it today!\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345', 'Blue Dart']]
                }
            }
        ]
    },
    {
        name: 'order_delivered',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Your order has been delivered! 🎉\n\nOrder: #{{1}}\n\nThank you for shopping with Crown & Crest. We\'d love your feedback!',
                example: {
                    body_text: [['ORD12345']]
                }
            }
        ]
    },
    {
        name: 'order_cancelled',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Order cancelled 🔴\n\nYour order #{{1}} has been cancelled.\n\nIf you didn\'t request this, please contact us immediately.\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345']]
                }
            }
        ]
    },
    {
        name: 'rto_initiated',
        category: 'UTILITY',
        language: 'en_US',
        components: [
            {
                type: 'BODY',
                text: 'Delivery unsuccessful 📭\n\nOrder #{{1}} couldn\'t be delivered and is being returned.\n\nPlease contact us to arrange reshipment.\n\n- Crown & Crest',
                example: {
                    body_text: [['ORD12345']]
                }
            }
        ]
    }
]

async function createTemplate(template) {
    const url = `https://graph.facebook.com/v18.0/${BUSINESS_ID}/message_templates`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(template),
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                success: false,
                name: template.name,
                error: data.error?.message || 'Unknown error',
                errorCode: data.error?.code,
                errorType: data.error?.type,
            }
        }

        return {
            success: true,
            name: template.name,
            id: data.id,
            status: data.status || 'PENDING',
        }
    } catch (error) {
        return {
            success: false,
            name: template.name,
            error: error.message,
        }
    }
}

async function main() {
    console.log('🚀 WhatsApp Template Creator (Official API Format)\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Check credentials
    if (!ACCESS_TOKEN) {
        console.error('❌ WHATSAPP_ACCESS_TOKEN not found in .env.local')
        process.exit(1)
    }

    if (!BUSINESS_ID) {
        console.error('❌ WHATSAPP_BUSINESS_ID not found in .env.local')
        console.log('\n💡 Find your Business ID:')
        console.log('   1. Go to: https://business.facebook.com/settings')
        console.log('   2. Click "Business Info"')
        console.log('   3. Copy "Business ID"\n')
        process.exit(1)
    }

    console.log('✅ Credentials loaded')
    console.log(`📊 Business ID: ${BUSINESS_ID}`)
    console.log(`📝 Creating ${TEMPLATES.length} templates...\n`)

    const results = []

    for (const template of TEMPLATES) {
        console.log(`📤 Creating: ${template.name}...`)
        const result = await createTemplate(template)
        results.push(result)

        if (result.success) {
            console.log(`   ✅ Created! ID: ${result.id}`)
            console.log(`   📋 Status: ${result.status}\n`)
        } else {
            console.log(`   ❌ Failed: ${result.error}`)
            if (result.errorCode) {
                console.log(`   Code: ${result.errorCode}`)
            }
            console.log()
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log('📊 SUMMARY:\n')
    console.log(`   ✅ Successful: ${successful.length}`)
    console.log(`   ❌ Failed: ${failed.length}\n`)

    if (successful.length > 0) {
        console.log('✅ Successfully created:\n')
        successful.forEach(r => console.log(`   • ${r.name} (${r.id})`))
        console.log()
    }

    if (failed.length > 0) {
        console.log('❌ Failed:\n')
        failed.forEach(r => console.log(`   • ${r.name}: ${r.error}`))
        console.log()
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (successful.length > 0) {
        console.log('📝 NEXT STEPS:\n')
        console.log('1. Wait for template approval (1-2 hours)')
        console.log('2. Check status: node check-template-status.js')
        console.log('3. Or view in Meta: https://business.facebook.com/latest/whatsapp_manager/message_templates')
        console.log('4. Once approved, test: npm run dev\n')
    }

    process.exit(failed.length > 0 ? 1 : 0)
}

main().catch(error => {
    console.error('\n💥 Error:', error.message)
    process.exit(1)
})
