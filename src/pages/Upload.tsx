import { useState, useRef, useCallback } from 'react'

interface UploadedFile {
  url: string
  filename: string
  size: number
}

export default function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()
    if (json.success) {
      return json.data as UploadedFile
    }
    throw new Error(json.message || '上传失败')
  }

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const images = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return

    setUploading(true)
    try {
      const results = await Promise.all(images.map(uploadFile))
      setFiles((prev) => [...results, ...prev])
    } catch (err: any) {
      alert(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }, [])

  // 拖拽
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  // 粘贴
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      const imageFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        handleFiles(imageFiles)
      }
    },
    [handleFiles]
  )

  // 点击选择
  const handleClick = () => inputRef.current?.click()

  // 复制链接
  const copyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(url)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div
      className="upload-page"
      onPaste={handlePaste}
      tabIndex={0}
    >
      <header className="upload-header">
        <h1>图片上传</h1>
        <p>支持粘贴 · 拖拽 · 点击上传，返回可访问链接</p>
      </header>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="upload-status">上传中...</div>
        ) : (
          <>
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              拖拽图片到此处 / 点击选择 / Ctrl+V 粘贴
            </div>
            <div className="upload-hint">支持 jpg、png、gif、webp，最大 10MB</div>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="upload-results">
          <h2>已上传 ({files.length})</h2>
          <div className="upload-grid">
            {files.map((file) => (
              <div key={file.url} className="upload-card">
                <div className="upload-preview">
                  <img src={file.url} alt={file.filename} />
                </div>
                <div className="upload-info">
                  <div className="upload-filename">{file.filename}</div>
                  <div className="upload-size">{formatSize(file.size)}</div>
                  <div className="upload-url-row">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${file.url}`}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      className={`copy-btn ${copied === file.url ? 'copied' : ''}`}
                      onClick={() => copyUrl(file.url)}
                    >
                      {copied === file.url ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
