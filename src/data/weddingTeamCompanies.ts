// 婚礼团队商品数据 —— 来源：sposiamovi.it 等婚礼策划公司官网爬取
// 每家公司作为一个商品，模式与摄影模块 PhotographerProduct 保持一致

export interface TeamMember {
  name: string; nameCn: string
  role: string; roleCn: string
  description: string
  image: string
}

export interface ServiceGroup {
  title: string; titleCn: string
  items: { label: string; labelCn: string; desc?: string }[]
}

export interface ServiceArea {
  name: string; nameCn: string
}

export interface Testimonial {
  couple: string; text: string; textCn: string
}

export interface Partner {
  name: string; role: string
}

export interface FAQ {
  q: string; a: string
}

export interface WeddingTeamCompany {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  city: string
  cityEn: string
  tagline: string
  desc: string
  story: string
  foundedYear: number
  cover: string
  headshot?: string
  images: string[]
  website: string
  source: { name: string; url: string }
  specialties: string[]
  teamMembers: TeamMember[]
  services: ServiceGroup[]
  serviceAreas: ServiceArea[]
  testimonials: Testimonial[]
  partners: Partner[]
  faq: FAQ[]
  price?: number
}

export const weddingTeamCompanies: WeddingTeamCompany[] = [
  {
    slug: 'sposiamovi',
    name: '斯波夏莫薇',
    nameEn: 'SposiamoVi',
    country: '意大利',
    countryEn: 'Italy',
    city: '米兰',
    cityEn: 'Milan',
    tagline: '意大利奢华目的地婚礼策划 · Vogue 推荐顶级策划团队',
    desc: `SposiamoVi 是意大利领先的奢华目的地婚礼策划公司，由 Silvia Galli 创立。团队专注于在意大利最美丽的目的地——科莫湖、阿马尔菲海岸、托斯卡纳、威尼斯、罗马、西西里、波托菲诺和普利亚——打造独一无二的婚礼体验。

作为 Vogue 杂志推荐的婚礼策划团队，SposiamoVi 以其卓越的设计美学、无微不至的细节把控和对意大利奢华生活方式的深刻理解而闻名。每一场婚礼都是一件原创作品，从视觉概念到最终执行，团队将新人的愿景化为超越期待的现实。

团队由14位经验丰富的专业策划师组成，覆盖意大利全境各个目的地。她们不仅精通婚礼策划的每一个环节，更深谙意大利各地的文化精髓与隐秘宝藏，能够为新人呈现最纯正、最难忘的意式婚礼体验。`,
    story: `SposiamoVi 的创立源于创始人 Silvia Galli 对意大利美学与待客之道的深沉热爱。作为一名在婚礼行业深耕多年的资深策划师，Silvia 深知每一对新人都渴望一场真正属于自己的婚礼——而非千篇一律的模板。

她汇聚了一批来自意大利各地、对婚礼充满热情的专业策划师，建立起这个覆盖全意大利的精英团队。从科莫湖畔的私密仪式到阿马尔菲海岸的盛大庆典，从托斯卡纳庄园的田园浪漫到威尼斯宫殿的古典奢华，SposiamoVi 始终坚持以原创设计为核心，以新人故事为灵感，打造每一场独一无二的婚礼。

如今，SposiamoVi 已成为国际公认的意大利顶级婚礼策划品牌，被 Vogue 等权威媒体推荐，服务过来自世界各地的名流与新贵。`,
    foundedYear: 2015,
    cover: 'https://sposiamovi.it/wp-content/uploads/2025/12/AA_Wedding_1252-2.jpg',
    headshot: 'https://sposiamovi.it/wp-content/uploads/2025/11/Silvia-Galli.png',
    images: [
      // Hero 轮播用（前3张）
      'https://sposiamovi.it/wp-content/uploads/2025/12/AA_Wedding_1252-2.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/08/WhatsApp-Image-2026-01-08-at-15.15.06-2.jpeg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/ca-27-scaled.jpg',
      // 作品集
      'https://sposiamovi.it/wp-content/uploads/2025/12/B-C-wedding-131.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/37-alessia-scott-wedding-varna-studios-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/10094513871.jpg_m1.jpg_exif1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/9789035476.jpg_m1.jpg_exif1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/BEST_0092.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/I-and-M-56.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/AlessiaTedHighlights-0021-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/wedding-preview-36-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/242A6004.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/001-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/R-and-Y-Rehearsal-208.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/0027_0073_Wedding_01_00473-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/1T2A9243.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/courtney-massimiliano-wedding-palazzo-pisani-moretta-venice-1473.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/lily-barrett-welcome-cocktail-remer-venice-57-1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/0073_DB_07401-1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/La-Dichosa-Daria-Thierry-Preview-Portofino-66.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/TusnimDom-170.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/183_Wedd_02_00448-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/0051Brunch_01-00088-1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/Wed_01_02533-scaled.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/RN-766-1.jpg',
      'https://sposiamovi.it/wp-content/uploads/2025/12/cbeccc46-aaf0-48f2-b8d0-4506a426fbfd.jpg',
    ],
    website: 'https://sposiamovi.it/',
    source: { name: 'sposiamovi.it', url: 'https://sposiamovi.it/' },
    specialties: ['奢华目的地婚礼', '全意大利覆盖', 'Vogue 推荐', '原创设计', '宾客管理'],
    teamMembers: [
      {
        name: 'Silvia Galli', nameCn: '西尔维娅·加利',
        role: 'Founder & Lead Wedding Planner', roleCn: '创始人 / 首席婚礼策划师',
        description: 'SposiamoVi 创始人，意大利知名婚礼策划师，被 Vogue 杂志推荐。以卓越的审美眼光和无微不至的执行力闻名。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Silvia-Galli.png',
      },
      {
        name: 'Martina Casprini', nameCn: '玛蒂娜·卡斯普里尼',
        role: 'Senior Wedding Planner — Tuscany', roleCn: '资深婚礼策划师 · 托斯卡纳',
        description: '负责托斯卡纳地区婚礼的全程策划与执行，深谙佛罗伦萨及周边庄园场地的每一个细节。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/12/Martina-Casprini-1-e1766572128382.jpg',
      },
      {
        name: 'Ada Pinheiro', nameCn: '阿达·皮涅鲁',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '精通跨国婚礼协调，擅长为国际新人打造融合多元文化的婚礼体验。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/12/Ada-1-e1766572038675.jpg',
      },
      {
        name: 'Altynay Nurlybek', nameCn: '阿尔蒂奈',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '多语言策划师，专注于为来自不同文化背景的新人提供无缝沟通与贴心服务。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/12/Alty-1-e1766572020663.jpg',
      },
      {
        name: 'Anna Grimaldi', nameCn: '安娜·格里马尔迪',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '细节控策划师，对每一个环节的把控都精益求精，确保婚礼当天的完美呈现。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Anna-Grimaldi-768x1153.jpg',
      },
      {
        name: 'Beatrice Lembo', nameCn: '贝阿特丽切·莱姆博',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '擅长创意设计与视觉呈现，将新人的爱情故事融入婚礼的每一个视觉元素。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Beatrice-Lembo-768x1151.jpg',
      },
      {
        name: 'Camilla Pratesi', nameCn: '卡米拉·普拉泰西',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '拥有丰富的供应商资源，能够为新人推荐最合适的场地、花艺、摄影等合作伙伴。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/12/Camilla-Pratesi-e1766572238274.jpg',
      },
      {
        name: 'Elisa Rossi', nameCn: '艾丽莎·罗西',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '热情且专业的策划师，善于倾听新人需求并将其转化为超越期待的婚礼体验。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Elisa-768x1152.jpg',
      },
      {
        name: 'Gemma Borelli', nameCn: '杰玛·博雷利',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '专注于奢华婚礼设计，对花艺、灯光和桌面布置有独到的审美见解。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Gemma-Borelli-768x1152.jpg',
      },
      {
        name: 'Giulia Melani', nameCn: '朱莉娅·梅拉尼',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '项目管理专家，擅长统筹多供应商协作，确保婚礼流程的每一个环节顺畅衔接。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Giulia-Melani-768x768.jpeg',
      },
      {
        name: 'Marta Buson', nameCn: '玛尔塔·布松',
        role: 'Wedding Planner — Venice', roleCn: '婚礼策划师 · 威尼斯',
        description: '威尼斯地区专家，深谙水城独特的物流挑战与浪漫场地，为新人打造梦幻威尼斯婚礼。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Marta-Buson-768x866.jpg',
      },
      {
        name: 'Martina Forzoni', nameCn: '玛蒂娜·福尔佐尼',
        role: 'Wedding Planner', roleCn: '婚礼策划师',
        description: '创意与执行力兼备，擅长在复杂场地条件下实现新人的婚礼愿景。',
        image: 'https://sposiamovi.it/wp-content/uploads/2026/02/Gianmarco-Vetrano-ritratti-sposiamovi-49_websize.jpg',
      },
      {
        name: 'Sandra Celoni', nameCn: '桑德拉·切洛尼',
        role: 'Guest Experience Manager', roleCn: '宾客体验经理',
        description: '负责宾客接待与体验管理，从欢迎晚宴到住宿安排，确保每位宾客享受极致体验。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/11/Sandra-768x1152.jpg',
      },
      {
        name: 'Silvia Piazzini', nameCn: '西尔维娅·皮亚齐尼',
        role: 'Senior Wedding Planner', roleCn: '资深婚礼策划师',
        description: '资深策划师，拥有丰富的项目管理经验，擅长处理大型目的地婚礼的复杂 logistics。',
        image: 'https://sposiamovi.it/wp-content/uploads/2025/12/Silvia-Piazzini-bw-e1766572211799.jpg',
      },
    ],
    services: [
      {
        title: 'Full Service & Planning', titleCn: '全程策划服务',
        items: [
          { label: 'Initial Consultation', labelCn: '初次咨询', desc: '深入了解新人需求、风格偏好与预算范围' },
          { label: 'Venue Research & Shortlist', labelCn: '场地筛选', desc: '根据需求调研并推荐最匹配的意大利场地' },
          { label: 'Vendor Selection & Management', labelCn: '供应商管理', desc: '甄选并协调摄影、花艺、餐饮等所有供应商' },
          { label: 'Budget Management', labelCn: '预算管控', desc: '全程预算分析与费用优化' },
          { label: 'Final Checks & Coordination', labelCn: '最终协调', desc: '婚礼前最终确认与当天全程统筹' },
        ],
      },
      {
        title: 'Design & Styling', titleCn: '设计与造型',
        items: [
          { label: 'Concept Development', labelCn: '概念开发', desc: '从新人故事中提炼婚礼设计概念' },
          { label: 'Moodboard Creation', labelCn: '灵感板制作', desc: '创建视觉灵感板，统一婚礼美学方向' },
          { label: 'Design Proposal', labelCn: '设计方案', desc: '完整的设计提案，包含色彩、材质、布局' },
          { label: 'Styling & Décor', labelCn: '造型装饰', desc: '仪式与宴会空间的整体造型与装饰执行' },
        ],
      },
      {
        title: 'Guest Management', titleCn: '宾客管理',
        items: [
          { label: 'Accommodation Booking', labelCn: '住宿预订', desc: '为宾客协调酒店与特色住宿' },
          { label: 'Welcome Events', labelCn: '欢迎活动', desc: '策划欢迎晚宴、鸡尾酒会等预热活动' },
          { label: 'Transportation', labelCn: '交通安排', desc: '统筹宾客接送与婚礼期间交通' },
          { label: 'Guest Experience', labelCn: '宾客体验', desc: '打造令每位宾客难忘的意式体验' },
        ],
      },
      {
        title: 'Consulting Service', titleCn: '咨询服务',
        items: [
          { label: 'Planning Guidance', labelCn: '策划指导', desc: '为自主策划的新人提供专业建议与方向指引' },
          { label: 'Vendor Recommendations', labelCn: '供应商推荐', desc: '推荐经过验证的优质供应商清单' },
          { label: 'Timeline Planning', labelCn: '时间规划', desc: '协助制定合理的婚礼筹备时间表' },
        ],
      },
    ],
    serviceAreas: [
      { name: 'Lake Como', nameCn: '科莫湖' },
      { name: 'Amalfi Coast', nameCn: '阿马尔菲海岸' },
      { name: 'Tuscany', nameCn: '托斯卡纳' },
      { name: 'Venice', nameCn: '威尼斯' },
      { name: 'Rome', nameCn: '罗马' },
      { name: 'Sicily', nameCn: '西西里' },
      { name: 'Portofino', nameCn: '波托菲诺' },
      { name: 'Puglia', nameCn: '普利亚' },
    ],
    testimonials: [],
    partners: [
      { name: 'Vogue', role: '媒体报道' },
      { name: 'Wedding Wire', role: '合作平台' },
    ],
    faq: [
      { q: 'SposiamoVi 服务哪些地区？', a: '我们覆盖意大利全境，包括科莫湖、阿马尔菲海岸、托斯卡纳、威尼斯、罗马、西西里、波托菲诺和普利亚等热门目的地。' },
      { q: '全程策划服务包含哪些内容？', a: '从初次咨询到婚礼当天全程统筹，包含场地筛选、供应商管理、预算管控、设计造型、宾客管理等所有环节。' },
      { q: '可以只做设计造型吗？', a: '当然可以。我们的 Design & Styling 服务独立于全程策划，适合已有场地和基本安排但需要专业视觉设计的新人。' },
      { q: '你们能帮助我们安排宾客的住宿和活动吗？', a: '是的，宾客管理是我们的核心服务之一，包括住宿预订、欢迎活动、交通安排和整体宾客体验策划。' },
      { q: '如何开始合作？', a: '您可以通过我们的咨询预约联系表单提交信息，我们会在48小时内回复并安排初次咨询。' },
    ],
    price: 5000,
  },
]
