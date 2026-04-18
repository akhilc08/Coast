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
      text: `You are a vehicle inspection photo classifier. Each photo above is labeled with its Photo ID.

For EACH photo, follow this two-step process:
1. Briefly describe what you see: camera angle, distance, what fills the frame, and whether it is exterior/interior/mechanical.
2. Based on that description, assign the single best slot_type from the list below.

=== SLOT DEFINITIONS ===

EXTERIOR — full-body angles:
- front: Camera directly in front of the car, car facing the lens head-on. Grille, bumper, both headlights, and license plate all visible and roughly centered. No side body visible.
- rear: Camera directly behind the car. Taillights, rear bumper, and license plate centered. No side body visible. Includes shots with trunk/hatch open.
- hood: Camera positioned just in front of and slightly above the car, pointing DOWN at the closed hood surface. The hood fills the majority of the frame; windshield may appear at far edge.
- roof: Camera looking straight down at the roof panel from above. Roof fills the frame; no side glass or body panels prominent.
- left_side: Pure full-length profile of the driver side. Entire car visible from front bumper to rear bumper. Camera perpendicular to the car at mid-height. No front or rear fascia visible.
- right_side: Pure full-length profile of the passenger side. Same as left_side but mirrored.
- front_left_corner: 3/4 angle from front-left. BOTH front fascia AND left side visible simultaneously. Front-left headlight and left front door/fender both in frame.
- front_right_corner: 3/4 angle from front-right. BOTH front AND right side visible. Front-right headlight and right fender/door both in frame.
- rear_left_corner: 3/4 angle from rear-left. Both rear AND left side visible. Rear-left taillight and left rear quarter panel both in frame.
- rear_right_corner: 3/4 angle from rear-right. Both rear AND right side visible. Rear-right taillight and right rear quarter panel both in frame.
- front_left_lateral: Mid-height close-up of the front-left quarter panel zone between the front wheel arch and the driver door. A zoomed-in section, not a full side or corner shot.
- front_right_lateral: Mid-height close-up of the front-right quarter panel zone between the front wheel arch and the passenger door.
- rear_left_lateral: Mid-height close-up of the rear-left quarter panel between the rear wheel arch and the rear bumper corner.
- rear_right_lateral: Mid-height close-up of the rear-right quarter panel between the rear wheel arch and the rear bumper corner.
- left_lateral_low: Camera at or near ground level on the driver/left side pointing along the lower body. Sill, lower door panels, and rocker visible from a very low perspective.
- right_lateral_low: Camera at or near ground level on the passenger/right side.
- front_left_wheel: Close-up of the front-left wheel — rim, tire sidewall, and brake caliper fill the frame.
- front_right_wheel: Close-up of the front-right wheel.
- rear_left_wheel: Close-up of the rear-left wheel.
- rear_right_wheel: Close-up of the rear-right wheel.
- left_rocker_panel: Camera pointing at the left sill/rocker panel — the long horizontal strip between the wheel arches at the very bottom of the door opening. Often shot from a low crouch or slightly underneath.
- right_rocker_panel: Same as left_rocker_panel but passenger side.
- left_frame: Camera underneath on the driver/left side showing actual steel frame rails, crossmembers, or suspension from below.
- right_frame: Camera underneath on the passenger/right side.
- front_frame: Camera underneath pointing at the front subframe, cradle, or radiator support.
- rear_frame: Camera underneath pointing at the rear frame or subframe area.

INTERIOR — inside the cabin:
- front_left_interior: Shot from the driver door opening looking inward. Steering wheel prominent, driver seat visible, door panel on the left.
- front_right_interior: Shot from the passenger door opening. Passenger seat center-frame, both front seats often visible from the side.
- rear_left_interior: From the rear driver-side door opening. Rear left seat and rear left door panel visible.
- rear_right_interior: From the rear passenger-side door opening. Rear right seat and door panel visible.
- dashboard: Full-width view of the instrument panel spanning the entire frame, shot from inside looking forward at the dash.
- center_stack: Close-up of the infotainment/radio screen, HVAC controls, and/or center console. Screen and controls fill the frame.
- gauge_cluster: Tight close-up of the instrument cluster (speedometer, tachometer) behind the steering wheel.
- headliner: Camera pointing straight up at the interior ceiling/roof lining from inside the cabin.
- odometer: Very close-up of the odometer digits showing the mileage reading.

MECHANICAL — under-hood and diagnostic:
- engine: Hood open. Camera above the engine bay looking DOWN at the entire engine. Full engine bay visible.
- engine_oil: Oil dipstick pulled out, held up or laid flat, showing oil level/color on the stick.
- under_oil_cap: Camera pointed into the oil filler cap opening showing inside the valve cover.
- engine_coolant: Close-up of the plastic coolant overflow/reservoir tank showing fluid level and color.
- emissions_sticker: Under-hood decal/label with emissions specs, tune-up info, or vacuum routing diagram.
- readiness_monitors: Phone screen or OBD scan tool showing emissions readiness monitor status.
- obdii_codes: Phone screen or OBD scan tool showing diagnostic trouble codes or "No codes found."

MISC:
- vin_sticker: VIN label on door jamb sticker, dashboard VIN plate visible through windshield, or title document showing the VIN.
- keys: Vehicle key(s) and/or key fob(s) laid out on a flat surface.
- damage: Photo whose PRIMARY subject is a specific defect — dent, scratch, rust, crack, chip. Only use when damage is the clear focus, not incidental.

=== DISAMBIGUATION RULES ===
Apply these before finalizing any assignment:

EXTERIOR ANGLES:
- If you can see BOTH a front/rear fascia AND a side panel → it's a corner (front_left_corner, front_right_corner, rear_left_corner, rear_right_corner), NOT front/rear/left_side/right_side.
- If the entire car fits in frame side-on with no front/rear visible → left_side or right_side. If it's zoomed into just a section of the side → lateral.
- If the camera is at knee height or lower along the side → lateral_low. If it's pointing at the thin sill strip between the doors → rocker_panel. If it's pointing underneath the car → frame.
- Wheel close-ups: if a single wheel and tire fill most of the frame → wheel slot. Don't confuse with a lateral or low shot where a wheel happens to be in frame.

INTERIOR:
- If the steering wheel is large and prominent → front_left_interior (driver side). If the passenger seat dominates → front_right_interior.
- dashboard vs gauge_cluster: dashboard spans full width. gauge_cluster is tightly cropped on just the instrument dials.
- dashboard vs center_stack: dashboard includes the whole panel. center_stack is cropped on the screen/controls in the middle.
- odometer: only use if the shot is a tight macro of the mileage digits specifically.

MECHANICAL:
- engine vs hood: engine = hood is OPEN and you can see the engine components. hood = hood is CLOSED and the photo is of the hood surface from above.
- engine_oil vs under_oil_cap: dipstick in hand showing oil residue → engine_oil. Camera looking into the filler hole → under_oil_cap.
- readiness_monitors vs obdii_codes: readiness monitors show a list of system statuses (ready/not ready). obdii_codes show actual fault codes (e.g. P0420) or explicitly say no codes.

MISC:
- damage: only assign if the photo is deliberately focused on a defect. General exterior shots that happen to have minor wear are NOT damage.
- vin_sticker: must clearly show a VIN number string. Don't assign if the label is blurry or the VIN isn't the subject.

=== OUTPUT FORMAT ===
Respond with a raw JSON array only — no markdown, no explanation outside the JSON.
For each photo include: id (exact string from input), reasoning (one sentence describing what you see), slot_type, confidence (0.0–1.0).

Example:
[
  {"id":"abc-123","reasoning":"Straight-on front view, grille and both headlights centered, no side body visible","slot_type":"front","confidence":0.96},
  {"id":"def-456","reasoning":"Full-width dashboard in frame, shot from driver seat looking at instrument panel","slot_type":"dashboard","confidence":0.91}
]`,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content }],
    })

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Strip markdown code fences if present
    const jsonText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(jsonText) as { id: string; slot_type: string; confidence?: number; reasoning?: string }[]

    const assignments = parsed.map(item => ({
      id: item.id,
      slot_type: VALID_SLOT_TYPES.includes(item.slot_type as typeof VALID_SLOT_TYPES[number])
        ? item.slot_type
        : 'damage',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    }))

    // Default any unclassified photos
    for (const photo of photos) {
      if (!assignments.find(a => a.id === photo.id)) {
        assignments.push({ id: photo.id, slot_type: 'damage', confidence: 0 })
      }
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Photo organization error:', error)
    return NextResponse.json({ error: 'Failed to organize photos' }, { status: 500 })
  }
}
