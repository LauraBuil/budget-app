import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import './styles.scss'

createRoot(document.getElementById('root')!).render(<StrictMode><ToastProvider><AppProvider><App /></AppProvider></ToastProvider></StrictMode>)
