import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

interface SeoProps {
  title?: string
  description?: string
  keywords?: string
  ogType?: string
  ogImage?: string
  structuredData?: object | object[]  // JSON-LD 结构化数据（单个对象或数组）
}

// 六大模块关键词（每页都包含，确保搜索引擎关联）
const MODULE_KEYWORDS = '目的地婚礼, 婚礼团队, 花卉装饰, 婚纱礼服, 婚礼摄影, 酒水宴席'
const BRAND = 'EuropeWedding'

export default function Seo({ title, description, keywords, ogType = 'website', ogImage, structuredData }: SeoProps) {
  const { pathname } = useLocation()
  const currentUrl = `https://europewedding.cn${pathname}`
  const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} · 欧洲目的地婚礼全程策划`
  const fullDesc = description ||
    'EuropeWedding 提供欧洲 12 国 50+ 城市目的地婚礼全程策划服务，涵盖场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块。'
  const fullKeywords = (() => {
    // 使用 Set 去重
    const keywordSet = new Set<string>()
    
    // 添加传入的 keywords（可能包含国家+婚礼等长尾词）
    if (keywords) {
      keywords.split(', ').forEach(k => keywordSet.add(k.trim()))
    }
    
    // 添加基础关键词
    keywordSet.add('欧洲婚礼')
    keywordSet.add('海外婚礼')
    keywordSet.add('目的地婚礼')
    
    // 添加六大模块关键词
    MODULE_KEYWORDS.split(', ').forEach(k => keywordSet.add(k.trim()))
    
    return Array.from(keywordSet).join(', ')
  })()

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <meta name="keywords" content={fullKeywords} />
      <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta http-equiv="Pragma" content="no-cache" />
      <meta http-equiv="Expires" content="0" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <link rel="canonical" href={currentUrl} />
      {structuredData && (
        <>
          {Array.isArray(structuredData) ? (
            structuredData.map((data, index) => (
              <script key={index} type="application/ld+json">
                {JSON.stringify(data)}
              </script>
            ))
          ) : (
            <script type="application/ld+json">
              {JSON.stringify(structuredData)}
            </script>
          )}
        </>
      )}
    </Helmet>
  )
}
