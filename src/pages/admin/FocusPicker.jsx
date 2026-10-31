import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { focusOf, objectPosition } from '../../utils/focus.js'

// Lets the admin choose a photo's focus point: tap or drag on the whole photo, and the square
// preview (same shape and crop as the shop's gallery and category cards) updates live.
// Arrow keys move the point too (Shift = bigger steps).
export default function FocusPicker({ image, initial, title, onSave, onCancel }) {
  const [focus, setFocus] = useState(() => focusOf(initial))
  const photoRef = useRef(null)
  const titleId = useId()
  const hintId = useId()
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    const returnTo = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden' // no page scrolling behind the sheet
    const onKey = (e) => e.key === 'Escape' && onCancelRef.current()
    document.addEventListener('keydown', onKey)
    photoRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      returnTo?.focus?.()
    }
  }, [])

  const setFromPointer = (event) => {
    const rect = photoRef.current.getBoundingClientRect()
    setFocus(
      focusOf({
        focusX: ((event.clientX - rect.left) / rect.width) * 100,
        focusY: ((event.clientY - rect.top) / rect.height) * 100,
      }),
    )
  }

  const onPointerDown = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId) // keep dragging even outside the photo
    setFromPointer(event)
  }

  const onPointerMove = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event)
  }

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    setFocus((f) => focusOf({ focusX: f.focusX + move[0], focusY: f.focusY + move[1] }))
  }

  return createPortal(
    <div className="focus-picker" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="focus-picker__sheet">
        <h2 id={titleId} className="focus-picker__title">
          Set focus · {title}
        </h2>
        <p id={hintId} className="admin-hint focus-picker__hint">
          Tap or drag on the photo to choose what should be in the centre.
        </p>

        <div className="focus-picker__stage">
          <div
            ref={photoRef}
            className="focus-picker__photo"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="group"
            aria-label={`Focus point: ${Math.round(focus.focusX)}% from the left, ${Math.round(focus.focusY)}% from the top. Use the arrow keys to move it.`}
            aria-describedby={hintId}
          >
            <img src={image} alt="" draggable="false" />
            <span
              className="focus-picker__marker"
              style={{ left: `${focus.focusX}%`, top: `${focus.focusY}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <p className="focus-picker__label">What customers see</p>
        <div className="focus-picker__preview">
          <img src={image} alt="Preview of the cropped photo" style={{ objectPosition: objectPosition(focus) }} />
        </div>
        <p className="admin-hint focus-picker__note">
          Product page and shop cards. Tapping the photo still shows all of it.
        </p>

        <div className="focus-picker__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => onSave(focus)}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
