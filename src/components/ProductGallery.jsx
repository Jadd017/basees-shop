import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { objectPosition } from '../utils/focus.js'
import './ProductGallery.css'

// Keeps `index` in sync with a horizontally scroll-snapping track and lets us jump to a slide.
function useSlider(count, initialIndex = 0) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(initialIndex)

  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !track.clientWidth) return
    setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))))
  }, [count])

  const goTo = useCallback((i, smooth = true) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
    setIndex(i)
  }, [])

  return { trackRef, index, onScroll, goTo }
}

function Arrows({ index, count, goTo, className = '' }) {
  return (
    <>
      <button
        type="button"
        className={`gallery__arrow gallery__arrow--prev ${className}`}
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        aria-label="Previous photo"
      >
        ‹
      </button>
      <button
        type="button"
        className={`gallery__arrow gallery__arrow--next ${className}`}
        onClick={() => goTo(index + 1)}
        disabled={index === count - 1}
        aria-label="Next photo"
      >
        ›
      </button>
    </>
  )
}

// ⤢ drawn as SVG: the character itself is missing from many Android fonts.
function ExpandIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// `images`: [{ src, focusX, focusY }], main photo first. While the photos load, pass just the thumbnail.
// The big image and the thumbnails are cropped to squares around each photo's focus point;
// the full-screen viewer shows the whole photo.
export default function ProductGallery({ images, alt }) {
  const count = images.length
  const multi = count > 1
  const { trackRef, index, onScroll, goTo } = useSlider(count)
  const [fullscreenAt, setFullscreenAt] = useState(null)

  // If the photo list changes (thumbnail → all photos), stay on a valid slide.
  useEffect(() => {
    if (index > count - 1) goTo(0, false)
  }, [count, index, goTo])

  return (
    <div className="gallery">
      <div className="product__media gallery__main">
        <div
          ref={trackRef}
          className="gallery__track"
          onScroll={onScroll}
          aria-roledescription={multi ? 'carousel' : undefined}
          aria-label={multi ? `${alt} photos` : undefined}
        >
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              className="gallery__slide"
              onClick={() => setFullscreenAt(i)}
              aria-label={multi ? `Photo ${i + 1} of ${count} — open full screen` : 'Open photo full screen'}
            >
              <img
                src={image.src}
                alt={i === 0 ? alt : ''}
                draggable="false"
                style={{ objectPosition: objectPosition(image) }}
              />
            </button>
          ))}
        </div>

        {count > 0 && (
          <span className={`gallery__hint${multi ? ' gallery__hint--above-dots' : ''}`} aria-hidden="true">
            <ExpandIcon />
            Tap to view full photo
          </span>
        )}

        {multi && (
          <>
            <Arrows index={index} count={count} goTo={goTo} />
            <div className="gallery__dots" aria-hidden="true">
              {images.map((_, i) => (
                <span key={i} className={`gallery__dot${i === index ? ' is-active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {multi && (
        <div className="gallery__thumbs">
          {images.map((image, i) => (
            <button
              key={i}
              type="button"
              className={`gallery__thumb${i === index ? ' is-active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <img
                src={image.src}
                alt=""
                draggable="false"
                style={{ objectPosition: objectPosition(image) }}
              />
            </button>
          ))}
        </div>
      )}

      {fullscreenAt !== null && (
        <Lightbox
          images={images}
          alt={alt}
          startIndex={fullscreenAt}
          onClose={(lastIndex) => {
            setFullscreenAt(null)
            goTo(lastIndex, false) // come back on the photo they were looking at
          }}
        />
      )}
    </div>
  )
}

function Lightbox({ images, alt, startIndex, onClose }) {
  const count = images.length
  const multi = count > 1
  const { trackRef, index, onScroll, goTo } = useSlider(count, startIndex)
  const closeRef = useRef(null)
  const indexRef = useRef(index)
  indexRef.current = index
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Open on the tapped photo, without animating.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (track) track.scrollLeft = startIndex * track.clientWidth
  }, [startIndex, trackRef])

  useEffect(() => {
    const close = () => onCloseRef.current(indexRef.current)
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') goTo(Math.min(count - 1, indexRef.current + 1))
      else if (e.key === 'ArrowLeft') goTo(Math.max(0, indexRef.current - 1))
    }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden' // no page scrolling behind the viewer
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [count, goTo])

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${alt} — photos`}>
      <div ref={trackRef} className="gallery__track lightbox__track" onScroll={onScroll}>
        {images.map((image, i) => (
          <div key={i} className="lightbox__slide">
            <img src={image.src} alt={i === 0 ? alt : ''} draggable="false" />
          </div>
        ))}
      </div>

      {multi && (
        <p className="lightbox__counter" aria-live="polite">
          {index + 1} / {count}
        </p>
      )}
      <button
        ref={closeRef}
        type="button"
        className="lightbox__close"
        onClick={() => onClose(index)}
        aria-label="Close"
      >
        ×
      </button>
      {multi && <Arrows index={index} count={count} goTo={goTo} className="lightbox__arrow" />}
    </div>,
    document.body,
  )
}
