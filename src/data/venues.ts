export interface Venue {
  id: string
  name: string
  nameEn: string
  desc: string
  img: string
  price: number        // 起步价（万元）
  unit: string         // 价格单位描述，如 "万起/场"
  capacity: string     // 容纳人数，如 "50-200人"
  highlight: string    // 亮点标签，如 "热门" | "限定" | "私享"
}

export interface VenueCategory {
  id: string
  label: string
  labelEn: string
  icon: string
  venues: Venue[]
}

export const parisVenues: VenueCategory[] = [
  {
    id: 'church',
    label: '教堂',
    labelEn: 'Church',
    icon: '⛪',
    venues: [
      { id: 'sacre-coeur', name: '圣心大教堂', nameEn: 'Sacré-Cœur', desc: '蒙马特高地上的白色穹顶，俯瞰巴黎全景', img: 'https://images.unsplash.com/photo-1583266560725-0113a0ef5c4c?w=600&h=400&fit=crop', price: 28, unit: '万起/场', capacity: '80-300人', highlight: '热门' },
      { id: 'notre-dame', name: '巴黎圣母院', nameEn: 'Notre-Dame', desc: '哥特建筑瑰宝，八百年岁月的神圣殿堂', img: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=600&h=400&fit=crop', price: 45, unit: '万起/场', capacity: '100-500人', highlight: '限定' },
      { id: 'madeleine', name: '玛德莲教堂', nameEn: 'La Madeleine', desc: '新古典主义风格，52根科林斯柱环绕', img: 'https://images.unsplash.com/photo-1568624556790-2c2a491e59e0?w=600&h=400&fit=crop', price: 22, unit: '万起/场', capacity: '60-200人', highlight: '' },
      { id: 'saint-sulpice', name: '圣叙尔皮斯教堂', nameEn: 'Saint-Sulpice', desc: '巴黎第二大教堂，德拉克洛瓦壁画珍藏', img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&h=400&fit=crop', price: 18, unit: '万起/场', capacity: '50-150人', highlight: '' },
    ],
  },
  {
    id: 'manor',
    label: '庄园',
    labelEn: 'Manor & Château',
    icon: '🏰',
    venues: [
      { id: 'versailles', name: '凡尔赛宫', nameEn: 'Château de Versailles', desc: '路易十四的皇家宫殿，镜厅金碧辉煌', img: 'https://images.unsplash.com/photo-1551410224-699683e15636?w=600&h=400&fit=crop', price: 88, unit: '万起/场', capacity: '200-800人', highlight: '限定' },
      { id: 'vaux', name: '沃子爵城堡', nameEn: 'Vaux-le-Vicomte', desc: '法式园林鼻祖，千支烛光晚宴', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop', price: 52, unit: '万起/场', capacity: '100-400人', highlight: '热门' },
      { id: 'chantilly', name: '尚蒂伊城堡', nameEn: 'Château de Chantilly', desc: '文艺复兴宝库，湖畔浪漫仪式', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop', price: 38, unit: '万起/场', capacity: '80-300人', highlight: '' },
      { id: 'fontainebleau', name: '枫丹白露宫', nameEn: 'Fontainebleau', desc: '拿破仑最爱的宫殿，万亩森林环绕', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop', price: 42, unit: '万起/场', capacity: '100-350人', highlight: '' },
    ],
  },
  {
    id: 'garden',
    label: '花园',
    labelEn: 'Garden',
    icon: '🌿',
    venues: [
      { id: 'luxembourg', name: '卢森堡公园', nameEn: 'Jardin du Luxembourg', desc: '巴黎人心中最美花园，法式对称美学', img: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=600&h=400&fit=crop', price: 15, unit: '万起/场', capacity: '30-120人', highlight: '私享' },
      { id: 'tuileries', name: '杜乐丽花园', nameEn: 'Jardin des Tuileries', desc: '卢浮宫旁的皇家花园，协和广场为背景', img: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=600&h=400&fit=crop', price: 20, unit: '万起/场', capacity: '50-200人', highlight: '' },
      { id: 'bagatelle', name: '巴加特尔公园', nameEn: 'Parc de Bagatelle', desc: '玫瑰园仙境，上千品种争艳', img: 'https://images.unsplash.com/photo-1490750967868-88aa4f44d3ea?w=600&h=400&fit=crop', price: 12, unit: '万起/场', capacity: '20-80人', highlight: '私享' },
    ],
  },
  {
    id: 'riverside',
    label: '河畔',
    labelEn: 'Riverside',
    icon: '🌊',
    venues: [
      { id: 'seine-cruise', name: '塞纳河游船', nameEn: 'Seine River Cruise', desc: '流动的盛宴，经过埃菲尔与卢浮宫', img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&h=400&fit=crop', price: 35, unit: '万起/场', capacity: '60-200人', highlight: '热门' },
      { id: 'pont-alexandre', name: '亚历山大三世桥', nameEn: 'Pont Alexandre III', desc: '巴黎最华丽的桥梁，金色雕塑与灯柱', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop', price: 25, unit: '万起/场', capacity: '40-150人', highlight: '' },
      { id: 'ile-saint-louis', name: '圣路易岛', nameEn: 'Île Saint-Louis', desc: '塞纳河心的静谧小岛，私密仪式感', img: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=600&h=400&fit=crop', price: 18, unit: '万起/场', capacity: '20-60人', highlight: '私享' },
    ],
  },
]

export const croatiaVenues: VenueCategory[] = [
  {
    id: 'island',
    label: '海岛',
    labelEn: 'Island',
    icon: '🏝️',
    venues: [
      { id: 'hvar-island', name: 'Hvar岛', nameEn: 'Hvar Island', desc: '薰衣草田与亚得里亚海的梦幻岛屿，超小型私密婚礼圣地', img: 'https://images.unsplash.com/photo-1555990538-1e15d9b8730d?w=600&h=400&fit=crop', price: 5900, unit: '€', capacity: '2-20人', highlight: '热门' },
    ],
  },
  {
    id: 'museum',
    label: '博物馆',
    labelEn: 'Museum',
    icon: '🏛️',
    venues: [
      { id: 'hvar-museum', name: 'Hvar博物馆', nameEn: 'Hvar Museum', desc: '古城历史博物馆，独特的婚纱拍照场地', img: 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=600&h=400&fit=crop', price: 50, unit: '€', capacity: '2-10人', highlight: '小众' },
    ],
  },
]
