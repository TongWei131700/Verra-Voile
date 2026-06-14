import { useNavShrink } from '../hooks/useScrollAnimations'

const navLinks = [
  { href: '#story', label: '故事' },
  { href: '#venue', label: '庄园' },
  { href: '#destinations', label: '目的地' },
  { href: '#schedule', label: '流程' },
  { href: '#gallery', label: '画廊' },
  { href: '#rsvp', label: '预约咨询' },
]

export default function Navbar() {
  useNavShrink()

  return (
    <nav>
      <div className="logo">V &amp; V</div>
      <ul>
        {navLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
