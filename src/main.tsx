import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { runningInTauri, runningOnAndroid } from './lib/runtime'
import './styles.scss'

if (runningInTauri) document.documentElement.classList.add('tauri-app')
if (runningOnAndroid) document.documentElement.classList.add('android-app')

createRoot(document.getElementById('root')!).render(<StrictMode><ToastProvider><AppProvider><App /></AppProvider></ToastProvider></StrictMode>)
