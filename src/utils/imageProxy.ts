/**
 * 图片代理工具 —— 将被墙的外部图片 URL 转为后端代理地址
 *
 * 后端接口: GET /api/image-proxy?url=<encoded_url>
 * 首次访问由后端下载并缓存到磁盘，后续命中缓存
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * 将外部图片 URL 转为后端代理地址
 * - 已经是本地路径（/uploads/、/assets/）的拼接 API_BASE 或直接返回
 * - Vite 打包的本地资源（相对路径）原样返回
 * - 空值返回空字符串
 */
export function proxyImage(src: string): string {
  if (!src) return ''
  // 已经是本地路径，直接走后端静态服务
  if (src.startsWith('/uploads/')) return `${API_BASE}${src}`
  // Vite 打包的本地资源（/assets/...）直接返回
  if (src.startsWith('/assets/')) return src
  // 非 http(s) 开头的（如相对路径）原样返回
  if (!src.startsWith('http://') && !src.startsWith('https://')) return src
  // 外部 URL → 走图片代理
  return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(src)}`
}

/**
 * 批量转换图片数组
 */
export function proxyImages(srcs: string[]): string[] {
  return srcs.map(proxyImage)
}
