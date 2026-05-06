import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin/auth'
import { generateText } from '@/lib/ai/actions'

type AIRequestBody = {
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
}

const AiContentSchema = z.object({
  ai_title: z.string().min(1),
  ai_description: z.string().min(1),
  short_description: z.string().min(1),
  long_description: z.string().min(1),
  bullet_points: z.array(z.string()).min(3).max(8),
  ai_tags: z.array(z.string()).min(3).max(20),
  season: z.string().optional().nullable(),
  usage: z.string().optional().nullable(),
  fabric: z.array(z.string()).optional().nullable(),
  style: z.array(z.string()).optional().nullable(),
  weather: z.string().optional().nullable(),
  style_keywords: z.array(z.string()).optional().nullable(),
  gender: z.string().optional().nullable(),
  fit: z.string().optional().nullable(),
  target_audience: z.string().optional().nullable(),
  seo: z.object({
    meta_title: z.string().min(1),
    meta_description: z.string().min(1),
    slug: z.string().min(1),
  }),
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function clampLength(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max - 1).trimEnd()
}

function parseCsv(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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

function seoSubscores(content: z.infer<typeof AiContentSchema>) {
  const metaTitleLength = content.seo.meta_title.length
  const metaDescriptionLength = content.seo.meta_description.length
  const slugQuality = /^[a-z0-9-]+$/.test(content.seo.slug) ? 100 : 40
  const titleFit = clamp(100 - Math.abs(58 - metaTitleLength) * 3)
  const descriptionFit = clamp(100 - Math.abs(155 - metaDescriptionLength) * 1.5)
  const keywordPresence = /\b(cotton|shirt|t-shirt|premium|comfort|fit|breathable|style)\b/i.test(
    `${content.ai_title} ${content.short_description} ${content.ai_tags.join(' ')}`
  )
    ? 80
    : 55

  return {
    titleFit,
    descriptionFit,
    slugQuality,
    keywordPresence,
  }
}

function conversionSubscores(content: z.infer<typeof AiContentSchema>) {
  const bullets = content.bullet_points.length
  const scannability = clamp(40 + bullets * 10)
  const ctaPresence = /\b(shop|buy|discover|upgrade|get|order)\b/i.test(content.long_description) ? 85 : 55
  const benefitsDensity = clamp((content.bullet_points.filter((point) => point.length >= 18).length / Math.max(1, bullets)) * 100)
  const clarity = content.short_description.length >= 90 ? 85 : 60

  return {
    scannability,
    ctaPresence,
    benefitsDensity,
    clarity,
  }
}

function brandSubscores(content: z.infer<typeof AiContentSchema>) {
  const brandTone = /\b(premium|crafted|signature|heritage|timeless|quality)\b/i.test(content.long_description) ? 85 : 55
  const voiceConsistency = /\b(you|your)\b/i.test(content.short_description) ? 75 : 65
  const keywordDepth = content.style_keywords && content.style_keywords.length >= 5 ? 85 : 60
  const tagDepth = content.ai_tags.length >= 6 ? 85 : 60

  return {
    brandTone,
    voiceConsistency,
    keywordDepth,
    tagDepth,
  }
}

function computeScores(content: z.infer<typeof AiContentSchema>) {
  const seo = seoSubscores(content)
  const conversion = conversionSubscores(content)
  const brand = brandSubscores(content)

  const seoScore = clamp(
    0.30 * seo.titleFit +
      0.30 * seo.descriptionFit +
      0.20 * seo.slugQuality +
      0.20 * seo.keywordPresence
  )

  const conversionScore = clamp(
    0.30 * conversion.benefitsDensity +
      0.25 * conversion.ctaPresence +
      0.25 * conversion.scannability +
      0.20 * conversion.clarity
  )

  const brandScore = clamp(
    0.40 * brand.brandTone +
      0.20 * brand.voiceConsistency +
      0.20 * brand.keywordDepth +
      0.20 * brand.tagDepth
  )

  const overall = clamp(0.4 * seoScore + 0.35 * conversionScore + 0.25 * brandScore)

  return {
    seo: Math.round(seoScore),
    conversion: Math.round(conversionScore),
    brand: Math.round(brandScore),
    overall: Math.round(overall),
    breakdown: {
      seo,
      conversion,
      brand,
    },
  }
}

function normalizeContent(parsed: Record<string, unknown>, body: AIRequestBody) {
  const parsedSeo = parsed.seo && typeof parsed.seo === 'object' ? (parsed.seo as Record<string, unknown>) : null

  const candidate = {
    ai_title: String(parsed.ai_title || body.name || '').trim(),
    ai_description: String(parsed.ai_description || parsed.long_description || body.description || '').trim(),
    short_description: String(parsed.short_description || body.shortDescription || '').trim(),
    long_description: String(parsed.long_description || body.description || '').trim(),
    bullet_points: Array.isArray(parsed.bullet_points) ? parsed.bullet_points.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean) : [],
    ai_tags: Array.isArray(parsed.ai_tags) ? parsed.ai_tags.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean) : [],
    season: parsed.season ? String(parsed.season).trim() : body.season || null,
    usage: parsed.usage ? String(parsed.usage).trim() : body.usage || null,
    fabric: Array.isArray(parsed.fabric) ? parsed.fabric.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean) : parseCsv(body.fabric),
    style: Array.isArray(parsed.style) ? parsed.style.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean) : parseCsv(body.style),
    weather: parsed.weather ? String(parsed.weather).trim() : body.weather || null,
    style_keywords: Array.isArray(parsed.style_keywords)
      ? parsed.style_keywords.filter((x) => typeof x === 'string').map((x) => String(x).trim()).filter(Boolean)
      : parseCsv(body.styleKeywords),
    gender: parsed.gender ? String(parsed.gender).trim() : body.gender || null,
    fit: parsed.fit ? String(parsed.fit).trim() : body.fit || null,
    target_audience: parsed.target_audience ? String(parsed.target_audience).trim() : body.targetAudience || null,
    seo: {
      meta_title: clampLength(String(parsedSeo?.meta_title || body.name || ''), 60),
      meta_description: clampLength(String(parsedSeo?.meta_description || body.shortDescription || body.description || ''), 160),
      slug: slugify(String(parsedSeo?.slug || body.name || 'product')),
    },
  }

  if (candidate.bullet_points.length < 3) {
    const fallback = [
      'Premium-quality construction for reliable daily wear',
      'Comfort-forward fit designed for all-day use',
      'Clean styling that pairs easily across occasions',
    ]
    candidate.bullet_points = [...candidate.bullet_points, ...fallback].slice(0, 5)
  }

  if (candidate.ai_tags.length < 3) {
    candidate.ai_tags = [...candidate.ai_tags, ...(parseCsv(body.styleKeywords).slice(0, 5))]
    if (candidate.ai_tags.length < 3) {
      candidate.ai_tags = [...candidate.ai_tags, 'premium', 'versatile', 'everyday'].slice(0, 6)
    }
  }

  if (!candidate.short_description) {
    candidate.short_description = 'Professionally crafted product designed for comfort, style, and everyday confidence.'
  }

  if (!candidate.long_description) {
    candidate.long_description = candidate.short_description
  }

  if (!candidate.ai_description) {
    candidate.ai_description = candidate.long_description
  }

  return AiContentSchema.parse(candidate)
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = (await request.json()) as AIRequestBody

    if (!body.name?.trim() || !body.category?.trim()) {
      return NextResponse.json(
        {
          error: 'Product name and category are required',
        },
        { status: 400 }
      )
    }

    const prompt = `SYSTEM:\nYou are an elite ecommerce content strategist for apparel brands.\nGenerate a professional, SEO healthy, conversion healthy, and brand-positive output in strict JSON only.\n\nINPUT:\nName: ${body.name}\nCategory: ${body.category}\nDescription: ${body.description || body.shortDescription || 'Not provided'}\nShort Description: ${body.shortDescription || 'Not provided'}\nBullet Points: ${body.bulletPoints || 'Not provided'}\nFabric: ${body.fabric || 'Not provided'}\nSeason: ${body.season || 'Not provided'}\nGender: ${body.gender || 'Not provided'}\nStyle: ${body.style || 'Not provided'}\nFit: ${body.fit || 'Not provided'}\nUsage: ${body.usage || 'Not provided'}\nWeather: ${body.weather || 'Not provided'}\nStyle Keywords: ${body.styleKeywords || 'Not provided'}\nPrice Range: ${body.priceRange || 'Not provided'}\nTarget Audience: ${body.targetAudience || 'Not provided'}\n\nOUTPUT JSON SHAPE:\n{\n  \"ai_title\": \"\",\n  \"ai_description\": \"\",\n  \"short_description\": \"\",\n  \"long_description\": \"\",\n  \"bullet_points\": [\"\"],\n  \"ai_tags\": [\"\"],\n  \"season\": \"\",\n  \"usage\": \"\",\n  \"fabric\": [\"\"],\n  \"style\": [\"\"],\n  \"weather\": \"\",\n  \"style_keywords\": [\"\"],\n  \"gender\": \"\",\n  \"fit\": \"\",\n  \"target_audience\": \"\",\n  \"seo\": {\n    \"meta_title\": \"\",\n    \"meta_description\": \"\",\n    \"slug\": \"\"\n  }\n}\n\nRULES:\n- Return valid JSON only.\n- Keep meta_title <= 60 chars and meta_description <= 160 chars.\n- Keep bullet_points between 4 and 7 items.\n- Use persuasive but factual brand language.\n- Include strong conversion intent while avoiding spammy claims.`

    const aiRaw = await generateText(prompt, {
      temperature: 0.4,
      maxTokens: 1100,
    })

    const parsed = extractJson(aiRaw)
    const content = normalizeContent(parsed, body)
    const scores = computeScores(content)

    return NextResponse.json({ content, scores })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate AI assistant content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
