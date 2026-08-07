/**
 * 通用视频嵌入 URL 解析
 * 支持 YouTube / Vimeo，可扩展其他来源
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'unknown'

interface ParsedVideo {
  provider: VideoProvider
  id: string
  embedUrl: string
}

/** 检测视频来源 */
export function detectVideoProvider(url: string): VideoProvider {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  return 'unknown'
}

/**
 * 解析视频 URL → 统一的嵌入地址
 * 自动添加 autoplay / mute / loop / playsinline 等背景视频参数
 */
export function parseVideoUrl(url: string): ParsedVideo | null {
  if (!url) return null

  // ── YouTube ──
  // https://www.youtube.com/watch?v=abc123
  // https://youtu.be/abc123
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`,
    }
  }

  // ── Vimeo ──
  // https://vimeo.com/202038149
  // https://player.vimeo.com/video/202038149
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch) {
    const id = vimeoMatch[1]
    return {
      provider: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&background=1&playsinline=1`,
    }
  }

  return null
}
