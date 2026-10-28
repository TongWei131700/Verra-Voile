import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Reveal complete rendered blocks, never partial Markdown, cards or tables. */
export default function ProgressiveReply({ children, enabled, onComplete, onAdvance }: {
  children: ReactNode
  enabled: boolean
  onComplete: () => void
  onAdvance: () => void
}) {
  const blocks = Children.toArray(children)
  const batch = Math.max(1, Math.ceil(blocks.length / 12))
  const [visible, setVisible] = useState(enabled ? batch : blocks.length)
  const callbacks = useRef({ onComplete, onAdvance })
  callbacks.current = { onComplete, onAdvance }
  const complete = useRef(false)
  const animate = useRef(enabled)

  useEffect(() => {
    if (!enabled) { setVisible(blocks.length); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(blocks.length)
      callbacks.current.onComplete()
      return
    }
    complete.current = false
    const timer = window.setInterval(() => {
      setVisible(count => Math.min(count + batch, blocks.length))
    }, 200)
    return () => window.clearInterval(timer)
  }, [enabled, blocks.length, batch])

  useLayoutEffect(() => {
    if (!enabled) return
    callbacks.current.onAdvance()
    if (visible >= blocks.length && !complete.current) {
      complete.current = true
      callbacks.current.onComplete()
    }
  }, [visible, blocks.length, enabled])

  const showAll = () => {
    complete.current = true
    setVisible(blocks.length)
    callbacks.current.onComplete()
  }
  return <>
    {enabled && visible < blocks.length && <button type="button" className="agent-reveal-skip" onClick={showAll}>立即显示全部</button>}
    {blocks.slice(0, enabled ? visible : blocks.length).map((block, index) => (
      <div className={animate.current ? 'agent-reveal-block' : undefined} key={index}>{block}</div>
    ))}
  </>
}
