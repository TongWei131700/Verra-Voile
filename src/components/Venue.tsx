import { useRevealOnScroll, useCountUp } from '../hooks/useScrollAnimations'
import SectionTitle from './SectionTitle'

function CountNumber({ value }: { value: number }) {
  const ref = useCountUp<HTMLSpanElement>(value)
  return <span className="num" ref={ref}>0</span>
}

export default function Venue() {
  const cardRef = useRevealOnScroll<HTMLDivElement>()

  return (
    <section id="venue" className="venue">
      <div className="venue-bg" data-parallax="0.3"></div>
      <div className="venue-overlay"></div>
      <SectionTitle sub="The Venue" title="婚礼庄园" />
      <div className="venue-card reveal-zoom" ref={cardRef}>
        <div className="crest">⚜</div>
        <h3>Château de Versailles</h3>
        <div className="place">— Île-de-France, France —</div>
        <p>
          建于十七世纪的巴洛克风格庄园，曾是法兰西贵族的私人居所。
          镜厅之内水晶吊灯流光溢彩，玫瑰花园中喷泉低吟浅唱。
          我们将在这座承载着三个世纪爱情誓言的殿堂中，许下属于我们的诺言。
        </p>
        <div className="venue-features">
          <div><CountNumber value={17} />世纪庄园</div>
          <div><CountNumber value={300} />位宾客</div>
          <div><CountNumber value={12} />道法式佳肴</div>
        </div>
      </div>
    </section>
  )
}
