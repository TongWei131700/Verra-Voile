import { useState, useEffect } from 'react'

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.5)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <a href="#rsvp" className={`floating-cta-btn ${visible ? 'show' : ''}`}>
      <span className="floating-cta-btn__icon">✦</span>
      <span className="floating-cta-btn__text">开始定制你的专属婚礼</span>
      <span className="floating-cta-btn__arrow">→</span>
    </a>
  )
}
