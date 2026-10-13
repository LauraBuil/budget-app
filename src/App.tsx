import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApp } from './context/AppContext'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { ThemeLanguageControls } from './components/ThemeLanguageControls'
import { FloatingCalculator } from './components/FloatingCalculator'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { LoadingState } from './components/ui/LoadingState'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then((module) => ({ default: module.BudgetsPage })))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((module) => ({ default: module.GoalsPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function LazyPage({ children }: { children: ReactNode }) {
  const { t } = useApp()
  return <Suspense fallback={<LoadingState label={t('loading')} />}>{children}</Suspense>
}

function ProtectedApp() {
  const { user, isAuthReady, t } = useApp()
  if (!isAuthReady) return <LoadingState fullPage label={t('loading')} />
  if (!user) return <Navigate to="/login" replace />
  if (user.access === 'verificationRequired') return <Navigate to="/verify-email" replace />
  if (user.access === 'emailDomainBlocked') return <Navigate to="/access-denied" replace />
  return <><FloatingCalculator/><AppShell /></>
}

export default function App() {
  return <BrowserRouter><ThemeLanguageControls floating/><Routes><Route path="/login" element={<LoginPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/access-denied" element={<AccessDeniedPage/>}/><Route element={<ProtectedApp/>}><Route path="/" element={<LazyPage><DashboardPage/></LazyPage>}/><Route path="/transactions" element={<LazyPage><TransactionsPage/></LazyPage>}/><Route path="/budgets" element={<LazyPage><BudgetsPage/></LazyPage>}/><Route path="/goals" element={<LazyPage><GoalsPage/></LazyPage>}/><Route path="/analytics" element={<LazyPage><AnalyticsPage/></LazyPage>}/><Route path="/calendar" element={<LazyPage><CalendarPage/></LazyPage>}/><Route path="/settings" element={<LazyPage><SettingsPage/></LazyPage>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>
}
