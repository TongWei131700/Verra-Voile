import { useState, type ImgHTMLAttributes } from 'react'

const FALLBACK_IMG = 'https://img.alicdn.com/imgextra/i4/O1CN01fSe7hK22EMSeTwZiu_!!6000000007088-0-tps-2400-1596.jpg'

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

export default function FallbackImage({ src, alt = '', ...rest }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src)

  const handleError = () => {
    if (imgSrc !== FALLBACK_IMG) {
      setImgSrc(FALLBACK_IMG)
    }
  }

  return <img src={imgSrc} alt={alt} onError={handleError} {...rest} />
}
