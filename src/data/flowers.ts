export interface Flower {
  id: number
  name: string
  nameEn: string
  style: string
  desc: string
  img: string
}

export const flowers: Flower[] = [
  {
    id: 1,
    name: '玫瑰',
    nameEn: 'Rose',
    style: '经典浪漫',
    desc: '永恒爱情的象征，深浅交织的花瓣诉说不渝誓言。',
    img: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&q=80',
  },
  {
    id: 2,
    name: '牡丹',
    nameEn: 'Peony',
    style: '雍容华贵',
    desc: '层叠花瓣如丝绸般绽放，代表富贵与圆满。',
    img: 'https://images.unsplash.com/photo-1562690868-60bbe7293e94?w=600&q=80',
  },
  {
    id: 3,
    name: '白百合',
    nameEn: 'Lily',
    style: '纯洁高雅',
    desc: '圣洁之花，寓意百年好合与纯真无瑕的爱。',
    img: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&q=80',
  },
  {
    id: 4,
    name: '薰衣草',
    nameEn: 'Lavender',
    style: '梦幻浪漫',
    desc: '紫色花海中的等待与期许，普罗旺斯的浪漫芬芳。',
    img: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=600&q=80',
  },
  {
    id: 5,
    name: '绣球花',
    nameEn: 'Hydrangea',
    style: '温柔饱满',
    desc: '团簇绽放的美好，寓意团圆与真挚的感谢。',
    img: 'https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600&q=80',
  },
  {
    id: 6,
    name: '郁金香',
    nameEn: 'Tulip',
    style: '优雅简约',
    desc: '荷兰国花的高贵气质，简洁线条中藏着深情告白。',
    img: 'https://images.unsplash.com/photo-1524386416438-98b9b2d4b433?w=600&q=80',
  },
]
