import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface BackButtonProps {
  to?: string
}

declare global {
  interface Window {
    __saveScrollPos?: (path: string) => void
  }
}

export default function BackButton({ to = '/' }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleBack = () => {
    // 导航前保存当前页面的滚动位置
    window.__saveScrollPos?.(location.pathname)
    navigate(to)
  }

  return (
    <button className={`cd-list-hero__back${scrolled ? ' cd-list-hero__back--collapsed' : ''}`} onClick={handleBack}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      <span>返回</span>
    </button>
  )
}
