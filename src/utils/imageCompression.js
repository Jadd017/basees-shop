// Browser-side image compression for images stored as base64 in Firestore.
// Sizes are measured on the data URL string, because that's what counts
// towards Firestore's 1 MB document limit.

export const THUMBNAIL = { maxWidth: 400, target: 40_000 }
export const FULL_IMAGE = { maxWidth: 1200, target: 200_000 }
const HARD_LIMIT = 700_000

const START_QUALITY = 0.82
const MIN_TARGET_QUALITY = 0.5 // don't go blurrier than this just to hit the target
const MIN_QUALITY = 0.2 // ...unless we're over HARD_LIMIT

let outputType
// Safari can't encode WebP from a canvas on some versions — fall back to JPEG there.
function getOutputType() {
  if (!outputType) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    outputType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'
  }
  return outputType
}

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error('This image format isn’t supported. Please choose a JPG, PNG or WebP photo.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function render(source, width, quality, type) {
  const scale = width / source.width
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(source.height * scale)
  const ctx = canvas.getContext('2d')
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#F6EBD9' // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(type, quality)
}

function compress(source, { maxWidth, target }) {
  const type = getOutputType()
  let width = Math.min(maxWidth, source.width)
  let quality = START_QUALITY
  let dataUrl = render(source, width, quality, type)

  // 1) Lower quality towards the target size, within reason.
  while (dataUrl.length > target && quality > MIN_TARGET_QUALITY + 0.001) {
    quality = Math.max(MIN_TARGET_QUALITY, quality - 0.08)
    dataUrl = render(source, width, quality, type)
  }
  // 2) Still too big for Firestore: keep lowering quality, then shrink.
  while (dataUrl.length > HARD_LIMIT) {
    if (quality > MIN_QUALITY + 0.001) quality = Math.max(MIN_QUALITY, quality - 0.1)
    else width = Math.round(width * 0.8)
    dataUrl = render(source, width, quality, type)
  }
  return { dataUrl, bytes: dataUrl.length, width: Math.round(width), quality, type }
}

// Returns { thumbnail, image } — each { dataUrl, bytes, width, quality, type }.
export async function compressProductImage(file) {
  const source = await decode(file)
  try {
    return { thumbnail: compress(source, THUMBNAIL), image: compress(source, FULL_IMAGE) }
  } finally {
    source.close?.()
  }
}

export function formatBytes(bytes) {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`
}
