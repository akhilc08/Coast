'use client'

export async function normalizeImage(file: File): Promise<File> {
  // 1. Convert HEIC/HEIF to JPEG first
  const name = file.name.toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
  if (isHeic) {
    try {
      const heic2any = (await import('heic2any')).default
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
      const blob = Array.isArray(result) ? result[0] : result
      file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
    } catch {
      console.warn('[upload] heic2any failed, uploading as-is:', file.name)
      file = new File([file], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
    }
  }

  // 2. Draw through canvas to bake in EXIF rotation
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const outName = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], outName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}
