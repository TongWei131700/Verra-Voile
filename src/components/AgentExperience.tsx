import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import catalogCountries from '../data/catalogCountries.json'

const AgentChat = lazy(() => import('../pages/AgentChat'))
const modules: Record<string, { name: string; action: string; prompt: string }> = {
  destinations: { name: '婚礼场地', action: '帮我挑选婚礼场地', prompt: '请结合我正在浏览的场地范围，帮我挑选婚礼场地。先问我需要补充哪些预算、人数和风格信息。' },
  photography: { name: '婚礼摄影', action: '帮我挑选摄影师', prompt: '请结合当前摄影师范围，帮我找到适合的婚礼摄影师。先了解我的目的地、拍摄风格和预算。' },
  'wedding-team': { name: '婚礼团队', action: '帮我挑选策划团队', prompt: '请结合当前页面，帮我挑选婚礼策划团队，先了解我的目的地、人数和预算。' },
  'travel-photo': { name: '旅拍景点', action: '帮我规划旅拍路线', prompt: '请结合当前目的地和景点范围，帮我规划旅拍路线，先了解我的行程、时间和拍摄偏好。' },
  flowers: { name: '婚礼花艺', action: '帮我搭配婚礼花艺', prompt: '请结合当前花艺页面，帮我搭配婚礼花艺，先了解我的婚礼风格、色系和预算。' },
  dresses: { name: '婚礼礼服', action: '帮我挑选婚礼礼服', prompt: '请结合当前礼服页面，帮我挑选合适的婚礼礼服，先了解我的场地、风格和预算。' },
  wine: { name: '酒水宴席', action: '帮我搭配婚宴酒水', prompt: '请结合当前酒水页面，帮我搭配婚宴酒水，先了解宾客人数、菜单和预算。' },
}
export interface AgentReference { path: string; module: string; kind: 'list' | 'detail'; name: string; filters?: string[] }
interface GuideState { reference: AgentReference | null; register: (r: AgentReference) => void; open: (prompt?: string) => void }
const GuideContext = createContext<GuideState | null>(null)

/** Page-owned data, rather than scraped headings, keeps the reference aligned with applied filters. */
export function AgentPageGuide({ module, name, filters = [], detail = false }: { module: string; name?: string; filters?: string[]; detail?: boolean }) {
  const guide = useContext(GuideContext)
  const { pathname } = useLocation()
  const serialized = JSON.stringify({ path: pathname, module, kind: detail ? 'detail' : 'list', name: name || modules[module]?.name || module, filters: filters.filter(Boolean) })
  useEffect(() => { guide?.register(JSON.parse(serialized)) }, [serialized, guide?.register])
  const config = modules[module]
  if (!config) return null
  return <button type="button" className={`agent-page-guide${detail ? ' agent-page-guide--detail' : ''}`} onClick={() => guide?.open(detail ? `我正在查看「${name}」，请帮我判断是否适合我的婚礼，并给出搭配建议。先了解我还需要补充哪些需求。` : config.prompt)}><span aria-hidden="true">↗</span>{detail ? '让 AI 帮我搭配' : config.action}</button>
}

export default function AgentExperience({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [registered, register] = useState<AgentReference | null>(null)
  const [request, setRequest] = useState<{ id: number; prompt?: string }>({ id: 0 })
  const [loaded, setLoaded] = useState(false)
  const [removedReference, setRemovedReference] = useState<string | null>(null)
  const standalone = pathname === '/agent-chat'
  useEffect(() => { if (standalone) setLoaded(true) }, [standalone])
  const module = pathname.split('/')[1]
  const config = modules[module]
  const allowed = !!config || standalone
  const country = Object.entries((catalogCountries as Record<string, Record<string, string>>)[module] || {}).find(([, slug]) => pathname === `/${module}/${slug}`)?.[0]
  const fallback = useMemo<AgentReference | null>(() => config ? { path: pathname, module, kind: pathname.split('/').filter(Boolean).length === 1 || country ? 'list' : 'detail', name: country ? `${country} · ${config.name}` : config.name } : null, [pathname, module, country, config])
  const candidate = registered?.path === pathname ? registered : fallback
  const signature = JSON.stringify(candidate)
  const reference = removedReference === signature ? null : candidate
  const open = (prompt?: string) => { setLoaded(true); setRequest(prev => ({ id: prev.id + 1, prompt })) }
  // The single mounted chat survives navigation, including navigation to the full studio.
  return <GuideContext.Provider value={{ reference, register, open }}>
    {children}
    {!standalone && allowed && !loaded && <button className="agent-catalog-launcher" onClick={() => open()} aria-label="打开婚礼灵感助手"><img src="/agent-thinking.gif" alt="" /><span>{config.action}<small>婚礼灵感助手</small></span><span aria-hidden="true">↗</span></button>}
    {(loaded || standalone) && <div hidden={!allowed} className="agent-experience-host"><Suspense fallback={<button className="agent-catalog-launcher" disabled>正在打开婚礼灵感助手…</button>}><AgentChat embedded={!standalone} pageReference={reference} onRemoveReference={() => setRemovedReference(signature)} openRequest={request} launcherLabel={config?.action} /></Suspense></div>}
  </GuideContext.Provider>
}
