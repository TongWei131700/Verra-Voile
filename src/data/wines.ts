export interface Wine {
  id: number
  name: string
  nameEn: string
  category: string
  desc: string
  icon: string
  img: string
}

export const wines: Wine[] = [
  {
    id: 1,
    name: '香槟',
    nameEn: 'Champagne',
    category: '法国 · 起泡酒',
    desc: '金色气泡缓缓升起，开瓶一刻便是仪式的开场。',
    icon: '🥂',
    img: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=600&q=80',
  },
  {
    id: 2,
    name: '波尔多红葡萄酒',
    nameEn: 'Bordeaux Red',
    category: '法国 · 红葡萄酒',
    desc: '深邃酒红，单宁醇厚，承载古堡庄园的岁月沉淀。',
    icon: '🍷',
    img: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80',
  },
  {
    id: 3,
    name: '霞多丽白葡萄酒',
    nameEn: 'Chardonnay',
    category: '法国 · 白葡萄酒',
    desc: '清新果香与橡木气息交织，搭配海鲜与轻食的优雅之选。',
    icon: '🍾',
    img: 'https://images.unsplash.com/photo-1566995541428-f63e5d0d5b2c?w=600&q=80',
  },
  {
    id: 4,
    name: '莫吉托',
    nameEn: 'Mojito',
    category: '古巴 · 鸡尾酒',
    desc: '青柠与薄荷的清凉碰撞，海风度假感的微醺时光。',
    icon: '🍹',
    img: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80',
  },
  {
    id: 5,
    name: '意大利普罗赛克',
    nameEn: 'Prosecco',
    category: '意大利 · 起泡酒',
    desc: '细腻气泡与白桃花香，热情奔放的地中海风情。',
    icon: '🍸',
    img: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=600&q=80',
  },
  {
    id: 6,
    name: '无酒精花茶套餐',
    nameEn: 'Floral Mocktail',
    category: '定制 · 无酒精',
    desc: '玫瑰、洛神与香槟葡萄汁，为不饮酒的宾客准备的仪式杯。',
    icon: '🌹',
    img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  },
]
