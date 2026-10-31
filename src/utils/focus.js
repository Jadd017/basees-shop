// Focus point of a product photo: the spot (in percent of the photo's width/height) that stays in
// view when the photo is cropped to a square. Photos saved before this existed have none: 50/50.
export const DEFAULT_FOCUS = 50

const clamp = (v) => Math.min(100, Math.max(0, Math.round(v * 10) / 10))

// { focusX, focusY } with defaults filled in — for saving and for the admin.
export function focusOf(item) {
  return {
    focusX: clamp(typeof item?.focusX === 'number' ? item.focusX : DEFAULT_FOCUS),
    focusY: clamp(typeof item?.focusY === 'number' ? item.focusY : DEFAULT_FOCUS),
  }
}

// CSS object-position for an <img> with object-fit: cover.
export function objectPosition(item) {
  const { focusX, focusY } = focusOf(item)
  return `${focusX}% ${focusY}%`
}
