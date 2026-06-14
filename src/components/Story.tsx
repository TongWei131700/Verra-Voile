import { useRevealOnScroll } from '../hooks/useScrollAnimations'
import SectionTitle from './SectionTitle'

export default function Story() {
  const imageRef = useRevealOnScroll<HTMLDivElement>()
  const textRef = useRevealOnScroll<HTMLDivElement>()

  return (
    <section id="story" className="story">
      <SectionTitle sub="Our Story" title="缘起" />
      <div className="story-grid">
        <div className="story-image reveal-mask" ref={imageRef}></div>
        <div className="story-text reveal-up" ref={textRef}>
          <p>那是 2020 年的春天，巴黎左岸的一家旧书店里，他正在寻一本里尔克的诗集，而她正捧着同一作者的散文凝神细读。</p>
          <p>六年时光流转，从塞纳河畔的清晨到托斯卡纳山间的黄昏，我们携手走过欧洲十二国，最终决定在这座古老的庄园里，将爱情交付给彼此，也交付给永恒。</p>
          <p>诚邀您拨冗莅临，与我们共同见证这一神圣时刻。</p>
          <div className="signature">— Alexandre &amp; Léonore</div>
        </div>
      </div>
    </section>
  )
}
