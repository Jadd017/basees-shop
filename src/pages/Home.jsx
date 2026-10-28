import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

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
          poster="/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label="Welcome to Basees — pieces made to bring imagination, art, and hope into your everyday life"
        />
        <nav className="hero__actions">
          <Link to="/our-story" className="btn hero__btn">
            Our Story
          </Link>
          <Link to="/shop" className="btn hero__btn">
            Shop Now
          </Link>
        </nav>
      </div>
    </main>
  )
}
