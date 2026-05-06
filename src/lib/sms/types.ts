// SMS Notification Types
// Defines all SMS-related types and interfaces

export type SMSProvider = 'msg91' | 'twilio' | 'aws-sns' | 'gupshup' | 'whatsapp-cloud'

export type SMSStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED'

export type NotificationType =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'COD_CONFIRMED'
  | 'ORDER_IN_PRODUCTION'
  | 'SENT_TO_LOGISTICS'
  | 'ORDER_PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_INITIATED'
  | 'PAYMENT_FAILED'
  | 'RTO_INITIATED'
  | 'CUSTOM'

export interface SMSNotification {
  id: string
  order_id: string
  phone: string
  notification_type: NotificationType
  message: string
  template_id?: string | null
  status: SMSStatus
  provider_message_id?: string | null
  error_message?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface SendSMSParams {
  phone: string
  message: string
  templateId?: string
  templateData?: SMSTemplateData
  orderId?: string
  notificationType?: NotificationType
}

export interface SendSMSResponse {
  success: boolean
  messageId?: string
  error?: string
  status: SMSStatus
}

export interface SMSTemplateData {
  orderId?: string
  amount?: number
  courier?: string
  trackingUrl?: string
  trackingId?: string
  customerName?: string
  deliveryDate?: string
  [key: string]: string | number | undefined
}

export interface SMSProviderConfig {
  provider: SMSProvider
  credentials: {
    authKey?: string
    senderId?: string
    route?: string
    accountSid?: string
    authToken?: string
    phoneNumber?: string
    accessKeyId?: string
    secretAccessKey?: string
    region?: string
    whatsappAccessToken?: string
    whatsappPhoneNumberId?: string
    whatsappBusinessId?: string
  }
  enabled: boolean
  defaultCountryCode: string
}
