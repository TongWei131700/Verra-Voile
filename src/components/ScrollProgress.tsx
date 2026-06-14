import { useEffect, useState } from 'react'

export default function ScrollProgress() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement
      const total = h.scrollHeight - h.clientHeight
      const percent = (h.scrollTop / total) * 100
      setWidth(percent)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return <div className="scroll-progress" style={{ width: `${width}%` }} />
}
