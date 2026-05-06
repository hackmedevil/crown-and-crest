import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { generateText } from '@/lib/ai/actions'
import { generateEmbedding, generateProductEmbedding } from '@/lib/ai/embeddings'
import { supabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

interface AIRequestBody {
  productId?: string
  name?: string
  category?: string
  description?: string
  shortDescription?: string
  bulletPoints?: string
  fabric?: string
  season?: string
  gender?: string
  style?: string
  fit?: string
  usage?: string
  weather?: string
  styleKeywords?: string
  priceRange?: string
  targetAudience?: string
  imageDescription?: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)\s*```/i)
  const fenced = trimmed.match(/```\s*([\s\S]*?)\s*```/i)
  const candidate = (fencedJson?.[1] || fenced?.[1] || trimmed)
    .replace(/^\uFEFF/, '')
    .trim()

  try {
    return JSON.parse(candidate)
  } catch {
    const firstBrace = candidate.indexOf('{')
    const lastBrace = candidate.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
    }
    throw new Error('Invalid JSON response from AI provider')
  }
}

function clampLength(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max - 1).trimEnd()
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCsv(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function clampSnippet(value: string, max = 160): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

const AiOutputSchema = z.object({
  ai_title: z.string().min(1),
  ai_description: z.string().min(1),
  short_description: z.string().min(1),
  long_description: z.string().min(1),
  bullet_points: z.array(z.string()).min(1),
  ai_tags: z.array(z.string()).min(1),
  season: z.string().min(1),
  usage: z.string().min(1),
  fabric: z.array(z.string()).min(1),
  style: z.array(z.string()).min(1),
  weather: z.string().min(1),
  style_keywords: z.array(z.string()).min(1),
  gender: z.string().min(1),
  fit: z.string().min(1),
  target_audience: z.string().min(1),
  seo: z.object({
    meta_title: z.string().min(1),
    meta_description: z.string().min(1),
    slug: z.string().min(1),
  })
})

function normalizeAiOutput(parsed: Record<string, unknown>) {
  const safe = AiOutputSchema.parse(parsed)

  return {
    ai_title: (safe.ai_title || '').toString().trim(),
    ai_description: (safe.ai_description || '').toString().trim(),
    short_description: (safe.short_description || '').toString().trim(),
    long_description: (safe.long_description || '').toString().trim(),
    bullet_points: ensureStringArray(safe.bullet_points),
    ai_tags: ensureStringArray(safe.ai_tags),
    season: (safe.season || '').toString().trim(),
    usage: (safe.usage || '').toString().trim(),
    fabric: ensureStringArray(safe.fabric),
    style: ensureStringArray(safe.style),
    weather: (safe.weather || '').toString().trim(),
    style_keywords: ensureStringArray(safe.style_keywords),
    gender: (safe.gender || '').toString().trim(),
    fit: (safe.fit || '').toString().trim(),
    target_audience: (safe.target_audience || '').toString().trim(),
    seo: {
      meta_title: (safe.seo?.meta_title || '').toString().trim(),
      meta_description: (safe.seo?.meta_description || '').toString().trim(),
      slug: (safe.seo?.slug || '').toString().trim(),
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = (await request.json()) as AIRequestBody
    const missingFields: string[] = []

    if (!body.name?.trim()) missingFields.push('Product name')
    if (!body.category?.trim()) missingFields.push('Category')

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      )
    }

    const inputEmbedding = await generateProductEmbedding({
      name: body.name,
      category: body.category,
      fabric: parseCsv(body.fabric),
      style: parseCsv(body.style),
      season: body.season,
      usage: body.usage,
      weather: body.weather,
      ai_title: undefined,
      ai_description: body.description || body.shortDescription || undefined,
      ai_tags: undefined,
      style_keywords: parseCsv(body.styleKeywords)
    })

    let memoryBlock = ''
    try {
      const { data: similarMemories } = await supabaseServer.rpc('match_ai_product_memory', {
        query_embedding: inputEmbedding,
        category_filter: body.category,
        match_threshold: 0.75,
        match_count: 5,
      })

      if (similarMemories && Array.isArray(similarMemories) && similarMemories.length > 0) {
        const memoryLines = similarMemories.map((item: any, idx: number) => {
          const attributes = item.attributes ? JSON.stringify(item.attributes) : 'N/A'
          const imageDesc = item.image_description ? clampSnippet(String(item.image_description), 120) : 'N/A'
          return `${idx + 1}. Title: ${item.title || 'N/A'} | Image: ${imageDesc} | Attributes: ${attributes}`
        })

        memoryBlock = `${memoryLines.join('\n')}`
      }
    } catch (memoryError) {
      console.warn('[AI_GENERATE_PRODUCT] Memory lookup failed:', memoryError)
    }

    const prompt = `SYSTEM:\nYou are a senior ecommerce merchandising AI trained on high-conversion apparel listings.\n\nREFERENCE MEMORY:\n${memoryBlock || 'N/A'}\n\nCURRENT INPUT:\nTitle: ${body.name}\nCategory: ${body.category}\nDescription: ${body.description || body.shortDescription || 'Not provided'}\nImage Description: ${body.imageDescription || 'Not provided'}\nKnown Attributes:\n- Fabric: ${body.fabric || 'Not provided'}\n- Season: ${body.season || 'Not provided'}\n- Gender: ${body.gender || 'Not provided'}\n- Style: ${body.style || 'Not provided'}\n- Fit: ${body.fit || 'Not provided'}\n- Usage: ${body.usage || 'Not provided'}\n- Weather: ${body.weather || 'Not provided'}\n- Style Keywords: ${body.styleKeywords || 'Not provided'}\n- Price Range: ${body.priceRange || 'Not provided'}\n- Target Audience: ${body.targetAudience || 'Not provided'}\n\nTASK:\nGenerate ALL missing product fields in JSON only:\n{\n  \"ai_title\": \"\",\n  \"ai_description\": \"\",\n  \"short_description\": \"\",\n  \"long_description\": \"\",\n  \"bullet_points\": [],\n  \"ai_tags\": [],\n  \"season\": \"\",\n  \"usage\": \"\",\n  \"fabric\": [],\n  \"style\": [],\n  \"weather\": \"\",\n  \"style_keywords\": [],\n  \"gender\": \"\",\n  \"fit\": \"\",\n  \"target_audience\": \"\",\n  \"seo\": {\n    \"meta_title\": \"\",\n    \"meta_description\": \"\",\n    \"slug\": \"\"\n  }\n}\n\nRULES:\n- Indian D2C tone\n- Amazon/Flipkart compatible\n- No hallucinated luxury claims\n- Optimize for hot & humid climate when relevant\n- Meta title <= 60 chars, meta description <= 160 chars\n- Do not leave any field empty\n- No markdown, JSON only\n`

    let validated: z.infer<typeof AiOutputSchema> | null = null
    let lastError: string | null = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptPrompt = attempt === 0
        ? prompt
        : `${prompt}\n\nSTRICT OUTPUT: Your last response was invalid. Return JSON only with ALL fields populated and arrays non-empty.`

      const aiResponse = await generateText(attemptPrompt, {
        temperature: 0.4,
        maxTokens: 900,
      })

      try {
        const parsed = extractJson(aiResponse)
        const normalized = normalizeAiOutput(parsed)
        validated = AiOutputSchema.parse(normalized)
        break
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Invalid AI response'
      }
    }

    if (!validated) {
      return NextResponse.json(
        { error: 'AI response failed schema validation', message: lastError },
        { status: 422 }
      )
    }

    const aiTitle = validated.ai_title || (body.name || '')
    const shortDescription = validated.short_description
    const longDescription = validated.long_description

    const bulletPoints = validated.bullet_points.slice(0, 8)
    const aiTags = validated.ai_tags.slice(0, 12)
    const fabric = validated.fabric
    const style = validated.style
    const styleKeywords = validated.style_keywords

    const metaTitle = clampLength(validated.seo.meta_title || aiTitle, 60)
    const metaDescription = clampLength(validated.seo.meta_description || shortDescription || longDescription, 160)
    const slug = slugify(validated.seo.slug || aiTitle)

    const outputPayload = {
      ai_title: aiTitle,
      ai_description: validated.ai_description || shortDescription || longDescription,
      short_description: shortDescription,
      long_description: longDescription,
      bullet_points: bulletPoints,
      ai_tags: aiTags,
      season: validated.season || body.season || null,
      usage: validated.usage || body.usage || null,
      fabric: fabric.length > 0 ? fabric : parseCsv(body.fabric),
      style: style.length > 0 ? style : parseCsv(body.style),
      weather: validated.weather || body.weather || null,
      style_keywords: styleKeywords.length > 0 ? styleKeywords : parseCsv(body.styleKeywords),
      gender: validated.gender || body.gender || null,
      fit: validated.fit || body.fit || null,
      target_audience: validated.target_audience || body.targetAudience || null,
      seo: {
        meta_title: metaTitle,
        meta_description: metaDescription,
        slug,
      }
    }

    try {
      const memoryEmbeddingText = [
        body.name,
        body.category,
        outputPayload.ai_title,
        outputPayload.ai_description,
        outputPayload.short_description,
        outputPayload.long_description,
        outputPayload.bullet_points.join(' '),
        outputPayload.ai_tags.join(' '),
        outputPayload.fabric.join(' '),
        outputPayload.style.join(' '),
        outputPayload.style_keywords.join(' '),
        outputPayload.season,
        outputPayload.usage,
        outputPayload.weather,
      ].filter(Boolean).join('. ')

      const outputEmbedding = await generateEmbedding(memoryEmbeddingText)

      await supabaseServer.from('ai_product_memory').insert({
        product_id: body.productId || null,
        source: 'ai_generate',
        category: body.category || 'uncategorized',
        title: body.name || null,
        image_description: body.imageDescription || null,
        attributes: {
          category: body.category || null,
          fabric: outputPayload.fabric || null,
          season: outputPayload.season || null,
          gender: outputPayload.gender || null,
          style: outputPayload.style || null,
          fit: outputPayload.fit || null,
          usage: outputPayload.usage || null,
          weather: outputPayload.weather || null,
          style_keywords: outputPayload.style_keywords || null,
          price_range: body.priceRange || null,
          target_audience: outputPayload.target_audience || null,
        },
        ai_output: outputPayload,
        embedding: JSON.stringify(outputEmbedding.embedding),
      })
    } catch (memorySaveError) {
      console.warn('[AI_GENERATE_PRODUCT] Memory save failed:', memorySaveError)
    }

    return NextResponse.json(outputPayload)
  } catch (error) {
    console.error('[AI_GENERATE_PRODUCT] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
