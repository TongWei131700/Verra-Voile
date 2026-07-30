import { useState, useEffect, useCallback } from 'react'

interface GalleryCarouselProps {
  images: string[]
}

export default function GalleryCarousel({ images }: GalleryCarouselProps) {
  const [imgIdx, setImgIdx] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [prevIdx, setPrevIdx] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [touchStart, setTouchStart] = useState(0)

  const len = images.length

  const goImg = useCallback((idx: number, dir?: 'left' | 'right') => {
    if (idx === imgIdx || len === 0) return
    setAutoPlay(false)
    setPrevIdx(imgIdx)
    setSlideDir(dir || (idx > imgIdx ? 'left' : 'right'))
    setImgIdx(idx)
    setTimeout(() => { setPrevIdx(null); setSlideDir(null) }, 400)
  }, [imgIdx, len])

  // 触摸滑动
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goImg((imgIdx + 1) % len, 'left')
      else goImg((imgIdx - 1 + len) % len, 'right')
    }
  }, [touchStart, imgIdx, len, goImg])

  // 自动轮播
  useEffect(() => {
    if (!autoPlay || len === 0) return
    const timer = setInterval(() => {
      goImg((imgIdx + 1) % len, 'left')
    }, 4000)
    return () => clearInterval(timer)
  }, [autoPlay, len, imgIdx, goImg])

  // 重置索引（images 变化时）
  useEffect(() => {
    setImgIdx(0)
    setPrevIdx(null)
    setSlideDir(null)
  }, [images])

  if (len === 0) return null

  return (
    <>
      <section className="cd-gallery"
        onMouseEnter={() => setAutoPlay(false)} onMouseLeave={() => setAutoPlay(true)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="cd-gallery__viewer">
          {prevIdx !== null && (
            <img key={`prev-${prevIdx}`} src={images[prevIdx]} alt="" className="cd-gallery__main-img cd-gallery__slide-out" />
          )}
          <img key={`cur-${imgIdx}`} src={images[imgIdx]} alt=""
            className={`cd-gallery__main-img ${slideDir ? `cd-gallery__slide-in--${slideDir}` : ''}`}
            onClick={() => { setAutoPlay(false); setLightbox(true) }} style={{ cursor: 'zoom-in' }} />
          <button className="cd-gallery__arrow cd-gallery__arrow--left"
            onClick={() => goImg((imgIdx - 1 + len) % len)}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          </button>
          <button className="cd-gallery__arrow cd-gallery__arrow--right"
            onClick={() => goImg((imgIdx + 1) % len)}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          </button>
          <div className="cd-gallery__counter">{imgIdx + 1} / {len}</div>
          <div className="cd-gallery__dots">
            {images.map((_, i) => (
              <span key={i} className={`cd-gallery__dot ${i === imgIdx ? 'active' : ''}`} onClick={() => goImg(i)} />
            ))}
          </div>
        </div>
        <div className="cd-gallery__strip">
          {images.map((src, i) => (
            <div key={i} className={`cd-gallery__thumb-wrap ${i === imgIdx ? 'active' : ''}`} onClick={() => goImg(i)}>
              <img src={src} alt="" className="cd-gallery__thumb" />
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox 放大查看 */}
      {lightbox && (
        <div className="cd-lightbox" onClick={() => { setLightbox(false); setAutoPlay(true) }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button className="cd-lightbox__close" onClick={() => { setLightbox(false); setAutoPlay(true) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <button className="cd-lightbox__arrow cd-lightbox__arrow--left"
            onClick={e => { e.stopPropagation(); goImg((imgIdx - 1 + len) % len) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <img src={images[imgIdx]} alt="" className="cd-lightbox__img" onClick={e => e.stopPropagation()} />
          <button className="cd-lightbox__arrow cd-lightbox__arrow--right"
            onClick={e => { e.stopPropagation(); goImg((imgIdx + 1) % len) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <div className="cd-lightbox__counter">{imgIdx + 1} / {len}</div>
        </div>
      )}
    </>
  )
}
