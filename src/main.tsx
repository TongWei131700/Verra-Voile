import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './styles/index.css'

// Capacitor App 内使用 HashRouter（无服务器回退），网站使用 BrowserRouter
const isCapacitor = (window as any).Capacitor !== undefined
const Router = isCapacitor ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <Router>
      <App />
    </Router>
  </HelmetProvider>
)
