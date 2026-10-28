import { useId, useState } from 'react'

// "Basees Terms & Policies": each policy is a row whose title is always visible;
// tapping it opens the text. All closed by default; "Read all" opens (or closes) them all.
// `policies`: [{ title, body }], or null while loading.
export default function TermsPolicies({ policies }) {
  const baseId = useId()
  const [open, setOpen] = useState(() => new Set())
  const allOpen = policies?.length > 0 && open.size === policies.length

  const toggle = (i) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(policies.map((_, i) => i)))

  return (
    <section className="terms" aria-labelledby={`${baseId}-title`}>
      <div className="terms__head">
        <h2 id={`${baseId}-title`} className="terms__title">
          Basees Terms &amp; Policies
        </h2>
        {policies?.length > 0 && (
          <button type="button" className="terms__all" onClick={toggleAll}>
            {allOpen ? 'Close all' : 'Read all'}
          </button>
        )}
      </div>

      {policies === null ? (
        <div aria-busy="true" aria-label="Loading">
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      ) : (
        <ul className="terms__list">
          {policies.map((policy, i) => {
            const isOpen = open.has(i)
            return (
              <li key={i} className={`terms__item${isOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="terms__toggle"
                  aria-expanded={isOpen}
                  aria-controls={`${baseId}-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span dir="auto">{policy.title}</span>
                  <span className="terms__chevron" aria-hidden="true" />
                </button>
                <div id={`${baseId}-${i}`} className="terms__body" hidden={!isOpen} dir="auto">
                  {policy.body}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
