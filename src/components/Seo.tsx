import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

interface SeoProps {
  title?: string
  description?: string
  keywords?: string
  ogType?: string
  ogImage?: string
  structuredData?: object  // JSON-LD 结构化数据
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
  const fullKeywords = keywords
    ? `${keywords}, 欧洲婚礼, 海外婚礼, ${MODULE_KEYWORDS}`
    : `欧洲婚礼, 海外婚礼, 目的地婚礼, ${MODULE_KEYWORDS}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <meta name="keywords" content={fullKeywords} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <link rel="canonical" href={currentUrl} />
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}
