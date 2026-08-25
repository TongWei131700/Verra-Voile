import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useNavShrink } from '../hooks/useScrollAnimations'
import LoginModal from './LoginModal'

const navLinks = [
  { href: '#story', label: '故事' },
  { href: '#venue', label: '庄园' },
  { href: '#destinations', label: '目的地' },
  { href: '#schedule', label: '流程' },
  { href: '#gallery', label: '画廊' },
  { href: '#rsvp', label: '预约咨询' },
]

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

function getUserPhone() {
  return localStorage.getItem('userPhone') || ''
}


export default function Navbar() {
  useNavShrink()
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(isLoggedIn)
  const [userPhone, setUserPhone] = useState(getUserPhone)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)


  // 监听登录状态变化（跨组件同步）
  useEffect(() => {
    const handleStorage = () => {
      setLoggedIn(isLoggedIn())
      setUserPhone(getUserPhone())
    }
    window.addEventListener('storage', handleStorage)
    // 每次页面可见时刷新
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleStorage()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 弹窗打开时锁定滚动
  useEffect(() => {
    document.body.style.overflow = showLoginModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showLoginModal])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userPhone')
    localStorage.removeItem('userEmail')
    setLoggedIn(false)
    setUserPhone('')
    setShowUserMenu(false)
    navigate('/')
  }


  return (
    <>
      <nav>
        <div className="logo">V &amp; V</div>
        <ul>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          {/* 登录/用户菜单 */}
          <li className="nav-user">
            {loggedIn ? (
              <div className="nav-user__logged" ref={menuRef}>
                <button className="nav-user__btn" onClick={() => setShowUserMenu(v => !v)}>
                  <span className="nav-user__avatar">👤</span>
                  <span className="nav-user__phone">{userPhone}</span>
                </button>
                {showUserMenu && (
                  <div className="nav-user__dropdown">
                    <Link to="/order" className="nav-user__menu-item" onClick={() => setShowUserMenu(false)}>
                      📋 我的订单
                    </Link>
                    <button className="nav-user__menu-item" onClick={handleLogout}>
                      🚪 退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-user__login-btn" onClick={() => setShowLoginModal(true)}>
                登录
              </button>
            )}
          </li>
        </ul>
      </nav>

      {/* 登录/注册弹窗 */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setLoggedIn(true)
            setUserPhone(localStorage.getItem('userPhone') || localStorage.getItem('userEmail') || '')
            setShowLoginModal(false)
          }}
        />
      )}
    </>
  )
}
