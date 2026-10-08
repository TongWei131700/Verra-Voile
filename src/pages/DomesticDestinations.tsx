import { useEffect, useRef } from 'react'

interface Destination {
  name: string
  subtitle?: string
  description: string
  pros: string[]
  cons: string[]
  tags?: string[]
  cards: { label: string }[]
}

interface Region {
  region: string
  regionEn: string
  destinations: Destination[]
}

const DATA: Region[] = [
  {
    region: '丽江',
    regionEn: 'Lijiang',
    destinations: [
      {
        name: '栖息谷',
        subtitle: '欧式庄园风 · 精致全景',
        description:
          '欧式庄园风格，拥有大草坪、镜面湖和复古建筑，整体感觉精致。景观丰富，欧式庄园、草坪、湖泊和雪山远景可以一次性拍全。场地宽敞，人相对较少，逛起来比较舒服。离白沙古镇很近，打车方便。',
        pros: [
          '景观丰富，庄园、草坪、湖泊、雪山一次拍全',
          '场地宽敞人少，逛起来舒服',
          '离白沙古镇近，打车方便',
        ],
        cons: [
          '门票价格有变动，可能在 58 元/人左右',
          '与香巴拉牧场、纳西部落风格类似，可能同质化',
        ],
        tags: ['欧式庄园', '草坪湖泊', '雪山远景'],
        cards: [
          { label: '案例 1' },
          { label: '案例 2' },
          { label: '案例 3' },
        ],
      },
      {
        name: '暮光森林',
        subtitle: '托斯卡纳田园风 · 氛围感大片',
        description:
          '主打托斯卡纳田园风，标志是笔直的柏树林和雪山同框的 S 弯公路，氛围感很强。拍照场景集中，柏树林、S 弯公路、镜面湖都是出片利器。下午 4-6 点光线柔和，是拍摄的黄金时间。',
        pros: [
          '拍照场景集中，柏树林、S 弯公路、镜面湖都是出片利器',
          '下午 4-6 点光线柔和，容易拍出氛围感大片',
          '可以骑马，增加游玩体验',
        ],
        cons: [
          '门票 68 元/人，核心机位可能需排队',
          '散客拍照时间可能有限制（3-10 分钟）',
          '内部配套设施较少，如没有咖啡厅',
        ],
        tags: ['托斯卡纳', '柏树林', 'S弯公路'],
        cards: [
          { label: '案例 1' },
          { label: '案例 2' },
          { label: '案例 3' },
        ],
      },
      {
        name: '艾洛可庄园',
        subtitle: '丽江小法国 · 法式庄园',
        description:
          '被称为"丽江小法国"，典型的法式庄园风格，有天使雕塑、罗马柱和穹顶亭，建筑细节很丰富。性价比相对较高，门票约 39.9 元/人。庄园维护得很好，草坪和建筑都很出片。',
        pros: [
          '性价比高，门票约 39.9 元/人',
          '庄园维护好，草坪和建筑出片',
          '交通方便，白沙、束河古镇打车过去都快',
        ],
        cons: [
          '庄园面积不算特别大',
          '室内场景小，散客可能不让进或需额外付费',
          '婚纱摄影热门地，周末节假日人多',
        ],
        tags: ['法式庄园', '天使雕塑', '罗马柱'],
        cards: [
          { label: '案例 1' },
          { label: '案例 2' },
          { label: '案例 3' },
        ],
      },
    ],
  },
  {
    region: '大理',
    regionEn: 'Dali',
    destinations: [
      {
        name: '华洱滋旅拍基地',
        subtitle: '洱海之畔 · 旅拍优选',
        description: '位于大理洱海畔，是当地热门旅拍基地之一，拥有开阔的湖景与白族建筑元素，适合拍摄清新自然风格的婚纱照。',
        pros: ['洱海边开阔湖景', '白族建筑元素丰富', '清新自然风格出片'],
        cons: ['旺季人多需提前预约', '部分场景需额外收费'],
        tags: ['洱海', '旅拍基地', '白族风情'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
      {
        name: '海颂庄园',
        subtitle: '苍山洱海 · 庄园婚礼',
        description: '坐拥苍山洱海双重景观的庄园，融合现代设计与自然景观，是大理高端婚礼和旅拍的热门选择。',
        pros: ['苍山洱海双重景观', '高端庄园体验', '适合大型婚礼'],
        cons: ['价格相对较高', '距古城有一定距离'],
        tags: ['苍山洱海', '高端庄园', '婚礼'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
      {
        name: '古娅庄园',
        subtitle: '花园秘境 · 浪漫唯美',
        description: '以花园秘境为主题的庄园，拥有丰富的植被和精心设计的景观布局，营造出浪漫唯美的拍摄氛围。',
        pros: ['花园景观精致', '植被丰富四季有花', '浪漫唯美氛围'],
        cons: ['场地面积有限', '热门时段需排队'],
        tags: ['花园秘境', '浪漫唯美', '四季花海'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
    ],
  },
  {
    region: '昆明',
    regionEn: 'Kunming',
    destinations: [
      {
        name: '寻甸凤龙湾',
        subtitle: '山水秘境 · 世外桃源',
        description: '位于昆明寻甸，拥有独特的喀斯特地貌和清澈湖水，是集山水、森林、草甸于一体的自然秘境，适合拍摄大气磅礴的婚纱照。',
        pros: ['独特的喀斯特地貌', '山水森林草甸一体', '自然环境大气磅礴'],
        cons: ['距昆明市区较远', '配套设施有限'],
        tags: ['喀斯特地貌', '山水秘境', '自然大气'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
    ],
  },
  {
    region: '北京',
    regionEn: 'Beijing',
    destinations: [
      {
        name: '张裕爱斐堡酒庄',
        subtitle: '欧式酒庄 · 经典优雅',
        description: '位于北京密云的欧式酒庄，建筑风格典雅大气，拥有葡萄园、城堡建筑和酒窖，是北方最受欢迎的欧式婚礼场地之一。',
        pros: ['经典欧式建筑', '葡萄园与酒窖场景丰富', '北京周边交通便利'],
        cons: ['旺季预约紧张', '门票需另购'],
        tags: ['欧式酒庄', '葡萄园', '酒窖'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
    ],
  },
  {
    region: '成都',
    regionEn: 'Chengdu',
    destinations: [
      {
        name: '田畔庄园',
        subtitle: '田园诗意 · 温馨自然',
        description: '坐落于成都近郊的田园庄园，以自然田园风光为底色，融合现代简约设计，营造出温馨浪漫的拍摄与婚礼体验。',
        pros: ['田园风光自然清新', '现代简约设计', '成都近郊交通便利'],
        cons: ['场地规模中等', '节假日较热门'],
        tags: ['田园诗意', '清新自然', '现代简约'],
        cards: [{ label: '案例 1' }, { label: '案例 2' }, { label: '案例 3' }],
      },
    ],
  },
]

export default function DomesticDestinations() {
  const containerRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    const els = containerRef.current?.querySelectorAll('.dd-reveal')
    if (!els) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="dd-page" ref={containerRef}>
      {/* Hero */}
      <section className="dd-hero">
        <div className="dd-hero__inner">
          <span className="dd-hero__tag">DESTINATION GUIDE</span>
          <h1 className="dd-hero__title">国内旅拍目的地推荐</h1>
          <p className="dd-hero__sub">
            从丽江雪山下到大理洱海畔，从昆明山水到北京酒庄，精选国内热门旅拍场地，帮你找到最适合自己的拍摄地。
          </p>
          <div className="dd-hero__stats">
            <div className="dd-hero__stat">
              <strong>5</strong><span>个城市</span>
            </div>
            <div className="dd-hero__stat">
              <strong>9</strong><span>个场地</span>
            </div>
            <div className="dd-hero__stat">
              <strong>27</strong><span>组案例</span>
            </div>
          </div>
        </div>
      </section>

      {/* 快速导航 */}
      <nav className="dd-nav dd-reveal">
        <div className="dd-nav__inner">
          {DATA.map((r) => (
            <a key={r.region} href={`#region-${r.regionEn}`} className="dd-nav__item">
              <span className="dd-nav__zh">{r.region}</span>
              <span className="dd-nav__en">{r.regionEn}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* 各区域内容 */}
      {DATA.map((region, ri) => (
        <section key={region.region} className="dd-region" id={`region-${region.regionEn}`}>
          {/* 区域标题 */}
          <div className="dd-region__header dd-reveal">
            <span className="dd-region__num">0{ri + 1}</span>
            <div>
              <h2 className="dd-region__title">{region.region}</h2>
              <span className="dd-region__en">{region.regionEn}</span>
            </div>
          </div>

          {/* 各场地 */}
          {region.destinations.map((dest, di) => (
            <article key={dest.name} className="dd-dest dd-reveal">
              {/* 场地标题 */}
              <div className="dd-dest__header">
                <div className="dd-dest__title-row">
                  <h3 className="dd-dest__name">{dest.name}</h3>
                  {dest.subtitle && <span className="dd-dest__subtitle">{dest.subtitle}</span>}
                </div>
                {dest.tags && (
                  <div className="dd-dest__tags">
                    {dest.tags.map((t) => (
                      <span key={t} className="dd-dest__tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div className="dd-dest__body">
                <p className="dd-dest__desc">{dest.description}</p>

                {/* 优劣势 */}
                <div className="dd-dest__pros-cons">
                  <div className="dd-dest__pros">
                    <h4 className="dd-dest__label dd-dest__label--pro">优势</h4>
                    <ul>
                      {dest.pros.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="dd-dest__cons">
                    <h4 className="dd-dest__label dd-dest__label--con">注意</h4>
                    <ul>
                      {dest.cons.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 案例卡片占位 */}
              <div className="dd-dest__cards">
                <h4 className="dd-dest__cards-title">
                  案例展示
                  <span>Cases</span>
                </h4>
                <div className="dd-dest__cards-grid">
                  {dest.cards.map((card, ci) => (
                    <div key={ci} className="dd-card-placeholder">
                      <div className="dd-card-placeholder__inner">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span>{card.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}

      {/* 底部总结 */}
      <section className="dd-summary dd-reveal">
        <div className="dd-summary__inner">
          <h2 className="dd-summary__title">一句话帮你选</h2>
          <div className="dd-summary__grid">
            <div className="dd-summary__item">
              <span className="dd-summary__icon">💰</span>
              <h4>追求性价比</h4>
              <p>选 <strong>艾洛可庄园</strong>，门票最便宜，法式风情浓郁</p>
            </div>
            <div className="dd-summary__item">
              <span className="dd-summary__icon">🌲</span>
              <h4>钟爱田园风</h4>
              <p>选 <strong>暮光森林</strong>，托斯卡纳氛围感，但要有排队准备</p>
            </div>
            <div className="dd-summary__item">
              <span className="dd-summary__icon">🏔️</span>
              <h4>综合体验</h4>
              <p>选 <strong>栖息谷</strong>，景观多样，建议提前确认最新票价</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
