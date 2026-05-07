import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import CursusList from './pages/CursusList'
import Catalogue from './pages/Catalogue'
import CourseDetail from './pages/CourseDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import About from './pages/About'
import BlogList from './pages/BlogList'
import BlogArticle from './pages/BlogArticle'
import MentionsLegales from './pages/MentionsLegales'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'
import CGU from './pages/CGU'
import AdminPanel from './pages/AdminPanel'

import ResourceViewer from './pages/ResourceViewer'
import CourseResourceArticle from './pages/CourseResourceArticle'
import CourseSlides from './pages/CourseSlides'
import Intervenants from './pages/Intervenants'
import ScholarDetail from './pages/ScholarDetail'

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cursus" element={<CursusList />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/intervenants" element={<Intervenants />} />
          <Route path="/intervenant/:scholarId" element={<ScholarDetail />} />
          <Route path="/cours/:courseId" element={<CourseDetail />} />
          <Route path="/cours/:courseId/ressource" element={<CourseResourceArticle />} />
          <Route path="/cours/:courseId/slides" element={<CourseSlides />} />
          <Route path="/ressource/:type/:resourceId" element={<ResourceViewer />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:articleId" element={<BlogArticle />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
          <Route path="/conditions-utilisation" element={<CGU />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  )
}
