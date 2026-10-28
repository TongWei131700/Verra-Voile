import { useEffect, useRef, useState } from 'react'

/** Presentation-only playback. Completion is controlled by the parent, not this timer. */
export default function ThinkingTypewriter({ labels }: { labels: string[] }) {
  const [printed, setPrinted] = useState(0)
  const progress = useRef(0)
  const previous = useRef<string[]>([])
  const lines = labels.map(label => [...label])
  const total = lines.reduce((sum, line) => sum + line.length, 0)

  useEffect(() => {
    // Appended steps keep their place. Replacing a placeholder starts fresh.
    if (!previous.current.every((label, index) => labels[index] === label)) {
      progress.current = 0
      setPrinted(0)
    }
    previous.current = [...labels]
    if (progress.current >= total) return
    const timer = window.setInterval(() => {
      progress.current = Math.min(progress.current + 1, total)
      setPrinted(progress.current)
      if (progress.current === total) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [labels, total])

  let offset = 0
  return <>{lines.map((chars, index) => {
    const count = Math.max(0, Math.min(chars.length, printed - offset))
    offset += chars.length
    if (!count) return null
    return <div className="agent-thinking-step" key={index}>
      {index === 0 && <img src="/agent-thinking.gif" className="agent-thinking-step__icon" alt="" />}
      <span className="agent-thinking-step__text">
        {chars.slice(0, count).join('')}
        {count < chars.length && <span className="agent-thinking-cursor" aria-hidden="true">|</span>}
      </span>
    </div>
  })}</>
}
