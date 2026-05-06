'use server'

import { generateText as generateTextFromClient } from './client'
import { generateWithFailover } from './failover'

/**
 * AI Generation Actions
 * Server actions for AI-powered content generation with automatic failover
 */

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface ImageAnalysis {
  score: number
  issues: string[]
  suggestions: string[]
  seoFriendly: boolean
  altTextSuggestion?: string
}

// Export direct client for backward compatibility
export const generateTextDirect = generateTextFromClient

// Use failover by default for production reliability
export const generateText = async (prompt: string, options?: Record<string, unknown>) => {
  try {
    // Try failover first for automatic model switching
    const result = await generateWithFailover(prompt, options)
    console.log(`[AI] Generated with ${result.modelUsed} after ${result.attemptCount} attempts`)
    return result.content
  } catch (error) {
    // Fallback to direct generation if failover not configured
    console.warn('[AI] Failover failed, using direct generation:', error)
    return generateTextFromClient(prompt, options)
  }
}

/**
 * Generate product description
 */
export async function generateProductDescription(
  productName: string,
  category: string,
  tone: 'professional' | 'casual' | 'luxury' | 'technical' = 'professional'
): Promise<string> {
  const toneInstructions = {
    professional: 'Write in a professional, informative tone suitable for business customers.',
    casual: 'Write in a friendly, conversational tone that feels approachable.',
    luxury: 'Write in an elegant, sophisticated tone emphasizing premium quality.',
    technical: 'Write in a detailed, technical tone focusing on specifications and features.'
  }

  const prompt = `Write a compelling product description for an e-commerce product.

Product Name: ${productName}
Category: ${category}
Tone: ${tone}

${toneInstructions[tone]}

Requirements:
- 2-3 paragraphs
- Highlight key benefits and features
- Include a call-to-action
- SEO-friendly language
- No pricing information

Description:`

  return generateText(prompt, { temperature: 0.8, maxTokens: 300 })
}

/**
 * Generate SEO meta title
 */
export async function generateMetaTitle(
  productName: string,
  keywords: string[] = []
): Promise<string> {
  const keywordsText = keywords.length > 0 ? `\nKeywords to include: ${keywords.join(', ')}` : ''
  
  const prompt = `Generate an SEO-optimized meta title for this product:

Product: ${productName}${keywordsText}

Requirements:
- Maximum 60 characters
- Include primary keyword naturally
- Compelling and click-worthy
- No special characters except hyphens
- Include brand mention if space allows

Meta Title:`

  const result = await generateText(prompt, { temperature: 0.7, maxTokens: 100 })
  // Clean up and ensure length
  return result.trim().substring(0, 60)
}

/**
 * Generate SEO meta description
 */
export async function generateMetaDescription(
  productName: string,
  description: string
): Promise<string> {
  const prompt = `Generate an SEO-optimized meta description for this product:

Product: ${productName}
Full Description: ${description}

Requirements:
- 150-160 characters
- Include primary keywords naturally
- Compelling and informative
- Include a subtle call-to-action
- No special formatting

Meta Description:`

  const result = await generateText(prompt, { temperature: 0.7, maxTokens: 100 })
  // Clean up and ensure length
  return result.trim().substring(0, 160)
}

/**
 * Suggest keywords for product
 */
export async function suggestKeywords(
  productName: string,
  category: string
): Promise<string[]> {
  const prompt = `Suggest 5-7 SEO keywords for this e-commerce product:

Product: ${productName}
Category: ${category}

Return ONLY the keywords as a comma-separated list, no explanations.

Keywords:`

  const result = await generateText(prompt, { temperature: 0.6, maxTokens: 100 })
  // Parse comma-separated keywords
  return result.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

/**
 * Generate alt text for product image
 */
export async function generateAltText(
  productName: string,
  imageContext?: string
): Promise<string> {
  const contextText = imageContext ? `\nImage shows: ${imageContext}` : ''
  
  const prompt = `Generate descriptive alt text for a product image:

Product: ${productName}${contextText}

Requirements:
- Descriptive and specific
- Include product name
- 10-15 words maximum
- SEO-friendly
- No special characters

Alt Text:`

  const result = await generateText(prompt, { temperature: 0.6, maxTokens: 50 })
  return result.trim()
}

/**
 * Analyze image quality (placeholder - would need vision API)
 */
export async function analyzeImageQuality(
  imageUrl: string
): Promise<ImageAnalysis> {
  // This is a placeholder. Full implementation would require vision-capable models
  // like GPT-4 Vision, Claude 3 Opus, or Google Gemini Vision
  
  return {
    score: 85,
    issues: [
      'Resolution could be higher for zoom functionality',
      'Background could be more neutral'
    ],
    suggestions: [
      'Consider using a white or neutral background',
      'Ensure image is at least 2000x2000px for best quality',
      'Add lifestyle shots showing product in use'
    ],
    seoFriendly: true,
    altTextSuggestion: await generateAltText('Product', 'shown from multiple angles')
  }
}

/**
 * Calculate SEO score for product
 */
export async function calculateProductSEO(product: {
  name?: string
  description?: string
  seo_title?: string
  seo_description?: string
  slug?: string
}): Promise<{
  overall: number
  titleScore: number
  descriptionScore: number
  slugScore: number
  contentScore: number
  suggestions: string[]
}> {
  const suggestions: string[] = []
  
  // Title score (0-25 points)
  let titleScore = 0
  if (product.seo_title) {
    titleScore += product.seo_title.length >= 30 && product.seo_title.length <= 60 ? 15 : 5
    titleScore += product.name && product.seo_title.toLowerCase().includes(product.name.toLowerCase()) ? 10 : 0
  } else {
    suggestions.push('Add an SEO title (30-60 characters)')
  }

  // Description score (0-25 points)
  let descriptionScore = 0
  if (product.seo_description) {
    descriptionScore += product.seo_description.length >= 120 && product.seo_description.length <= 160 ? 15 : 5
    descriptionScore += product.name && product.seo_description.toLowerCase().includes(product.name.toLowerCase()) ? 10 : 0
  } else {
    suggestions.push('Add an SEO meta description (120-160 characters)')
  }

  // Slug score (0-20 points)
  let slugScore = 0
  if (product.slug) {
    slugScore += product.slug.length > 0 && product.slug.length <= 60 ? 10 : 5
    slugScore += /^[a-z0-9-]+$/.test(product.slug) ? 10 : 0
  } else {
    suggestions.push('Add a URL-friendly slug')
  }

  // Content score (0-30 points)
  let contentScore = 0
  if (product.description) {
    contentScore += product.description.length >= 100 ? 15 : 5
    contentScore += product.description.length >= 200 ? 15 : 0
  } else {
    suggestions.push('Add a detailed product description (200+ characters)')
  }

  const overall = titleScore + descriptionScore + slugScore + contentScore

  if (overall < 70) {
    suggestions.push('Overall SEO score is below recommended threshold')
  }

  return {
    overall,
    titleScore,
    descriptionScore,
    slugScore,
    contentScore,
    suggestions
  }
}
