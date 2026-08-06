// 摄影商品数据 —— 来源：junebugweddings.com 法国婚礼摄影师目录爬取（测试数据）
// 每位摄影师作为一个商品，模式与花卉模块 FloralProduct 保持一致

export type PhotoCategory = 'all' | 'south-france' | 'paris'

export interface PhotographerProduct {
  slug: string
  name: string
  nameEn: string
  category: Exclude<PhotoCategory, 'all'>
  categoryCn: string
  tagline: string
  desc: string
  highlights: string[]
  cover: string
  images: string[]
  price?: number
  website?: string
  source: { name: string; url: string }
}

export const photoCategoryList: { key: PhotoCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'south-france', label: '南法' },
  { key: 'paris', label: '巴黎' },
]

const IMG = 'https://images.junebugweddings.com'

export const photographerProducts: PhotographerProduct[] = [
  {
    slug: 'andrea-martinetti',
    name: '安德烈·马蒂内蒂',
    nameEn: 'Andrea Martinetti',
    category: 'south-france',
    categoryCn: '南法 · 普罗旺斯',
    tagline: 'MoonLight Photography · 16 年全球爱情影像记录者',
    desc: 'MoonLight Photography 的 Andrea Martinetti 拥有 16 年爱情影像拍摄经验，足迹遍布全球，如今专注于普罗旺斯与蔚蓝海岸的婚礼拍摄。\n\n他的风格在情感叙事与隽永经典之间取得平衡——画面既自然抓拍又优雅从容。他擅长在任何庆典氛围中捕捉真实而不加修饰的喜悦，让每个瞬间都自然发生。\n\n「我最喜欢的工作状态，就是手持相机身处人群中央——新人在我面前，家人朋友环绕四周。我不断寻找对的画面、对的时机与最好的光线。」',
    highlights: ['16 年拍摄经验', '普罗旺斯 & 蔚蓝海岸', '情感叙事 × 隽永经典', '纪实抓拍风格', 'Junebug 严选认证'],
    cover: `${IMG}/09/9f/099f0d9d40804819.jpg`,
    images: [
      `${IMG}/09/9f/099f0d9d40804819.jpg`,
      `${IMG}/40/36/40360032433557fa.jpg`,
      `${IMG}/52/e8/52e878fdcf81664c.jpg`,
      `${IMG}/8e/d1/8ed1abe87d5b9d05.jpg`,
      `${IMG}/c9/63/c963e663535c7c39.jpg`,
      `${IMG}/5e/db/5edbafe884895d57.jpg`,
      `${IMG}/89/f7/89f7e399183bee4b.jpg`,
      `${IMG}/76/28/7628fbd5d7ce860f.jpg`,
    ],
    website: 'https://photomoonlight.com/wedding-photographer-provence/',
    source: { name: 'Junebug Weddings（测试数据）', url: 'https://junebugweddings.com/vendors/wedding-photographers/france/south-of-france/Andrea-Martinetti' },
  },
  {
    slug: 'margaux-kanarek',
    name: '玛戈·卡纳雷克',
    nameEn: 'Margaux Kanarek Photography',
    category: 'south-france',
    categoryCn: '南法 · 私奔婚礼',
    tagline: '私密婚礼与 Elopement · 柔和光影的编辑级叙事',
    desc: 'Margaux Kanarek 专注于私密婚礼与私奔婚礼（Elopement），为追求美感、光线与意义体验的新人而拍。\n\n她的作品受自然之美、柔和色调与静谧氛围的启发，以纪实叙事融合编辑级审美，呈现毫不费力、精致而极具个人色彩的影像。\n\n「新人选择我，是因为他们希望在回望婚礼时能重新感受到当时的情绪。我捕捉的不仅是画面，而是真实发生的一切。」她尤其契合沉静、在场、从容的新人——让每个瞬间自然展开，而非刻意安排。',
    highlights: ['私密婚礼 & Elopement 专家', '纪实叙事 × 编辑级审美', '柔和自然光线', 'Junebug 严选认证'],
    cover: `${IMG}/fb/3a/fb3ae844bda31b8c.jpg`,
    images: [
      `${IMG}/fb/3a/fb3ae844bda31b8c.jpg`,
      `${IMG}/06/28/06284081009d9f9a.jpg`,
      `${IMG}/10/a0/10a0da1f2819d4b1.jpg`,
      `${IMG}/37/9b/379b7a9be40c805f.jpg`,
      `${IMG}/46/27/46277618657a8720.jpg`,
      `${IMG}/5c/8c/5c8cecd00979fa9a.jpg`,
      `${IMG}/a4/93/a49321946a3bc4c7.jpg`,
      `${IMG}/fd/e3/fde34291275424d2.jpg`,
    ],
    website: 'https://margauxkanarekphotography.com/',
    source: { name: 'Junebug Weddings（测试数据）', url: 'https://junebugweddings.com/vendors/wedding-photographers/france/south-of-france/Margaux-Kanarek-Photography' },
  },
  {
    slug: 'alicia-nacenta',
    name: '艾丽西亚·纳森塔',
    nameEn: 'Alicia Nacenta Photography',
    category: 'south-france',
    categoryCn: '西班牙 & 南法',
    tagline: '国际婚礼与生活方式摄影 · 11 年自然光纪实',
    desc: 'Alicia Nacenta 是一位热爱人群、动物、自然与光线的国际婚礼与生活方式摄影师，常驻西班牙，服务西班牙与南法地区。\n\n她痴迷于探索世界各地未知的人文与风景，纽约、葡萄牙、梅诺卡、英国、印度、肯尼亚、德国、希腊都留下过她的镜头。自然光与即兴引导是她的手法——让新人在镜头前放松自在，以最有机的方式捕捉最真实的情感。\n\n真实新人的评价：「她的照片忠实反映了那一天有多么特别与神奇，最后她和团队成为了陪伴我们的重要家人。」',
    highlights: ['11 年拍摄经验', '常驻西班牙 · 服务南法', '自然光 × 即兴引导', '全球旅拍', '真实新人好评'],
    cover: `${IMG}/1e/f2/1ef226137ce5c697.jpg`,
    images: [
      `${IMG}/1e/f2/1ef226137ce5c697.jpg`,
      `${IMG}/1f/e1/1fe126ae9ff8a44d.jpg`,
      `${IMG}/78/63/7863984e1f62f1ea.jpg`,
      `${IMG}/6a/0e/6a0e2537413fb154.jpg`,
      `${IMG}/fc/7a/fc7a9520d03d0534.jpg`,
      `${IMG}/3c/1f/3c1f9ed5db778479.jpg`,
      `${IMG}/39/16/3916c712ca81fa46.jpg`,
      `${IMG}/36/e5/36e579e85f6f57f2.jpg`,
    ],
    website: 'https://www.alicianacenta.com/',
    source: { name: 'Junebug Weddings（测试数据）', url: 'https://junebugweddings.com/vendors/wedding-photographers/france/south-of-france/Alicia-Nacenta-Photography' },
  },
  {
    slug: 'vibrant-feelings',
    name: '跃动情感',
    nameEn: 'Vibrant Feelings',
    category: 'paris',
    categoryCn: '巴黎 · 法兰西岛',
    tagline: '明亮 · 细腻 · 真诚 —— 记录情绪本身',
    desc: 'Vibrant Feelings 是常驻巴黎的婚礼摄影师，专注于以精致隽永的审美捕捉真实的情绪与瞬间。\n\n无论婚礼摄影、人像还是编辑大片，她的核心始终是叙事——自然的灵动中点缀一丝优雅。她的风格常被形容为明亮、细腻、真诚：不只记录画面看起来如何，更记录那一刻的感受。\n\n「我向往圣托里尼悬崖上的日落婚礼、斯堪的纳维亚森林深处的私密仪式，或多洛米蒂的冒险私奔——真正打动我的，是希望婚礼忠于自己的新人。」',
    highlights: ['常驻巴黎 · 全球可旅拍', '明亮细腻审美', '婚礼 / 人像 / 编辑片', 'Junebug 严选认证'],
    cover: `${IMG}/48/a6/48a60e515c0af022.jpg`,
    images: [
      `${IMG}/48/a6/48a60e515c0af022.jpg`,
      `${IMG}/e5/85/e585d9a71203f3bc.jpg`,
      `${IMG}/13/b0/13b03e31b4185805.jpg`,
      `${IMG}/93/6b/936bd7b5c43f1a63.jpg`,
      `${IMG}/5f/1f/5f1fd2e4360ae133.jpg`,
      `${IMG}/02/f0/02f00b9308d8a18f.jpg`,
      `${IMG}/18/0b/180b00e7806b7bc6.jpg`,
      `${IMG}/7b/7e/7b7ebda38a401e38.jpg`,
    ],
    website: 'https://www.vibrant-feelings.com',
    source: { name: 'Junebug Weddings（测试数据）', url: 'https://junebugweddings.com/vendors/wedding-photographers/france/paris/Vibrant-Feelings' },
  },
]
