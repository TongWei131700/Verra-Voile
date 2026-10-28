import { useEffect, useState } from 'react'

function TypedLabel({ label }: { label: string }) {
  const [printed, setPrinted] = useState(0)
  const chars = [...label]
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPrinted([...label].length)
      return
    }
    const length = [...label].length
    let count = 0
    const timer = window.setInterval(() => {
      count = Math.min(count + 1, length)
      setPrinted(count)
      if (count === length) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [label])
  return <span className="agent-status-line__text">{chars.slice(0, printed).join('') || '\u00a0'}</span>
}

/** One stable status line; earlier tool steps remain available on demand. */
export default function ThinkingTypewriter({ labels }: { labels: string[] }) {
  const label = labels[labels.length - 1] || '正在分析你的需求…'
  return <div className="agent-processing">
    <div className="agent-status-line" role="status" aria-label={label}>
      <img className="agent-status-line__icon" src="/agent-thinking.gif" alt="" aria-hidden="true" />
      <TypedLabel key={label} label={label} />
    </div>
    {labels.length > 1 && <details className="agent-process agent-process--active">
      <summary>查看已处理步骤（{labels.length - 1}）</summary>
      <ol>{labels.slice(0, -1).map((step, i) => <li key={i}>{step}</li>)}</ol>
    </details>}
  </div>
}
