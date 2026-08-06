// 礼服模块 —— 类型定义、分类表与品牌信息
// 商品数据：wonaDressProducts.ts（wonaconcept.com 批量爬取生成，测试数据）
// 爬取脚本：Verra-Voile-End/scripts/crawl-wona-dresses.cjs + crawl-wona-details.cjs

export type DressCategory =
  | 'all'
  | 'maison-blanche'
  | 'atelier'
  | 'white'
  | 'couture'
  | 'bridal-alchemy'
  | 'gemini'
  | 'alma-de-oro'
  | 'amore-in-fiore'
  | 'endless-styles'
  | 'miami-bliss'

export interface DressProduct {
  slug: string
  name: string
  nameEn: string
  category: Exclude<DressCategory, 'all'>
  categoryCn: string
  tagline: string
  desc: string
  highlights: string[]
  cover: string
  images: string[]
  video?: string
  price?: number
  source?: { name: string; url: string }
}

export const dressCategoryList: { key: DressCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'maison-blanche', label: 'Maison Blanche' },
  { key: 'atelier', label: 'Atelier 系列' },
  { key: 'white', label: 'White 系列' },
  { key: 'couture', label: 'Couture 高定' },
  { key: 'bridal-alchemy', label: 'Bridal Alchemy' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'alma-de-oro', label: 'Alma de Oro' },
  { key: 'amore-in-fiore', label: 'Amore in Fiore' },
  { key: 'endless-styles', label: 'Endless Styles' },
  { key: 'miami-bliss', label: 'Miami Bliss' },
]

// 品牌信息
export const wonaBrand = {
  name: 'WONÁ Concept',
  nameCn: 'WONÁ Concept 婚纱概念店（测试数据）',
  tagline: 'Wedding Dresses · Maison Blanche',
  location: 'Kyiv, Ukraine',
  email: 'sales@wonaconcept.com',
  phone: '+380 68 350 44 79',
  instagram: 'wona_concept',
  instagramUrl: 'https://www.instagram.com/wona_concept/',
  sourceUrl: 'https://wonaconcept.com/',
  introCn:
    'WONÁ Concept 是一家专注婚纱礼服的设计品牌，旗下拥有 Atelier、Couture、White、Maison Blanche 等多条产品线。Maison Blanche 以现代极简的廓形与考究的面料工艺见长，用干净的线条与克制的细节，呈现新娘从容而坚定的气质。品牌提供全球门店网络与造型师咨询服务，让每一位新娘都能找到属于自己的那一件。',
}
