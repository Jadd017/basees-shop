import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

// Three short curved dashes fanning outward (like the marks beside "BASEES !" in the video).
// Drawn for the left side; the right side is mirrored in CSS.
function Sparks({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 40" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <path d="M27 13 Q19 8 12 3" />
        <path d="M26 20 Q17 19.5 7 21" />
        <path d="M27 27 Q19 32 12 37" />
      </g>
    </svg>
  )
}

export default function Home() {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // React doesn't always reflect `muted` as a DOM attribute; iOS needs it for autoplay.
    video.muted = true
    video.defaultMuted = true

    const play = () => {
      if (video.paused) video.play().catch(() => {})
    }
    // Keep it looping forever: restart if it ever ends or the tab comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') play()
    }
    const onEnded = () => {
      video.currentTime = 0
      play()
    }

    play()
    video.addEventListener('ended', onEnded)
    document.addEventListener('visibilitychange', onVisible)
    // iOS Low Power Mode blocks autoplay until the first touch.
    window.addEventListener('touchstart', play, { once: true, passive: true })

    return () => {
      video.removeEventListener('ended', onEnded)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('touchstart', play)
    }
  }, [])

  return (
    <main className="hero">
      <div className="hero__frame">
        <video
          ref={videoRef}
          className="hero__video"
          src="/hero.mp4"
          poster="/hero-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label="Welcome to Basees — pieces made to bring imagination, art, and hope into your everyday life"
        />
        <nav className="hero__actions">
          <div className="hero__shop-row">
            <Sparks className="hero__sparks" />
            <Link to="/shop" className="hero__shop">
              Shop Now
            </Link>
            <Sparks className="hero__sparks hero__sparks--right" />
          </div>
          <Link to="/our-story" className="hero__story">
            Our Story
          </Link>
        </nav>
      </div>
    </main>
  )
}
