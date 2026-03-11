import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import CursusList from './pages/CursusList'
import CourseDetail from './pages/CourseDetail'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cursus" element={<CursusList />} />
          <Route path="/cours/:courseId" element={<CourseDetail />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  )
}
