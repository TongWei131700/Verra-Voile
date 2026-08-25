import { useState } from 'react'
import LoginForm from './LoginForm'

interface LoginModalProps {
  onClose: () => void
  onSuccess: () => void
  title?: string
  desc?: string
}

export default function LoginModal({ onClose, onSuccess, title = '登录', desc = '登录后即可查看订单' }: LoginModalProps) {
  const [registered, setRegistered] = useState(false)

  return (
    <>
      <div className="login-modal-backdrop" onClick={onClose} />
      <div className="login-modal">
        <button type="button" className="login-modal__close" onClick={onClose}>✕</button>
        {!registered && (
          <>
            <h3 className="login-modal__title">{title}</h3>
            <p className="login-modal__desc">{desc}</p>
          </>
        )}
        <LoginForm onSuccess={onSuccess} onRegistered={() => setRegistered(true)} />
      </div>
    </>
  )
}
