import { Link, useNavigate } from 'react-router-dom'

export default function OurStory() {
  const navigate = useNavigate()

  // Go back in history if the visitor came from inside the site, otherwise home.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="page">
      <div className="page__inner">
        <button type="button" className="btn btn--ghost" onClick={goBack}>
          <span aria-hidden="true">←</span> Back
        </button>

        <h1 className="page__title">Our Story</h1>
        <p className="page__subtitle">بَصيص — a little glimmer of light</p>

        {/* Placeholder story text — to be replaced by the owner */}
        <p>
          Basees began with a simple wish: to make small things that bring a little light into
          someone’s day. Every piece is shaped by hand, slowly and with care, in a tiny home studio.
        </p>
        <p>
          From sculpted gypsum candles to crochet keepsakes, each creation carries a bit of
          imagination, art, and hope — made to be gifted, cherished, and lived with every day.
        </p>
        <p>
          Thank you for being part of our story. We hope you find something here that feels like
          it was made just for you.
        </p>

        <hr className="divider" />

        <div style={{ textAlign: 'center' }}>
          <Link to="/shop" className="btn">
            Shop Now
          </Link>
        </div>
      </div>
    </main>
  )
}
