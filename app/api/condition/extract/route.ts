import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AiConditionData } from '@/lib/types/condition'

const EXTRACTION_PROMPT = `You are a vehicle inspection report analyzer. Extract all condition information from this inspection report PDF and return it as valid JSON.

Use these exact rating values: "excellent", "good", "average", or "bad"

Return ONLY a valid JSON object with no additional text and no markdown code blocks:

{
  "exterior": {
    "rating": "excellent|good|average|bad",
    "rating_reason": "2-3 sentences explaining the exterior rating based on specific findings",
    "body_defects": ["list of body defect descriptions"],
    "scratches_dings_dents": "description of scratches, dings, dents or empty string",
    "bumper_fender_damage": "description of bumper or fender damage or empty string",
    "paint_meter_readings": [{"panel": "panel name", "reading": "reading value with units"}],
    "rust_areas": ["list of areas with rust"],
    "glass_damage": ["list of glass damage items"],
    "glass_inspector_notes": "inspector notes on glass condition or empty string"
  },
  "interior": {
    "rating": "excellent|good|average|bad",
    "rating_reason": "2-3 sentences explaining the interior rating based on specific findings",
    "seat_wear_degraded": true,
    "seat_wear_severity": "minor|moderate|severe or null if not degraded",
    "odor": "smoke|mold_mildew|burnt|other|none",
    "odor_notes": "additional odor notes or empty string",
    "climate_control_working": true,
    "missing_or_broken": ["list of non-functional or missing interior items"],
    "trim_damage_summary": "AI summary evaluating how intact the original interior is",
    "cosmetic_defects": "description of interior scratches, dents, or cosmetic damage or empty string"
  },
  "mechanical": {
    "rating": "excellent|good|average|bad",
    "rating_reason": "2-3 sentences explaining the mechanical rating based on specific findings",
    "obdii_codes": [{"code": "P0xxx", "description": "fault description", "monitor_status": "complete|incomplete|not run"}],
    "engine_noise_db": null,
    "engine_abnormalities": "description of any engine abnormalities or empty string",
    "fluid_leaks": [{"fluid": "fluid type", "severity": "minor|moderate|severe"}],
    "drive_notes": "test drive observations covering suspension, transmission, and brakes"
  },
  "tires": {
    "rating": "excellent|good|average|bad",
    "rating_reason": "2-3 sentences explaining the tires/wheels rating based on specific findings",
    "tread_fl": 7.5,
    "tread_fr": 7.5,
    "tread_rl": 6.0,
    "tread_rr": 6.0,
    "wheel_rim_damage": "description of wheel or rim damage or empty string"
  }
}

Use null for numeric values not found in the report. Use empty arrays for lists with no items. Make reasonable assessments for ratings based on the totality of findings in each section.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const storageKey = formData.get('storageKey') as string
    const listingId  = formData.get('listingId')  as string

    if (!storageKey || !listingId) {
      return NextResponse.json({ error: 'Missing storageKey or listingId' }, { status: 400 })
    }

    // Admins can analyze any listing; sellers can only analyze their own
    const isAdmin = user.app_metadata?.role === 'admin'
    const admin = createAdminClient()
    const listingQuery = isAdmin
      ? admin.from('listings').select('id').eq('id', listingId).single()
      : supabase.from('listings').select('id').eq('id', listingId).eq('seller_id', user.id).single()

    const { data: listing } = await listingQuery
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    // Download the PDF from Supabase storage
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from('car-documents')
      .download(storageKey)

    if (downloadError || !fileBlob) {
      return NextResponse.json({ error: `Failed to download PDF: ${downloadError?.message ?? 'unknown'}` }, { status: 500 })
    }

    const buffer = await fileBlob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role:    'user',
        content: [
          {
            type:   'document',
            source: {
              type:       'base64',
              media_type: 'application/pdf',
              data:       base64,
            },
          } as never,
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      }],
    })

    const rawText = response.content.find(b => b.type === 'text')
    if (!rawText || rawText.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    let data: AiConditionData
    try {
      const cleaned = rawText.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      data = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[condition/extract]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
