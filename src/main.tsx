import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './styles/index.css'

// Capacitor App 内使用 HashRouter（无服务器回退），网站使用 BrowserRouter
const isCapacitor = (window as any).Capacitor !== undefined
const Router = isCapacitor ? HashRouter : BrowserRouter

// SSG HTML contains serialized SEO tags without React ownership. Remove those tags
// when JavaScript takes over; otherwise SPA navigation leaves stale canonicals behind.
const root = document.getElementById('root')!
if (root.childElementCount > 0) {
  document.head.querySelectorAll('title, link[rel="canonical"], meta[name="description"], meta[name="keywords"], meta[property^="og:"], script[type="application/ld+json"]').forEach(node => node.remove())
}

ReactDOM.createRoot(root).render(
  <HelmetProvider>
    <Router>
      <App />
    </Router>
  </HelmetProvider>
)
