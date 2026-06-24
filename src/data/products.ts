export interface Product {
  id: string
  name: string
  nameEn: string
  desc: string
  img: string
  price: number
  unit: string
  capacity: string
  highlight: string
}

export interface ProductModule {
  id: string
  name: string
  nameEn: string
  products: Product[]
}

export const moduleProducts: Record<string, ProductModule> = {
  team: {
    id: 'team',
    name: '婚礼团队',
    nameEn: 'Wedding Team',
    products: [
      {
        id: 'team-base',
        name: '基础套餐',
        nameEn: 'Base Package',
        desc: '策划+4h摄影+花艺+化妆+发型+主持+小提琴，一站式婚礼现场服务',
        img: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=400&fit=crop',
        price: 4100,
        unit: '€',
        capacity: '全程跟拍',
        highlight: '热门',
      },
      {
        id: 'team-makeup',
        name: '升级化妆师',
        nameEn: 'Premium Makeup Artist',
        desc: '专业新娘妆容升级，资深化妆师全天跟妆',
        img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=400&fit=crop',
        price: 300,
        unit: '€',
        capacity: '全天跟妆',
        highlight: '',
      },
      {
        id: 'team-floral-upgrade',
        name: '升级花艺',
        nameEn: 'Premium Floral Design',
        desc: '高级花艺设计升级，手捧花+仪式装饰+胸花',
        img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=400&fit=crop',
        price: 500,
        unit: '€',
        capacity: '全套花艺',
        highlight: '',
      },
      {
        id: 'team-video',
        name: '婚礼视频',
        nameEn: 'Wedding Film',
        desc: '全程视频拍摄与电影级剪辑，记录每一个珍贵瞬间',
        img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop',
        price: 1000,
        unit: '€',
        capacity: '全天拍摄',
        highlight: '推荐',
      },
    ],
  },
  floral: {
    id: 'floral',
    name: '花卉',
    nameEn: 'Floral',
    products: [
      {
        id: 'floral-dahlia',
        name: '大丽花手捧花束',
        nameEn: 'Dahlia Bouquet',
        desc: '经典欧式手捧花设计，大丽花搭配尤加利叶，优雅大气',
        img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=400&fit=crop',
        price: 500,
        unit: '€',
        capacity: '1束',
        highlight: '',
      },
    ],
  },
  wine: {
    id: 'wine',
    name: '酒水',
    nameEn: 'Wine & Dining',
    products: [
      {
        id: 'wine-maslina',
        name: 'Maslina Resort 酒店',
        nameEn: 'Maslina Resort',
        desc: '精品度假酒店住宿，地中海风格的私密空间',
        img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=400&fit=crop',
        price: 450,
        unit: '€',
        capacity: '含早餐',
        highlight: '',
      },
      {
        id: 'wine-dinner',
        name: '酒店海边小晚宴',
        nameEn: 'Seaside Dinner',
        desc: '海滨私密晚宴体验，日落时分享用地中海美食',
        img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop',
        price: 380,
        unit: '€',
        capacity: '6人宴席',
        highlight: '推荐',
      },
    ],
  },
  other: {
    id: 'other',
    name: '其他',
    nameEn: 'Others',
    products: [
      {
        id: 'other-car',
        name: '当天包车',
        nameEn: 'Day Car Rental',
        desc: '全天接送用车服务，含专业司机',
        img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&h=400&fit=crop',
        price: 100,
        unit: '€',
        capacity: '全天',
        highlight: '',
      },
    ],
  },
}
