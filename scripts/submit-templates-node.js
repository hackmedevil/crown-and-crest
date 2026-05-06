#!/usr/bin/env node

const https = require('https');

const token = 'EAAe1i79rYaUBRC6YpJtwD9rPs2g0ADimcwZBsyiFnPxoRqP83Xc1Cg49Fjwm9xbMAbbXULbz0i0TMtdf6RJ7H0csXZAyhcf5ZAqMIzJXlyJrcUYBCdnFSNkTZAOhUfeqnXEHMhAEUHOEMlgDFh8JUfEvPZBUZA0kbRyk3CFR83PAiHPSb1a9EvTsugQZCL0TrQRTZCWc8hsP0b0ksfRwJBOZAe8IA9CWuW22BZAjg1cipVLOZAxQA10dxhv5cFmWOGlzUiJKOPhR7JINZC1Un6znZCYkLehZCncSalWV7kVAZDZD';
const businessId = '1621027432379090';

const templates = [
  {
    name: 'order_in_production',
    body: 'Your order is being prepared!\n\nOrder: #{{1}}\n\nWe\'re carefully crafting your items. You\'ll receive tracking details soon.\n\n- Crown & Crest'
  },
  {
    name: 'sent_to_logistics',
    body: 'Your order is sent for fulfillment!\n\nOrder: #{{1}}\n\nYou\'ll receive tracking details soon!\n\n- Crown & Crest'
  },
  {
    name: 'refund_initiated',
    body: 'Refund initiated!\n\nOrder: #{{1}}\nRefund Amount: Rs.{{2}}\n\nThe amount will be credited to your original payment method within 5-7 business days.\n\n- Crown & Crest'
  },
  {
    name: 'order_cancelled',
    body: 'Your order has been cancelled.\n\nOrder: #{{1}}\n\nIf you have any questions, please contact our support team.\n\n- Crown & Crest'
  }
];

async function submitTemplate(template) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      name: template.name,
      category: 'UTILITY',
      language: 'en_US',
      components: [
        {
          type: 'BODY',
          text: template.body
        }
      ]
    });

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/v22.0/${businessId}/message_templates`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ template: template.name, status: res.statusCode, response });
        } catch (e) {
          resolve({ template: template.name, status: res.statusCode, response: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function submitAll() {
  console.log('\n========== WhatsApp Template Submission ==========\n');
  let successful = 0;
  let failed = 0;

  for (const template of templates) {
    process.stdout.write(`Submitting: ${template.name}... `);
    try {
      const result = await submitTemplate(template);
      
      if (result.status === 200 && result.response.id) {
        console.log(`\u2713 SUCCESS (ID: ${result.response.id})`);
        successful++;
      } else {
        console.log(`\u2717 FAILED (Status: ${result.status})`);
        console.log(`  Response: ${JSON.stringify(result.response)}`);
        failed++;
      }
    } catch (error) {
      console.log(`\u2717 ERROR`);
      console.log(`  ${error.message}`);
      failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n========== Summary ==========`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`=============================\n`);
}

submitAll().catch(console.error);
