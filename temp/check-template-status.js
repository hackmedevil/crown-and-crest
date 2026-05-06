#!/usr/bin/env node
/**
 * Check WhatsApp Template Status
 * View approval status of all your WhatsApp templates
 * 
 * Usage: node check-template-status.js
 */

require('dotenv').config({ path: '.env.local' })

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID

async function getTemplates() {
    const url = `https://graph.facebook.com/v18.0/${BUSINESS_ID}/message_templates?limit=50`

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch templates')
        }

        return data.data || []
    } catch (error) {
        console.error('Error fetching templates:', error.message)
        return []
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'APPROVED':
            return '✅'
        case 'PENDING':
            return '⏳'
        case 'REJECTED':
            return '❌'
        default:
            return '❓'
    }
}

function getQualityEmoji(quality) {
    if (!quality) return '—'
    switch (quality.score) {
        case 'GREEN':
            return '🟢'
        case 'YELLOW':
            return '🟡'
        case 'RED':
            return '🔴'
        default:
            return '⚪'
    }
}

async function main() {
    console.log('📋 WhatsApp Template Status Checker\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (!ACCESS_TOKEN || !BUSINESS_ID) {
        console.error('❌ Missing credentials in .env.local')
        process.exit(1)
    }

    console.log('🔍 Fetching templates...\n')

    const templates = await getTemplates()

    if (templates.length === 0) {
        console.log('📭 No templates found.')
        console.log('\n💡 Run: node create-whatsapp-templates.js')
        process.exit(0)
    }

    console.log(`📊 Found ${templates.length} template(s):\n`)

    // Group by status
    const approved = templates.filter(t => t.status === 'APPROVED')
    const pending = templates.filter(t => t.status === 'PENDING')
    const rejected = templates.filter(t => t.status === 'REJECTED')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (approved.length > 0) {
        console.log('✅ APPROVED TEMPLATES:\n')
        approved.forEach(t => {
            console.log(`   ${getStatusEmoji(t.status)} ${t.name}`)
            console.log(`      Quality: ${getQualityEmoji(t.quality_score)}`)
            console.log(`      Language: ${t.language}`)
            console.log(`      Category: ${t.category}`)
            console.log()
        })
    }

    if (pending.length > 0) {
        console.log('⏳ PENDING APPROVAL:\n')
        pending.forEach(t => {
            console.log(`   ${getStatusEmoji(t.status)} ${t.name}`)
            console.log(`      Language: ${t.language}`)
            console.log(`      Category: ${t.category}`)
            console.log()
        })
        console.log('   💡 Usually takes 1-2 hours for approval\n')
    }

    if (rejected.length > 0) {
        console.log('❌ REJECTED TEMPLATES:\n')
        rejected.forEach(t => {
            console.log(`   ${getStatusEmoji(t.status)} ${t.name}`)
            if (t.rejected_reason) {
                console.log(`      Reason: ${t.rejected_reason}`)
            }
            console.log()
        })
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('📊 Summary:')
    console.log(`   Total: ${templates.length}`)
    console.log(`   ✅ Approved: ${approved.length}`)
    console.log(`   ⏳ Pending: ${pending.length}`)
    console.log(`   ❌ Rejected: ${rejected.length}`)

    console.log('\n🔗 View in Meta Business Manager:')
    console.log('   https://business.facebook.com/latest/whatsapp_manager/message_templates\n')

    if (approved.length === templates.length) {
        console.log('🎉 All templates approved! You can start sending WhatsApp messages!\n')
    } else if (pending.length > 0) {
        console.log('⏰ Some templates are pending. Check back in 1-2 hours.\n')
    }
}

main().catch(error => {
    console.error('Error:', error)
    process.exit(1)
})
