import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { DEFAULT_STORY, toParagraphs } from '../data/defaultStory.js'
import { fetchStory } from '../services/settings.js'
import '../styles/shop.css'

export default function OurStory() {
  const [story, setStory] = useState(null) // null while loading

  useEffect(() => {
    let cancelled = false
    fetchStory()
      .then((text) => !cancelled && setStory(text.trim() || DEFAULT_STORY))
      .catch((error) => {
        console.error(error)
        if (!cancelled) setStory(DEFAULT_STORY)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <Header backTo="/" backLabel="Home" />
      <main className="page">
        <div className="page__inner">
          <h1 className="page__title">Our Story</h1>
          <p className="page__subtitle">بَصيص — a little glimmer of light</p>

          {story === null ? (
            <div aria-busy="true" aria-label="Loading">
              <span className="skeleton-line" />
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line--short" />
            </div>
          ) : (
            // dir="auto" lets Arabic paragraphs read right-to-left.
            toParagraphs(story).map((paragraph, i) => (
              <p key={i} dir="auto" className="story__paragraph">
                {paragraph}
              </p>
            ))
          )}

          <hr className="divider" />

          <div style={{ textAlign: 'center' }}>
            <Link to="/shop" className="btn">
              Shop Now
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
