import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useApp } from './context/AppContext'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import { GoalsPage } from './pages/GoalsPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { WebMCPTools } from './components/WebMCPTools'

function ProtectedApp() {
  const { user } = useApp()
  return user ? <AppShell /> : <Navigate to="/login" replace />
}

export default function App() {
  return <BrowserRouter><WebMCPTools/><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedApp/>}><Route path="/" element={<DashboardPage/>}/><Route path="/transactions" element={<TransactionsPage/>}/><Route path="/budgets" element={<BudgetsPage/>}/><Route path="/goals" element={<GoalsPage/>}/><Route path="/analytics" element={<AnalyticsPage/>}/><Route path="/calendar" element={<CalendarPage/>}/><Route path="/settings" element={<SettingsPage/>}/></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>
}
