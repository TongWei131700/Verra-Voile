// 花卉数据已迁移到数据库，前端通过 API 获取
// 保留类型定义供兼容

export type FloralCategory = 'all'
export interface FloralProduct {
  slug: string
  name: string
  nameEn: string
  category: string
  categoryCn: string
  tagline: string
  desc: string
  highlights: string[]
  cover: string
  images: string[]
  price?: number
  source?: { name: string; url: string }
}
export const floralCategoryList: { key: string; label: string }[] = []
export const floralProducts: FloralProduct[] = []
export const floralStudio = null
