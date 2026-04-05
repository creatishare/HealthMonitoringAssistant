import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { initTheme } from './stores/themeStore'
import './index.css'

// 初始化主题
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
