import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format.js'

// `from` is the listing URL (incl. ?sub=) so the product page's back link returns to it.
export default function ProductCard({ product, from }) {
  return (
    <Link to={`/product/${product.id}`} state={from ? { from } : undefined} className="product-card">
      <div className="product-card__media">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {!product.available && <span className="badge">Sold out</span>}
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <p className="product-card__desc">{product.shortDescription}</p>
      </div>
    </Link>
  )
}
