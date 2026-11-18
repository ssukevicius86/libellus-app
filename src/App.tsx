import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import EmailSignIn from '@/pages/Login/EmailSignIn'
import Login from '@/pages/Login/Login'
import NotFound from '@/pages/NotFound/NotFound'
import Register from '@/pages/Register/Register'
import ResetPassword from '@/pages/ResetPassword/ResetPassword'
import Sanctuary from '@/pages/Sanctuary/Sanctuary'

// Páginas secundarias en chunks aparte (Recharts solo carga en /animo)
const AddBook = lazy(() => import('@/pages/AddBook/AddBook'))
const BookDetail = lazy(() => import('@/pages/BookDetail/BookDetail'))
const Library = lazy(() => import('@/pages/Library/Library'))
const Mood = lazy(() => import('@/pages/Mood/Mood'))
const Profile = lazy(() => import('@/pages/Profile/Profile'))
const ReadingSession = lazy(() => import('@/pages/ReadingSession/ReadingSession'))
const Settings = lazy(() => import('@/pages/Settings/Settings'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login/email" element={<EmailSignIn />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/recuperar" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Sanctuary />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/biblioteca/agregar" element={<AddBook />} />
          <Route path="/libro/:id" element={<BookDetail />} />
          <Route path="/sesion" element={<ReadingSession />} />
          <Route path="/animo" element={<Mood />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/ajustes" element={<Settings />} />
          <Route path="/ajustes" element={<Navigate to="/perfil/ajustes" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
