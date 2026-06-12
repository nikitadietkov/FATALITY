import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { CartProvider } from './context/CartContext.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </HelmetProvider>
  </StrictMode>,
)