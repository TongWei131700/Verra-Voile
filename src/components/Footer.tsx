import { useLocation } from 'react-router-dom'

export default function Footer() {
  const { pathname } = useLocation()
  if (pathname === '/') return null

  return (
    <footer className="site-footer">
      <div className="monogram">V &amp; V</div>
      <p>Forever &amp; Always</p>
      <div className="copy">© 2026 Verra & Voile (Beijing) Network Technology Co., Ltd.</div>
      <div className="site-footer__icp">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow">皖ICP备2026019280号-1</a>
      </div>
    </footer>
  )
}
