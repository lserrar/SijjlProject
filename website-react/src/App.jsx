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
import About from './pages/About'
import BlogList from './pages/BlogList'
import BlogArticle from './pages/BlogArticle'
import MentionsLegales from './pages/MentionsLegales'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'
import CGU from './pages/CGU'

import ResourceViewer from './pages/ResourceViewer'

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cursus" element={<CursusList />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/cours/:courseId" element={<CourseDetail />} />
          <Route path="/ressource/:type/:resourceId" element={<ResourceViewer />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:articleId" element={<BlogArticle />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
          <Route path="/conditions-utilisation" element={<CGU />} />
        </Routes>
      </main>
      <Footer />
    </AuthProvider>
  )
}
