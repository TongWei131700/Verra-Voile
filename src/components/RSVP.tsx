import { useState } from 'react'
import { useRevealOnScroll } from '../hooks/useScrollAnimations'
import SectionTitle from './SectionTitle'
import CustomSelect from './CustomSelect'
import DatePicker from './DatePicker'

const API_URL = '/api/reservation' // TODO: 替换为实际接口地址

const destinationOptions = [
  'Paris · 巴黎',
  'Roma · 罗马',
  'Wien · 维也纳',
  'Santorini · 圣托里尼',
  'Praha · 布拉格',
  'Barcelona · 巴塞罗那',
  'Venezia · 威尼斯',
  'Amsterdam · 阿姆斯特丹',
  'London · 伦敦',
  'Firenze · 佛罗伦萨',
  'Lisboa · 里斯本',
  'Edinburgh · 爱丁堡',
  '暂未决定 · 请顾问推荐',
]

const serviceFeatures = [
  '12 国 50+ 城市资源',
  '一对一首席策划师',
  '米其林餐饮合作',
  '全流程中文管家',
]

export default function RSVP() {
  const taglineRef = useRevealOnScroll<HTMLParagraphElement>()
  const featuresRef = useRevealOnScroll<HTMLDivElement>()
  const formRef = useRevealOnScroll<HTMLFormElement>()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    destination: '',
    date: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        alert('感谢您的预约！我们的首席策划顾问将于 24 小时内与您联系 ♥')
        setFormData({ name: '', phone: '', email: '', destination: '', date: '' })
      } else {
        alert('提交失败，请稍后重试')
      }
    } catch {
      alert('网络异常，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="rsvp" className="rsvp">
      <SectionTitle sub="Bespoke Wedding Atelier" title="预约咨询" />

      <p className="service-tagline reveal-up" ref={taglineRef}>
        Éternel Amour 婚礼工坊 · 专注欧洲城堡与海岛婚礼的高定策划，让每一段爱情都拥有传世级仪式
      </p>

      <div className="service-features reveal-up" ref={featuresRef}>
        {serviceFeatures.map((feature) => (
          <div key={feature}><span>✦</span> {feature}</div>
        ))}
      </div>

      <form className="rsvp-form reveal-zoom" ref={formRef} onSubmit={handleSubmit}>
        <div className="field">
          <label>您的尊姓</label>
          <input
            type="text"
            placeholder="请填写真实姓名"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>联系方式（手机）</label>
          <input
            type="text"
            placeholder="+86"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label>电子邮箱 <span style={{ opacity: 0.5, fontSize: '10px', letterSpacing: '1px' }}>（选填）</span></label>
          <input
            type="email"
            placeholder="email@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>期望婚礼目的地</label>
          <CustomSelect
            options={destinationOptions}
            placeholder="— 请选择心仪之城 —"
            required
            value={formData.destination}
            onChange={(val) => setFormData({ ...formData, destination: val })}
          />
        </div>
        <div className="field">
          <label>计划举办时间</label>
          <DatePicker
            placeholder="— 请选择举办月份 —"
            value={formData.date}
            onChange={(val) => setFormData({ ...formData, date: val })}
          />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? '提交中...' : '预约一对一咨询'}
        </button>

        <div className="contact-band">
          <div><span>☎</span> 15536500878</div>
          <div><span>✉</span> TW15536500878@163.com</div>
          <div><span>♥</span> WeChat: Verra-Voile</div>
        </div>

        <div className="wechat-qr-wrap">
          <img
            className="wechat-qr"
            src="https://img.alicdn.com/imgextra/i2/O1CN01l93RE11HU89n3cZBG_!!6000000000760-2-tps-676-650.png"
            alt="微信二维码"
          />
          <p className="wechat-qr-tip">扫码添加顾问</p>
        </div>
      </form>
    </section>
  )
}
