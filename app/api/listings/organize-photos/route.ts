import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const VALID_SLOT_TYPES = [
  'front', 'rear', 'hood', 'roof', 'left_side', 'right_side',
  'front_left_corner', 'front_right_corner', 'front_left_lateral', 'front_right_lateral',
  'left_lateral_low', 'right_lateral_low', 'rear_left_corner', 'rear_right_corner',
  'rear_left_lateral', 'rear_right_lateral', 'front_left_wheel', 'front_right_wheel',
  'rear_left_wheel', 'rear_right_wheel', 'left_rocker_panel', 'right_rocker_panel',
  'left_frame', 'right_frame', 'front_frame', 'rear_frame',
  'front_left_interior', 'front_right_interior', 'rear_left_interior', 'rear_right_interior',
  'dashboard', 'center_stack', 'gauge_cluster', 'headliner', 'odometer',
  'engine', 'engine_oil', 'under_oil_cap', 'engine_coolant', 'emissions_sticker',
  'readiness_monitors', 'obdii_codes',
  'vin_sticker', 'keys', 'damage',
] as const

interface PhotoInput {
  id: string
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const photos = body.photos as PhotoInput[]

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
    }

    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    for (const photo of photos) {
      content.push({ type: 'image' as const, source: { type: 'url' as const, url: photo.url } })
      content.push({ type: 'text' as const, text: `Photo ID: ${photo.id}` })
    }

    content.push({
      type: 'text' as const,
      text: `You are classifying vehicle inspection photos. Assign each photo to exactly one slot_type from this list:

EXTERIOR: front, rear, hood, roof, left_side, right_side, front_left_corner, front_right_corner, front_left_lateral, front_right_lateral, left_lateral_low, right_lateral_low, rear_left_corner, rear_right_corner, rear_left_lateral, rear_right_lateral, front_left_wheel, front_right_wheel, rear_left_wheel, rear_right_wheel, left_rocker_panel, right_rocker_panel, left_frame, right_frame, front_frame, rear_frame

INTERIOR: front_left_interior, front_right_interior, rear_left_interior, rear_right_interior, dashboard, center_stack, gauge_cluster, headliner, odometer

MECHANICAL: engine, engine_oil, under_oil_cap, engine_coolant, emissions_sticker, readiness_monitors, obdii_codes

MISC: vin_sticker, keys, damage

Respond ONLY with a JSON array. No markdown. Example:
[{"id":"abc","slot_type":"front"},{"id":"def","slot_type":"dashboard"}]`,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Strip markdown code fences if present
    const jsonText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(jsonText) as { id: string; slot_type: string }[]

    const assignments = parsed.map(item => ({
      id: item.id,
      slot_type: VALID_SLOT_TYPES.includes(item.slot_type as typeof VALID_SLOT_TYPES[number])
        ? item.slot_type
        : 'damage',
    }))

    // Default any unclassified photos to null
    for (const photo of photos) {
      if (!assignments.find(a => a.id === photo.id)) {
        assignments.push({ id: photo.id, slot_type: 'damage' })
      }
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Photo organization error:', error)
    return NextResponse.json({ error: 'Failed to organize photos' }, { status: 500 })
  }
}
