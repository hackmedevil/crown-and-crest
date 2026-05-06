/**
 * WhatsApp Message Templates
 * Pre-approved templates for WhatsApp Business API
 */

import { SMSTemplateData, NotificationType } from './types'
import { WhatsAppTemplateMessage } from './providers/whatsapp-cloud'

/**
 * Template name mapping
 * Maps notification types to WhatsApp template names
 */
export const WHATSAPP_TEMPLATE_NAMES: Record<NotificationType, string> = {
  ORDER_CREATED: 'order_created',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  COD_CONFIRMED: 'cod_confirmed',
  ORDER_IN_PRODUCTION: 'order_in_production',
  SENT_TO_LOGISTICS: 'sent_to_logistics',
  ORDER_PACKED: 'order_packed',
  SHIPPED: 'order_shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'order_delivered',
  CANCELLED: 'order_cancelled',
  REFUND_INITIATED: 'refund_initiated',
  PAYMENT_FAILED: 'payment_failed',
  RTO_INITIATED: 'rto_initiated',
  CUSTOM: 'order_update',
}

/**
 * Generate WhatsApp template message from notification type and data
 */
export function generateWhatsAppTemplate(
  notificationType: NotificationType,
  data: SMSTemplateData
): WhatsAppTemplateMessage {
  const templateName = WHATSAPP_TEMPLATE_NAMES[notificationType]

  switch (notificationType) {
    case 'ORDER_CREATED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.customerName || 'Customer' },
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.amount?.toString() || '0' },
            ],
          },
        ],
      }

    case 'PAYMENT_CONFIRMED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.amount?.toString() || '0' },
            ],
          },
        ],
      }

    case 'COD_CONFIRMED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.amount?.toString() || '0' },
            ],
          },
        ],
      }

    case 'SHIPPED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.courier || 'Courier Partner' },
              { type: 'text', text: data.trackingId || 'N/A' },
              { type: 'text', text: data.trackingUrl || '' },
            ],
          },
        ],
      }

    case 'OUT_FOR_DELIVERY':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.courier || 'Courier Partner' },
            ],
          },
        ],
      }

    case 'DELIVERED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }

    case 'CANCELLED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }

    case 'RTO_INITIATED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }

    case 'ORDER_IN_PRODUCTION':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }

    case 'SENT_TO_LOGISTICS':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }

    case 'REFUND_INITIATED':
      return {
        name: templateName,
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
              { type: 'text', text: data.amount?.toString() || '0' },
            ],
          },
        ],
      }

    default:
      return {
        name: 'order_update',
        languageCode: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.orderId?.slice(0, 8) || 'N/A' },
            ],
          },
        ],
      }
  }
}

/**
 * WhatsApp template definitions for Meta approval
 * Copy these to Meta Business Manager when creating templates
 */
export const WHATSAPP_TEMPLATE_DEFINITIONS = {
  order_created: {
    name: 'order_created',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, thank you for your order! 🎉\n\nOrder ID: {{2}}\nAmount: ₹{{3}}\n\nWe\'ll keep you updated via WhatsApp.\n\n- Crown & Crest',
      },
    ],
  },

  payment_confirmed: {
    name: 'payment_confirmed',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Payment confirmed! ✅\n\nYour payment for order #{{1}} (₹{{2}}) has been received.\n\nYour order is now being processed.\n\n- Crown & Crest',
      },
    ],
  },

  order_shipped: {
    name: 'order_shipped',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order is on the way! 📦\n\nOrder: #{{1}}\nCourier: {{2}}\nTracking: {{3}}\n\nTrack your order: {{4}}\n\n- Crown & Crest',
      },
    ],
  },

  out_for_delivery: {
    name: 'out_for_delivery',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order is out for delivery! 🚚\n\nOrder: #{{1}}\nCourier: {{2}}\n\nYou should receive it today!\n\n- Crown & Crest',
      },
    ],
  },

  order_delivered: {
    name: 'order_delivered',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order has been delivered! 🎉\n\nOrder: #{{1}}\n\nThank you for shopping with Crown & Crest. We\'d love your feedback!',
      },
    ],
  },

  order_in_production: {
    name: 'order_in_production',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order is being prepared! 👷\n\nOrder: #{{1}}\n\nWe\'re carefully crafting your items. You\'ll receive tracking details soon.\n\n- Crown & Crest',
      },
    ],
  },

  sent_to_logistics: {
    name: 'sent_to_logistics',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order is sent for fulfillment! 📬\n\nOrder: #{{1}}\n\nYou\'ll receive tracking details soon!\n\n- Crown & Crest',
      },
    ],
  },

  refund_initiated: {
    name: 'refund_initiated',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Refund initiated! ✨\n\nOrder: #{{1}}\nRefund Amount: ₹{{2}}\n\nThe amount will be credited to your original payment method within 5-7 business days.\n\n- Crown & Crest',
      },
    ],
  },

  order_cancelled: {
    name: 'order_cancelled',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Your order has been cancelled. ❌\n\nOrder: #{{1}}\n\nIf you have any questions, please contact our support team.\n\n- Crown & Crest',
      },
    ],
  },
}
