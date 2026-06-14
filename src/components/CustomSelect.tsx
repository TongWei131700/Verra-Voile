import { useState, useRef, useEffect } from 'react'

interface CustomSelectProps {
  options: string[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
}

export default function CustomSelect({ options, placeholder, value, onChange, required }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(value || '')
  const wrapperRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (opt: string) => {
    setSelected(opt)
    setIsOpen(false)
    onChange && onChange(opt)
  }

  return (
    <div className="custom-select" ref={wrapperRef}>
      <div
        className={`custom-select__trigger ${isOpen ? 'open' : ''} ${selected ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-select__value">
          {selected || placeholder}
        </span>
        <span className="custom-select__arrow">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {isOpen && (
        <ul className="custom-select__dropdown">
          {options.map((opt) => (
            <li
              key={opt}
              className={`custom-select__option ${selected === opt ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {/* 隐藏的原生 input 用于表单验证 */}
      <input
        type="hidden"
        value={selected}
        required={required}
      />
    </div>
  )
}
