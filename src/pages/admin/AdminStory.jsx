import { useEffect, useState } from 'react'
import { DEFAULT_STORY } from '../../data/defaultStory.js'
import { fetchStory, saveStory } from '../../services/settings.js'

export default function AdminStory() {
  const [text, setText] = useState(null) // null while loading
  const [saved, setSaved] = useState('') // text as last saved, to detect changes
  const [status, setStatus] = useState('') // '' | 'saving' | 'saved' | error message

  useEffect(() => {
    fetchStory()
      .then((story) => {
        // Nothing saved yet → start from the placeholder text the site shows.
        setText(story || DEFAULT_STORY)
        setSaved(story)
      })
      .catch((e) => {
        console.error(e)
        setStatus('Couldn’t load the story. Check your connection and refresh.')
        setText('')
      })
  }, [])

  const save = async (event) => {
    event.preventDefault()
    setStatus('saving')
    try {
      await saveStory(text.trim())
      setSaved(text.trim())
      setStatus('saved')
    } catch (e) {
      console.error(e)
      setStatus(
        e.code === 'permission-denied'
          ? 'You don’t have permission to save. Check that you’re signed in with the shop account.'
          : 'Couldn’t save. Check your connection and try again.',
      )
    }
  }

  if (text === null) return <p className="admin-muted admin-center">Loading…</p>

  const changed = text.trim() !== saved

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form__head">
        <h1 className="admin-form__title">Our Story</h1>
        <p className="admin-hint">
          Leave an empty line between paragraphs. Arabic text is supported.
        </p>
      </div>

      <div className="admin-card">
        <label className="visually-hidden" htmlFor="story-text">
          Story text
        </label>
        <textarea
          id="story-text"
          className="admin-story"
          dir="auto"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (status === 'saved') setStatus('')
          }}
        />
      </div>

      {status && status !== 'saving' && status !== 'saved' && (
        <p className="admin-error" role="alert">
          {status}
        </p>
      )}
      {status === 'saved' && !changed && (
        <p className="admin-flash" role="status">
          ✓ Saved — it’s live on the Our Story page
        </p>
      )}

      <div className="admin-form__actions">
        <button
          type="submit"
          className="btn admin-form__save"
          disabled={status === 'saving' || !changed || !text.trim()}
        >
          {status === 'saving' ? 'Saving…' : changed ? 'Save story' : 'No changes'}
        </button>
      </div>
    </form>
  )
}
