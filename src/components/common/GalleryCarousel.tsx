import { useState, useEffect, useCallback, useRef } from 'react'

interface GalleryCarouselProps {
  images: string[]
  videoUrl?: string
}

export default function GalleryCarousel({ images, videoUrl }: GalleryCarouselProps) {
  const [imgIdx, setImgIdx] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [prevIdx, setPrevIdx] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [hovering, setHovering] = useState(false)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [manualPause, setManualPause] = useState(false)
  const imgIdxRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const stripRef = useRef<HTMLDivElement | null>(null)

  // 有视频时，视频占第 0 帧，图片从第 1 帧开始
  const hasVideo = !!videoUrl
  const totalSlides = hasVideo ? images.length + 1 : images.length

  // 获取当前帧对应的图片索引（视频帧无对应图片）
  const getImageSrc = (idx: number) => {
    if (hasVideo) {
      return idx === 0 ? '' : images[idx - 1]
    }
    return images[idx]
  }

  // 保持 ref 与 state 同步
  useEffect(() => { imgIdxRef.current = imgIdx }, [imgIdx])

  // 切换到指定帧（不干预自动轮播状态）
  const doSlide = useCallback((idx: number, dir?: 'left' | 'right') => {
    if (totalSlides === 0) return
    const cur = imgIdxRef.current
    setPrevIdx(cur)
    setSlideDir(dir || (idx > cur ? 'left' : 'right'))
    setImgIdx(idx)
    setTimeout(() => { setPrevIdx(null); setSlideDir(null) }, 400)
  }, [totalSlides])

  // 手动操作：切换帧 + 暂停自动轮播 3 秒后恢复
  const goImg = useCallback((idx: number, dir?: 'left' | 'right') => {
    if (idx === imgIdxRef.current || totalSlides === 0) return
    doSlide(idx, dir)
    setManualPause(true)
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => setManualPause(false), 3000)
  }, [totalSlides, doSlide])

  // 触摸滑动
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goImg((imgIdxRef.current + 1) % totalSlides, 'left')
      else goImg((imgIdxRef.current - 1 + totalSlides) % totalSlides, 'right')
    }
  }, [touchStart, totalSlides, goImg])

  // 自动轮播：仅在 hovering / manualPause 变化时重建 interval
  useEffect(() => {
    if (hovering || manualPause || totalSlides <= 1) return
    const timer = setInterval(() => {
      const cur = imgIdxRef.current
      doSlide((cur + 1) % totalSlides, 'left')
    }, 4000)
    return () => clearInterval(timer)
  }, [hovering, manualPause, totalSlides, doSlide])

  // 清理暂停定时器
  useEffect(() => {
    return () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current) }
  }, [])

  // 重置索引（仅当内容真正变化时）
  const contentKey = `${hasVideo ? 'v' : ''}:${images.length > 0 ? `${images.length}:${images[0]}:${images[images.length - 1]}` : ''}`
  useEffect(() => {
    setImgIdx(0)
    setPrevIdx(null)
    setSlideDir(null)
    setVideoReady(false)
  }, [contentKey])

  // 切换帧时自动滚动缩略图条，让当前缩略图居中（只滚动 strip，不影响页面）
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const activeThumb = strip.children[imgIdx] as HTMLElement | undefined
    if (activeThumb) {
      const thumbCenter = activeThumb.offsetLeft + activeThumb.offsetWidth / 2
      const stripCenter = strip.clientWidth / 2
      strip.scrollTo({ left: thumbCenter - stripCenter, behavior: 'smooth' })
    }
  }, [imgIdx])

  // 视频帧切换：离开时暂停，回来时恢复播放
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (imgIdx === 0 && hasVideo && videoReady) {
      vid.play().catch(() => {})
    } else {
      vid.pause()
    }
  }, [imgIdx, hasVideo, videoReady])

  // 视频加载完成
  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true)
  }, [])

  if (totalSlides === 0) return null

  // 渲染当前帧内容（图片或视频）
  const renderSlide = (idx: number, keyPrefix: string, isPrev = false) => {
    const isVideoFrame = hasVideo && idx === 0
    if (isVideoFrame) {
      return (
        <div key={`${keyPrefix}-${idx}`} className={`cd-gallery__main-img ${isPrev ? 'cd-gallery__slide-out' : ''} ${!isPrev && slideDir ? `cd-gallery__slide-in--${slideDir}` : ''}`}>
          {/* 视频未就绪时显示封面图 */}
          {!videoReady && images[0] && (
            <img src={images[0]} alt="" className="cd-gallery__video-poster" />
          )}
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            autoPlay={videoReady}
            onCanPlay={handleVideoCanPlay}
            className="cd-gallery__video"
            style={{ display: videoReady ? 'block' : 'none' }}
          />
        </div>
      )
    }
    const src = getImageSrc(idx)
    return (
      <img key={`${keyPrefix}-${idx}`} src={src} alt=""
        className={`cd-gallery__main-img ${isPrev ? 'cd-gallery__slide-out' : ''} ${!isPrev && slideDir ? `cd-gallery__slide-in--${slideDir}` : ''}`}
        onClick={() => { setManualPause(true); setLightbox(true) }} style={{ cursor: 'zoom-in' }} />
    )
  }

  // 缩略图：视频帧显示封面图 + 播放图标
  const renderThumb = (slideIdx: number) => {
    const isVideoFrame = hasVideo && slideIdx === 0
    const thumbSrc = isVideoFrame ? (images[0] || '') : getImageSrc(slideIdx)
    return (
      <div key={slideIdx} className={`cd-gallery__thumb-wrap ${slideIdx === imgIdx ? 'active' : ''}`} onClick={() => goImg(slideIdx)}>
        <img src={thumbSrc} alt="" className="cd-gallery__thumb" />
        {isVideoFrame && (
          <span className="cd-gallery__thumb-play">▶</span>
        )}
      </div>
    )
  }

  return (
    <>
      <section className="cd-gallery"
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="cd-gallery__viewer">
          {prevIdx !== null && renderSlide(prevIdx, 'prev', true)}
          {renderSlide(imgIdx, 'cur')}
          <button className="cd-gallery__arrow cd-gallery__arrow--left"
            onClick={() => goImg((imgIdx - 1 + totalSlides) % totalSlides)}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          </button>
          <button className="cd-gallery__arrow cd-gallery__arrow--right"
            onClick={() => goImg((imgIdx + 1) % totalSlides)}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
          </button>
          <div className="cd-gallery__counter">{imgIdx + 1} / {totalSlides}</div>
          <div className="cd-gallery__dots">
            {Array.from({ length: totalSlides }, (_, i) => (
              <span key={i} className={`cd-gallery__dot ${i === imgIdx ? 'active' : ''}`} onClick={() => goImg(i)} />
            ))}
          </div>
        </div>
        <div className="cd-gallery__strip" ref={stripRef}>
          {Array.from({ length: totalSlides }, (_, i) => renderThumb(i))}
        </div>
      </section>

      {/* Lightbox 放大查看（视频帧不支持 lightbox） */}
      {lightbox && !(hasVideo && imgIdx === 0) && (
        <div className="cd-lightbox" onClick={() => { setLightbox(false); setManualPause(false) }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button className="cd-lightbox__close" onClick={() => { setLightbox(false); setManualPause(false) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <button className="cd-lightbox__arrow cd-lightbox__arrow--left"
            onClick={e => { e.stopPropagation(); goImg((imgIdx - 1 + totalSlides) % totalSlides) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <img src={getImageSrc(imgIdx)} alt="" className="cd-lightbox__img" onClick={e => e.stopPropagation()} />
          <button className="cd-lightbox__arrow cd-lightbox__arrow--right"
            onClick={e => { e.stopPropagation(); goImg((imgIdx + 1) % totalSlides) }}>
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
          </button>
          <div className="cd-lightbox__counter">{imgIdx + 1} / {totalSlides}</div>
        </div>
      )}
    </>
  )
}
