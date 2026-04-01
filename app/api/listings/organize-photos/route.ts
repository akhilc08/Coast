import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const VALID_CATEGORIES = [
  'exterior_front',
  'exterior_rear',
  'exterior_side',
  'interior_dashboard',
  'interior_seats',
  'engine',
  'wheels',
  'damage',
  'other',
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

    // Process photos in batches to avoid overwhelming the API
    const results: { id: string; category: string }[] = []

    // Build a single prompt with all photo URLs for efficiency
    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    for (const photo of photos) {
      content.push({
        type: 'image' as const,
        source: {
          type: 'url' as const,
          url: photo.url,
        },
      })
      content.push({
        type: 'text' as const,
        text: `Photo ID: ${photo.id}`,
      })
    }

    content.push({
      type: 'text' as const,
      text: `Categorize each photo above into one of these categories:
- exterior_front: Front view of the vehicle
- exterior_rear: Rear view of the vehicle
- exterior_side: Side view of the vehicle
- interior_dashboard: Dashboard/instrument panel
- interior_seats: Seats (front or rear)
- engine: Engine bay
- wheels: Wheels/tires
- damage: Visible damage areas
- other: Anything else (VIN plates, keys, documents, etc.)

Respond ONLY with a JSON array of objects with "id" and "category" fields. No markdown, no explanation. Example:
[{"id":"abc","category":"exterior_front"},{"id":"def","category":"interior_seats"}]`,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Parse the JSON response
    const parsed = JSON.parse(responseText) as { id: string; category: string }[]

    for (const item of parsed) {
      const category = VALID_CATEGORIES.includes(item.category as typeof VALID_CATEGORIES[number])
        ? item.category
        : 'other'
      results.push({ id: item.id, category })
    }

    // For any photos not categorized, default to 'other'
    for (const photo of photos) {
      if (!results.find(r => r.id === photo.id)) {
        results.push({ id: photo.id, category: 'other' })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Photo organization error:', error)
    return NextResponse.json(
      { error: 'Failed to organize photos' },
      { status: 500 }
    )
  }
}
