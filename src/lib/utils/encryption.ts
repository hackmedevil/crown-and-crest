import crypto from 'crypto'

/**
 * Encryption utilities for sensitive data like API keys
 * Uses AES-256-GCM for secure encryption
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from secret using PBKDF2
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Encrypt sensitive data (like API keys)
 * Returns base64 encoded string with format: salt:iv:tag:encrypted
 */
export function encrypt(text: string): string {
  const secret = process.env.AI_ENCRYPTION_KEY
  
  if (!secret || secret.length < 32) {
    throw new Error('AI_ENCRYPTION_KEY must be at least 32 characters')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Derive key from secret
  const key = deriveKey(secret, salt)
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Get authentication tag
  const tag = cipher.getAuthTag()
  
  // Combine salt:iv:tag:encrypted and encode as base64
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ])
  
  return combined.toString('base64')
}

/**
 * Decrypt sensitive data
 * Expects base64 encoded string with format: salt:iv:tag:encrypted
 */
export function decrypt(encryptedData: string): string {
  const secret = process.env.AI_ENCRYPTION_KEY
  
  if (!secret || secret.length < 32) {
    throw new Error('AI_ENCRYPTION_KEY must be at least 32 characters')
  }

  try {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    // Derive key from secret
    const key = deriveKey(secret, salt)
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Mask API key for display (show first 8 and last 4 characters)
 * Example: sk-abc123...xyz9
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '***'
  }
  
  const start = apiKey.substring(0, 8)
  const end = apiKey.substring(apiKey.length - 4)
  
  return `${start}...${end}`
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Check minimum length
  if (!apiKey || apiKey.length < 20) {
    return false
  }
  
  // Check for common prefixes
  const validPrefixes = ['sk-', 'api-', 'pk-', 'Bearer ']
  const hasValidPrefix = validPrefixes.some(prefix => 
    apiKey.startsWith(prefix)
  )
  
  // Either has valid prefix or is at least 32 chars (generic key)
  return hasValidPrefix || apiKey.length >= 32
}
