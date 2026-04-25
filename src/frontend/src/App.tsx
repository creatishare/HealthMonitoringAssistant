import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/common/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import RecordForm from './pages/RecordForm'
import OCRUpload from './pages/OCRUpload'
import Charts from './pages/Charts'
import Medications from './pages/Medications'
import MedicationForm from './pages/MedicationForm'
import Alerts from './pages/Alerts'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import Settings from './pages/Settings'
import ReminderSettings from './pages/ReminderSettings'
import PrivacySecurity from './pages/PrivacySecurity'
import HelpCenter from './pages/HelpCenter'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './pages/Onboarding'
import PrivacyPolicy from './pages/PrivacyPolicy'
import HealthInsights from './pages/HealthInsights'

function App() {
  const { isAuthenticated, logout, user } = useAuthStore()
  const onboardingCompleted = user?.onboardingCompleted ?? false
  const needsOnboarding = isAuthenticated && !onboardingCompleted

  useEffect(() => {
    const handleUnauthorized = () => logout()
    window.addEventListener('unauthorized', handleUnauthorized)
    return () => window.removeEventListener('unauthorized', handleUnauthorized)
  }, [logout])

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={needsOnboarding ? '/onboarding' : '/'} />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={needsOnboarding ? '/onboarding' : '/'} />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to={needsOnboarding ? '/onboarding' : '/'} />} />
      <Route path="/onboarding" element={isAuthenticated ? (needsOnboarding ? <Onboarding /> : <Navigate to="/" />) : <Navigate to="/login" />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      <Route element={isAuthenticated ? (needsOnboarding ? <Navigate to="/onboarding" /> : <Layout />) : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<Records />} />
        <Route path="/records/new" element={<RecordForm />} />
        <Route path="/records/ocr" element={<OCRUpload />} />
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/records/:id/edit" element={<RecordForm />} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/medications/new" element={<MedicationForm />} />
        <Route path="/medications/:id/edit" element={<MedicationForm />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reminder-settings" element={<ReminderSettings />} />
        <Route path="/privacy-security" element={<PrivacySecurity />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/insights" element={<HealthInsights />} />
      </Route>
    </Routes>
  )
}

export default App
