#!/usr/bin/env node

/**
 * WhatsApp Templates Submission CLI (Node.js Version)
 * Alternative approach using different API method
 */

require('dotenv').config();

const https = require('https');

const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ID;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!TOKEN || !BUSINESS_ID) {
  console.error('ERROR: Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ID');
  process.exit(1);
}

console.log('WhatsApp Templates Submission (Node.js CLI)');
console.log('==========================================');
console.log(`Business ID: ${BUSINESS_ID}`);
console.log(`Phone Number ID: ${PHONE_NUMBER_ID}\n`);

const templates = [
  {
    name: 'order_in_production',
    category: 'UTILITY',
    language: 'en_US',
    body: `Your order is being prepared!

Order: #{{1}}

We're carefully crafting your items. You'll receive tracking details soon.

- Crown & Crest`,
  },
  {
    name: 'sent_to_logistics',
    category: 'UTILITY',
    language: 'en_US',
    body: `Your order is sent for fulfillment!

Order: #{{1}}

You'll receive tracking details soon!

- Crown & Crest`,
  },
  {
    name: 'refund_initiated',
    category: 'UTILITY',
    language: 'en_US',
    body: `Refund initiated!

Order: #{{1}}
Refund Amount: Rs.{{2}}

The amount will be credited to your original payment method within 5-7 business days.

- Crown & Crest`,
  },
  {
    name: 'order_cancelled',
    category: 'UTILITY',
    language: 'en_US',
    body: `Your order has been cancelled.

Order: #{{1}}

If you have any questions, please contact our support team.

- Crown & Crest`,
  },
];

async function submitTemplate(template) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      name: template.name,
      category: template.category,
      language: template.language,
      components: [
        {
          type: 'BODY',
          text: template.body,
        },
      ],
    });

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v22.0/${BUSINESS_ID}/message_templates`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    console.log(`Submitting: ${template.name}...`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.id) {
            console.log(`  ✓ SUCCESS - Template ID: ${result.id}`);
            resolve({ success: true, name: template.name, id: result.id });
          } else if (result.error) {
            console.log(
              `  ✗ FAILED - ${result.error.message || result.error}`
            );
            resolve({ success: false, name: template.name, error: result.error });
          } else {
            console.log(`  ? UNKNOWN - ${data}`);
            resolve({ success: false, name: template.name, error: data });
          }
        } catch (e) {
          console.log(`  ✗ ERROR - ${e.message}`);
          resolve({ success: false, name: template.name, error: e.message });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`  ✗ ERROR - ${e.message}`);
      resolve({ success: false, name: template.name, error: e.message });
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  const results = [];

  for (const template of templates) {
    const result = await submitTemplate(template);
    results.push(result);
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\n==========================================');
  console.log('Summary:');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✓ Successful: ${successful}`);
  console.log(`✗ Failed: ${failed}`);
  console.log('==========================================');

  if (failed === 0) {
    console.log(
      '\nAll templates submitted successfully!'
    );
    console.log('Templates will be reviewed by Meta (typically 1-2 hours)\n');
    process.exit(0);
  } else {
    console.log(
      '\nSome templates failed. Possible reasons:'
    );
    console.log('1. Access token does not have whatsapp_business_messaging permission');
    console.log('2. WhatsApp Business Account not properly configured');
    console.log('3. Business ID is incorrect');
    console.log(
      '\nPlease submit templates manually via Meta Business Manager:'
    );
    console.log(
      'https://business.facebook.com → WhatsApp Manager → Message Templates\n'
    );
    process.exit(1);
  }
}

main();
