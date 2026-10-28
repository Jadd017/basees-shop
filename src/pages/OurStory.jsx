import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'

export default function OurStory() {
  return (
    <>
      <Header backTo="/" backLabel="Home" />
      <main className="page">
        <div className="page__inner">
          <h1 className="page__title">Our Story</h1>
          <p className="page__subtitle">بَصيص — a little glimmer of light</p>

          {/* Placeholder story text — to be replaced by the owner */}
          <p>
            Basees began with a simple wish: to make small things that bring a little light into
            someone’s day. Every piece is shaped by hand, slowly and with care, in a tiny home
            studio.
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
    </>
  )
}
