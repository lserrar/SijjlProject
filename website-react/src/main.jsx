import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'

const basePath = import.meta.env.VITE_BASE_PATH || '/api/site'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter basename={basePath}>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)
