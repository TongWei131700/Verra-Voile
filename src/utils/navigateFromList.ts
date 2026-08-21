import type { NavigateFunction } from 'react-router-dom'

/**
 * 从列表页导航到详情页前，保存列表页的滚动位置。
 * 返回时 ScrollRestoration 会自动恢复到之前的位置。
 */
export function navFromList(listPath: string, targetPath: string, navigate: NavigateFunction) {
  const nhIntro = document.querySelector('.nh-intro')
  const pos = nhIntro ? nhIntro.scrollTop : window.scrollY
  const cache = (window as any).__scrollCache
  if (cache) cache[listPath] = pos
  navigate(targetPath)
}
