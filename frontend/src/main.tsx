import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

// Fade out and remove the HTML splash after 1s
const htmlSplash = document.getElementById('html-splash')
if (htmlSplash) {
  setTimeout(() => {
    htmlSplash.style.transition = 'opacity 0.35s ease'
    htmlSplash.style.opacity = '0'
    htmlSplash.style.pointerEvents = 'none'
  }, 1000)
  setTimeout(() => htmlSplash.remove(), 1400)
}
