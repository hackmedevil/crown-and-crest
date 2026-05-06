// SMS Message Templates
// Pre-defined templates for different order statuses

import { NotificationType, SMSTemplateData } from './types'

export const SMS_TEMPLATES: Record<NotificationType, (data: SMSTemplateData) => string> = {
  ORDER_CREATED: (data) =>
    `Thank you for your order #${data.orderId?.slice(0, 8)}! We've received your order for Rs.${data.amount}. You'll receive updates via SMS. - Crown & Crest`,

  PAYMENT_CONFIRMED: (data) =>
    `Payment confirmed! Your payment of Rs.${data.amount} is received. Order #${data.orderId?.slice(0, 8)} is being processed. - Crown & Crest`,

  COD_CONFIRMED: (data) =>
    `COD Order confirmed! Your order #${data.orderId?.slice(0, 8)} for Rs.${data.amount} is confirmed. Amount payable on delivery. - Crown & Crest`,

  ORDER_PACKED: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} has been packed and is ready for shipment. You'll receive tracking details soon. - Crown & Crest`,

  SHIPPED: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} has been shipped via ${data.courier || 'courier'}! Track: ${data.trackingUrl || `AWB: ${data.trackingId}`} - Crown & Crest`,

  OUT_FOR_DELIVERY: (data) =>
    `Great news! Your order #${data.orderId?.slice(0, 8)} is out for delivery today. Please keep Rs.${data.amount} ready if COD. - Crown & Crest`,

  DELIVERED: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} has been delivered! Thank you for shopping with Crown & Crest. We'd love your feedback!`,

  CANCELLED: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} has been cancelled. If you did not request this, please contact us. - Crown & Crest`,

  ORDER_IN_PRODUCTION: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} is being prepared! We're carefully crafting your items. You'll receive tracking details soon. - Crown & Crest`,

  SENT_TO_LOGISTICS: (data) =>
    `Your order #${data.orderId?.slice(0, 8)} has been sent for fulfillment! You'll receive tracking details soon. - Crown & Crest`,

  REFUND_INITIATED: (data) =>
    `Refund initiated for order #${data.orderId?.slice(0, 8)}! Refund amount: Rs.${data.amount}. Credit will be processed within 5-7 business days. - Crown & Crest`,

  PAYMENT_FAILED: (data) =>
    `Payment failed for order #${data.orderId?.slice(0, 8)}. Please retry or contact support. - Crown & Crest`,

  RTO_INITIATED: (data) =>
    `Delivery attempt failed for order #${data.orderId?.slice(0, 8)}. The package is being returned. Contact us for reshipment. - Crown & Crest`,

  CUSTOM: (data) =>
    (data.message as string) || 'Update regarding your order from Crown & Crest',
}

/**
 * Generate SMS message from template
 */
export function generateSMSMessage(
  notificationType: NotificationType,
  data: SMSTemplateData
): string {
  const template = SMS_TEMPLATES[notificationType]
  if (!template) {
    throw new Error(`Unknown notification type: ${notificationType}`)
  }

  return template(data)
}

/**
 * Validate and format phone number
 * Ensures phone number is in E.164 format
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+91'): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with country code without +, add it
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`
  }

  // If doesn't have country code, add it
  if (!cleaned.startsWith('91')) {
    // Ensure 10-digit phone number
    if (cleaned.length === 10) {
      return `${countryCode}${cleaned}`
    }
  }

  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone
  }

  return `+${cleaned}`
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Check if it's a valid Indian mobile number (10 digits)
  // or with country code (12 digits starting with 91)
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'))
}

/**
 * Get tracking URL for Shiprocket AWB
 */
export function getTrackingUrl(trackingId: string, courier?: string): string {
  // You can customize this based on courier
  return `https://crownandcrest.com/track/${trackingId}`
}
