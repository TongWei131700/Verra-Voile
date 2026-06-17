import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.5)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      className={`floating-cta-btn ${visible ? 'show' : ''}`}
      onClick={() => navigate('/listing')}
    >
      <span className="floating-cta-btn__icon">✦</span>
      <span className="floating-cta-btn__text">开始定制你的专属婚礼</span>
      <span className="floating-cta-btn__arrow">→</span>
    </button>
  )
}
