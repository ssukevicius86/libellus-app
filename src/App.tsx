import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login/Login'
import NotFound from '@/pages/NotFound/NotFound'
import Sanctuary from '@/pages/Sanctuary/Sanctuary'

// Páginas secundarias en chunks aparte (Recharts solo carga en /animo)
const AddBook = lazy(() => import('@/pages/AddBook/AddBook'))
const BookDetail = lazy(() => import('@/pages/BookDetail/BookDetail'))
const Library = lazy(() => import('@/pages/Library/Library'))
const Mood = lazy(() => import('@/pages/Mood/Mood'))
const ReadingSession = lazy(() => import('@/pages/ReadingSession/ReadingSession'))
const Settings = lazy(() => import('@/pages/Settings/Settings'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Sanctuary />} />
          <Route path="/biblioteca" element={<Library />} />
          <Route path="/biblioteca/agregar" element={<AddBook />} />
          <Route path="/libro/:id" element={<BookDetail />} />
          <Route path="/sesion" element={<ReadingSession />} />
          <Route path="/animo" element={<Mood />} />
          <Route path="/ajustes" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
