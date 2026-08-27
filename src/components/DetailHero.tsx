import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import FallbackImage from './common/FallbackImage'
import BackButton from './common/BackButton'
import { proxyImage } from '../utils/imageProxy'
import ewLogo from '../assets/europewedding-logo.png'

/* ============================================================
 * 共享类型 & 子组件
 * ============================================================ */

interface HeroBaseProps {
  images: string[]
  name: string
  nameEn: string
  badge: string
  tagline: string
  headshot?: string
  cover?: string
  website?: string
  backTo: string
  isBooked: boolean
  isBooking: boolean
  isCanceling: boolean
  heroRef?: React.RefObject<HTMLElement | null>
  aboutRef?: React.RefObject<HTMLElement | null>
  onSetShowBar?: (show: boolean) => void
}

/** 已预定花环徽章 */
function BookedBadge() {
  return (
    <div className="photo-booked-badge">
      <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
        <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M14 50 C10 46, 9 40, 12 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
        <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M66 50 C70 46, 71 40, 68 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
        <ellipse cx="11" cy="44" rx="3" ry="1.5" transform="rotate(-30 11 44)" fill="currentColor" opacity="0.15"/>
        <ellipse cx="69" cy="44" rx="3" ry="1.5" transform="rotate(30 69 44)" fill="currentColor" opacity="0.15"/>
        <circle cx="40" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
      </svg>
      <div className="photo-booked-badge__check">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="photo-booked-badge__text">已加入意向单</span>
    </div>
  )
}

/** 预定/取消加载动画 */
function BookingOverlay({ isBooking, isCanceling }: { isBooking: boolean; isCanceling: boolean }) {
  if (!isBooking && !isCanceling) return null
  return (
    <div className="photo-booking-overlay">
      <div className="photo-booking-gift">
        <div className="photo-booking-gift__lid" />
        <div className="photo-booking-gift__box">
          <img src={ewLogo} alt="" className="photo-booking-gift__logo" />
        </div>
        <div className="photo-booking-gift__sparkles">
          <span /><span /><span /><span /><span /><span />
        </div>
      </div>
      <p className="photo-booking-text">{isCanceling ? '正在移出意向单…' : '正在加入意向单…'}</p>
    </div>
  )
}

/** 信息面板内容（头像是 slot） */
function HeroInfoContent({ badge, name, nameEn, tagline, website, headshotSlot }: {
  badge: string; name: string; nameEn: string; tagline: string
  website?: string; headshotSlot: ReactNode
}) {
  return (
    <>
      {headshotSlot}
      <div className="card-hero__meta">
        <span className="card-hero__badge">{badge}</span>
        <h1 className="card-hero__name">{name}</h1>
        <p className="card-hero__name-en">{nameEn}</p>
        <div className="card-hero__divider" />
        <p className="card-hero__tagline">{tagline}</p>
        {website && (
          <a href={website} target="_blank" rel="noreferrer" className="card-hero__website">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
            </svg>
            Visit Website
          </a>
        )}
      </div>
    </>
  )
}

/* ============================================================
 * CardHero — 卡片式首屏（左轮播 + 右信息面板）
 * 使用场景：摄影师、婚礼团队等
 * ============================================================ */

interface CardHeroProps extends HeroBaseProps {
  onLightboxOpen?: (slideIndex: number) => void
}

export function CardHero({
  images, name, nameEn, badge, tagline, headshot, cover,
  website, backTo, isBooked, isBooking, isCanceling,
  heroRef, aboutRef, onSetShowBar, onLightboxOpen,
}: CardHeroProps) {
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const [heroLightbox, setHeroLightbox] = useState(false)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heroTouchX = useRef<number | null>(null)

  // 自动轮播
  useEffect(() => {
    if (heroPaused) return
    const total = Math.min(images.length, 3)
    if (total <= 1) return
    const timer = setInterval(() => {
      setHeroSlide(prev => {
        setHeroPrev(prev)
        setTimeout(() => setHeroPrev(null), 650)
        return (prev + 1) % total
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [images, heroPaused])

  const pauseCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

  const goSlide = useCallback((idx: number) => {
    const total = Math.min(images.length, 3)
    if (idx === heroSlide) return
    setHeroPrev(heroSlide)
    setHeroSlide(idx)
    pauseCarousel()
    setTimeout(() => setHeroPrev(null), 650)
  }, [heroSlide, images, pauseCarousel])

  useEffect(() => {
    return () => { if (heroTimerRef.current) clearTimeout(heroTimerRef.current) }
  }, [])

  // 触摸滑动
  const onTouchStart = (e: React.TouchEvent) => { heroTouchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchX.current === null) return
    const diff = e.changedTouches[0].clientX - heroTouchX.current
    heroTouchX.current = null
    if (Math.abs(diff) < 40) return
    const total = Math.min(images.length, 3)
    if (diff < 0) goSlide((heroSlide + 1) % total)
    else goSlide((heroSlide - 1 + total) % total)
  }

  // 滚动检测（控制底部预定栏显示）
  useEffect(() => {
    if (!aboutRef?.current || !onSetShowBar) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) onSetShowBar(true)
        else onSetShowBar(false)
      },
      { threshold: 0 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [aboutRef, onSetShowBar])

  const handleLightboxClose = useCallback(() => setHeroLightbox(false), [])
  const handleLightboxOpen = useCallback(() => {
    setHeroLightbox(true)
    onLightboxOpen?.(heroSlide)
  }, [heroSlide, onLightboxOpen])

  const total = Math.min(images.length, 3)
  const displayImages = images.slice(0, 3)

  return (
    <section className="card-hero" ref={heroRef}>
      <div className="card-hero__card">
        {/* 左侧：轮播区 */}
        <div className="card-hero__carousel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {displayImages.map((img, i) => (
            <div
              key={i}
              className={`card-hero__slide${i === heroSlide ? ' card-hero__slide--active' : ''}${i === heroPrev ? ' card-hero__slide--prev' : ''}`}
            >
              <FallbackImage
                src={proxyImage(img)}
                alt={`${nameEn} 作品 ${i + 1}`}
                className="card-hero__img"
                onClick={handleLightboxOpen}
                style={{ cursor: 'zoom-in' }}
              />
            </div>
          ))}
          {total > 1 && (
            <>
              <button className="card-hero__arrow card-hero__arrow--left" onClick={() => goSlide((heroSlide - 1 + total) % total)}>
                <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
              </button>
              <button className="card-hero__arrow card-hero__arrow--right" onClick={() => goSlide((heroSlide + 1) % total)}>
                <svg width="24" height="24" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
              </button>
              <div className="card-hero__dots">
                {displayImages.map((_, i) => (
                  <button key={i} className={`card-hero__dot${i === heroSlide ? ' card-hero__dot--active' : ''}`} onClick={() => goSlide(i)} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hero Lightbox */}
        {heroLightbox && (
          <div className="photo-hero__lightbox" onClick={handleLightboxClose}>
            <button className="photo-hero__lightbox-close" onClick={handleLightboxClose}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--left" onClick={e => { e.stopPropagation(); goSlide((heroSlide - 1 + total) % total) }}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <img src={proxyImage(displayImages[heroSlide])} alt="" className="photo-hero__lightbox-img" onClick={e => e.stopPropagation()} />
            <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--right" onClick={e => { e.stopPropagation(); goSlide((heroSlide + 1) % total) }}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <div className="photo-hero__lightbox-counter">{heroSlide + 1} / {total}</div>
          </div>
        )}

        {/* 右侧：信息面板 */}
        <div className={`card-hero__info${isBooked ? ' card-hero__info--booked' : ''}`}>
          {isBooked && <BookedBadge />}
          <BackButton to={backTo} />
          <HeroInfoContent
            badge={badge} name={name} nameEn={nameEn} tagline={tagline} website={website}
            headshotSlot={
              <div className="card-hero__headshot">
                <FallbackImage src={proxyImage(headshot || cover || '')} alt={nameEn} className="card-hero__headshot-img" />
              </div>
            }
          />
        </div>
      </div>

      <BookingOverlay isBooking={isBooking} isCanceling={isCanceling} />
    </section>
  )
}

/* ============================================================
 * FullscreenHero — 全屏背景首屏
 * 使用场景：场地、花卉、礼服等
 * ============================================================ */

interface FullscreenHeroProps extends HeroBaseProps {
  heroImages?: string[]
  heroIndex?: number
  heroPrevIndex?: number
  scrollHint?: boolean
  dots?: boolean
  onDotClick?: (index: number) => void
  children?: ReactNode
}

export function FullscreenHero({
  images, name, nameEn, badge, tagline, headshot, cover,
  website, backTo, isBooked, isBooking, isCanceling,
  heroRef, aboutRef, onSetShowBar,
  heroImages, heroIndex, heroPrevIndex,
  scrollHint = true, dots = false, onDotClick,
  children,
}: FullscreenHeroProps) {
  const displayImages = heroImages || images
  const currentIdx = heroIndex ?? 0
  const prevIdx = heroPrevIndex ?? null

  // 滚动检测
  useEffect(() => {
    if (!aboutRef?.current || !onSetShowBar) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) onSetShowBar(true)
        else onSetShowBar(false)
      },
      { threshold: 0 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [aboutRef, onSetShowBar])

  return (
    <section className="wt-hero" ref={heroRef}>
      {/* 全屏背景轮播 */}
      <div className="wt-hero__bg">
        {displayImages.map((img, i) => (
          <div
            key={i}
            className={`wt-hero__slide${i === currentIdx ? ' wt-hero__slide--active' : ''}${i === prevIdx ? ' wt-hero__slide--prev' : ''}`}
          >
            <FallbackImage src={proxyImage(img)} alt={`${nameEn} 作品 ${i + 1}`} className="wt-hero__img" />
          </div>
        ))}
        <div className="wt-hero__overlay" />
        {isBooked && <BookedBadge />}
      </div>

      <BackButton to={backTo} />

      {/* 居中信息面板 */}
      <div className={`wt-hero__info${isBooked ? ' wt-hero__info--booked' : ''}`}>
        <div className="wt-hero__headshot">
          <FallbackImage src={proxyImage(headshot || cover || '')} alt={nameEn} className="wt-hero__headshot-img" />
        </div>
        <div className="wt-hero__meta">
          <span className="wt-hero__badge">{badge}</span>
          <h1 className="wt-hero__name">{name}</h1>
          <p className="wt-hero__name-en">{nameEn}</p>
          <div className="wt-hero__divider" />
          <p className="wt-hero__tagline">{tagline}</p>
          {website && (
            <a href={website} target="_blank" rel="noreferrer" className="wt-hero__website">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
              </svg>
              Visit Website
            </a>
          )}
        </div>
      </div>

      {scrollHint && (
        <div className="wt-hero__scroll-hint">
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">Scroll</span>
        </div>
      )}

      {dots && displayImages.length > 1 && (
        <div className="wt-hero__dots">
          {displayImages.map((_, i) => (
            <button key={i} className={`wt-hero__dot${i === currentIdx ? ' wt-hero__dot--active' : ''}`} onClick={() => onDotClick?.(i)} />
          ))}
        </div>
      )}

      {children}

      <BookingOverlay isBooking={isBooking} isCanceling={isCanceling} />
    </section>
  )
}
