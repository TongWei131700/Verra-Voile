import { useState, type ImgHTMLAttributes } from 'react'

const FALLBACK_IMG = 'https://img.alicdn.com/imgextra/i4/O1CN01fSe7hK22EMSeTwZiu_!!6000000007088-0-tps-2400-1596.jpg'

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

export default function FallbackImage({ src, alt = '', className = '', ...rest }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [loaded, setLoaded] = useState(false)

  const handleError = () => {
    if (imgSrc !== FALLBACK_IMG) {
      setImgSrc(FALLBACK_IMG)
    }
  }

  return (
    <div className={`fallback-img-wrapper ${className}`}>
      {!loaded && <div className="fallback-img-skeleton" />}
      <img
        src={imgSrc}
        alt={alt}
        className={`fallback-img ${loaded ? 'fallback-img--loaded' : ''}`}
        onError={handleError}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </div>
  )
}
