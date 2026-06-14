import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface DatePickerProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

export default function DatePicker({ placeholder, value, onChange }: DatePickerProps) {
  const today = new Date()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
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

  const daysInMonth = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth])
  const firstDay = useMemo(() => getFirstDayOfMonth(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const isPrevDisabled = viewYear === today.getFullYear() && viewMonth <= today.getMonth()

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day)
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return

    setSelectedDate(date)
    setIsOpen(false)
    const label = `${viewYear} 年 ${viewMonth + 1} 月 ${day} 日`
    onChange && onChange(label)
  }

  const isToday = (day: number) => {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getFullYear() === viewYear &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getDate() === day
  }

  const isPastDay = (day: number) => {
    const date = new Date(viewYear, viewMonth, day)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return date < todayStart
  }

  const displayValue = selectedDate
    ? `${selectedDate.getFullYear()} 年 ${selectedDate.getMonth() + 1} 月 ${selectedDate.getDate()} 日`
    : ''

  // 生成日历格子
  const calendarCells: ReactNode[] = []
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(<span key={`empty-${i}`} className="date-picker__day empty"></span>)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const past = isPastDay(day)
    const sel = isSelected(day)
    const todayClass = isToday(day)
    calendarCells.push(
      <button
        type="button"
        key={day}
        className={`date-picker__day ${sel ? 'selected' : ''} ${todayClass ? 'today' : ''} ${past ? 'disabled' : ''}`}
        onClick={() => handleDayClick(day)}
        disabled={past}
      >
        {day}
      </button>
    )
  }

  return (
    <div className="date-picker" ref={wrapperRef}>
      <div
        className={`date-picker__trigger ${isOpen ? 'open' : ''} ${displayValue ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-picker__value">
          {displayValue || placeholder}
        </span>
        <span className="date-picker__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      </div>

      {isOpen && (
        <div className="date-picker__panel">
          <div className="date-picker__header">
            <button
              type="button"
              className="date-picker__nav"
              onClick={prevMonth}
              disabled={isPrevDisabled}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="date-picker__year-month">
              {viewYear} · {MONTH_NAMES[viewMonth]}
            </span>
            <button
              type="button"
              className="date-picker__nav"
              onClick={nextMonth}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="date-picker__weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="date-picker__weekday">{w}</span>
            ))}
          </div>
          <div className="date-picker__grid">
            {calendarCells}
          </div>
        </div>
      )}

      <input type="hidden" value={displayValue} />
    </div>
  )
}
