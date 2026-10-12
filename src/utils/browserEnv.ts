/**
 * 浏览器环境检测工具
 */

/**
 * 检测是否在微信内置浏览器中
 */
export const isWeChatBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('micromessenger')
}

/**
 * 获取更详细的环境信息
 */
export const getBrowserEnv = () => {
  if (typeof navigator === 'undefined') {
    return { isWeChat: false, isMobile: false, env: 'unknown' }
  }

  const ua = navigator.userAgent.toLowerCase()
  
  return {
    isWeChat: ua.includes('micromessenger'),
    isMobile: /mobile|android|iphone|ipad|ipod/i.test(ua),
    isIOS: /iphone|ipad|ipod/i.test(ua),
    isAndroid: /android/i.test(ua),
    env: ua.includes('micromessenger') ? 'wechat' : 'browser',
  }
}
