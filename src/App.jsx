import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ConfigError from './components/ConfigError'
import LoadingScreen from './components/LoadingScreen'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import RecruiterRoute from './components/RecruiterRoute'
import DashboardLayout from './components/layout/DashboardLayout'

import LandingRedirect from './pages/LandingRedirect'
import Login from './pages/Login'
import Register from './pages/Register'
import CompleteProfile from './pages/CompleteProfile'
import NotFound from './pages/NotFound'

import DashboardHome from './pages/dashboard/DashboardHome'
import Opportunities from './pages/dashboard/Opportunities'
import Profile from './pages/dashboard/Profile'
import Team from './pages/dashboard/Team'

import AdminDashboard from './pages/admin/AdminDashboard'
import ManageOpportunities from './pages/admin/ManageOpportunities'
import ManageFacilities from './pages/admin/ManageFacilities'

import RecruiterSearch from './pages/recruiters/Search'
import RecruiterGrantTracker from './pages/recruiters/GrantTracker'
import RecruiterPaywall from './pages/recruiters/Paywall'
import AdminRecruiterSubscribers from './pages/recruiters/AdminSubscribers'
import AdminRecruiterMetrics from './pages/recruiters/AdminMetrics'

export default function App() {
  const { isConfigured, loading } = useAuth()

  if (!isConfigured) return <ConfigError />
  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated, but outside the dashboard shell */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        }
      />

      {/* PA dashboard */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route
          path="/dashboard/opportunities"
          element={<Opportunities key="all" />}
        />
        <Route path="/dashboard/profile" element={<Profile />} />
        <Route path="/dashboard/team" element={<Team />} />
      </Route>

      {/* Admin */}
      <Route
        element={
          <AdminRoute>
            <DashboardLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/opportunities" element={<ManageOpportunities />} />
        <Route path="/admin/facilities" element={<ManageFacilities />} />
      </Route>

      {/* Recruiter section (+ its admin) — self-contained shell with its
          own sidebar, intentionally NOT nested inside DashboardLayout. */}
      <Route
        path="/recruiters/search"
        element={
          <RecruiterRoute>
            <RecruiterSearch />
          </RecruiterRoute>
        }
      />
      <Route
        path="/recruiters/grants"
        element={
          <RecruiterRoute>
            <RecruiterGrantTracker />
          </RecruiterRoute>
        }
      />
      <Route
        path="/recruiters/upgrade"
        element={
          <RecruiterRoute>
            <RecruiterPaywall />
          </RecruiterRoute>
        }
      />
      <Route
        path="/admin/recruiters"
        element={
          <AdminRoute>
            <AdminRecruiterSubscribers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/recruiters/metrics"
        element={
          <AdminRoute>
            <AdminRecruiterMetrics />
          </AdminRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
