export interface PhotoSlot {
  id: string
  label: string
}

export interface PhotoSection {
  id: string
  title: string
  slots: PhotoSlot[]
}

export const PHOTO_SECTIONS: PhotoSection[] = [
  {
    id: 'exterior',
    title: 'Exterior',
    slots: [
      { id: 'front',               label: 'Front' },
      { id: 'rear',                label: 'Rear' },
      { id: 'hood',                label: 'Hood' },
      { id: 'roof',                label: 'Roof' },
      { id: 'left_side',           label: 'Left Side' },
      { id: 'right_side',          label: 'Right Side' },
      { id: 'front_left_corner',   label: 'Front Left Corner' },
      { id: 'front_right_corner',  label: 'Front Right Corner' },
      { id: 'front_left_lateral',  label: 'Front Left Lateral' },
      { id: 'front_right_lateral', label: 'Front Right Lateral' },
      { id: 'left_lateral_low',    label: 'Left Lateral Low' },
      { id: 'right_lateral_low',   label: 'Right Lateral Low' },
      { id: 'rear_left_corner',    label: 'Rear Left Corner' },
      { id: 'rear_right_corner',   label: 'Rear Right Corner' },
      { id: 'rear_left_lateral',   label: 'Rear Left Lateral' },
      { id: 'rear_right_lateral',  label: 'Rear Right Lateral' },
      { id: 'front_left_wheel',    label: 'Front Left Wheel' },
      { id: 'front_right_wheel',   label: 'Front Right Wheel' },
      { id: 'rear_left_wheel',     label: 'Rear Left Wheel' },
      { id: 'rear_right_wheel',    label: 'Rear Right Wheel' },
      { id: 'left_rocker_panel',   label: 'Left Rocker Panel' },
      { id: 'right_rocker_panel',  label: 'Right Rocker Panel' },
      { id: 'left_frame',          label: 'Left Frame' },
      { id: 'right_frame',         label: 'Right Frame' },
      { id: 'front_frame',         label: 'Front Frame' },
      { id: 'rear_frame',          label: 'Rear Frame' },
    ],
  },
  {
    id: 'interior',
    title: 'Interior',
    slots: [
      { id: 'front_left_interior',  label: 'Front Left' },
      { id: 'front_right_interior', label: 'Front Right' },
      { id: 'rear_left_interior',   label: 'Rear Left' },
      { id: 'rear_right_interior',  label: 'Rear Right' },
      { id: 'dashboard',            label: 'Dashboard' },
      { id: 'center_stack',         label: 'Center Stack' },
      { id: 'gauge_cluster',        label: 'Gauge Cluster' },
      { id: 'headliner',            label: 'Headliner' },
      { id: 'odometer',             label: 'Odometer' },
    ],
  },
  {
    id: 'mechanicals',
    title: 'Mechanicals',
    slots: [
      { id: 'engine',             label: 'Engine' },
      { id: 'engine_oil',         label: 'Engine Oil' },
      { id: 'under_oil_cap',      label: 'Under Oil Cap' },
      { id: 'engine_coolant',     label: 'Engine Coolant' },
      { id: 'emissions_sticker',  label: 'Emissions Sticker' },
      { id: 'readiness_monitors', label: 'Readiness Monitors' },
      { id: 'obdii_codes',        label: 'OBD-II Codes' },
    ],
  },
  {
    id: 'misc',
    title: 'VIN, Keys & Damage',
    slots: [
      { id: 'vin_sticker', label: 'VIN Stickers & Plates' },
      { id: 'keys',        label: 'Keys' },
      { id: 'damage',      label: 'Damage' },
    ],
  },
]
