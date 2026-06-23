import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { FaGamepad, FaShoppingCart, FaBars, FaTimes } from "react-icons/fa";
import { useCart } from './context/CartContext';
import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import './index.css';

import AdminLogin from './pages/AdminLogin';
import Product from './pages/Product';
import Success from './pages/Success';
import About from './pages/About';
import Admin from './pages/Admin';
import Home from './pages/Home';
import Cart from './pages/Cart';
import TrackOrder from './pages/TrackOrder';
import NotFound from './pages/NotFound';
import { CartProvider } from './context/CartContext.jsx';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" replace />;
};

function AppContent() {
  const location = useLocation();
  const isAboutPage = location.pathname === '/about';

  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemsCount } = useCart();

  const handleBounce = useCallback(() => {
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 400);
  }, []);

  useEffect(() => {
    window.addEventListener('animate-cart', handleBounce);
    return () => window.removeEventListener('animate-cart', handleBounce);
  }, [handleBounce]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  // Закриваємо меню і скролимо вгору при зміні маршруту
  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className="app-container">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: { 
            background: 'var(--bg-card)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--border-light)', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
            borderRadius: '12px', 
            padding: '16px', 
            fontSize: '15px' 
          },
          success: { iconTheme: { primary: 'var(--success-color)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--primary-color)', secondary: '#fff' } },
        }}
      />

      <div 
        className={`mobile-overlay ${isMenuOpen ? 'visible' : ''}`} 
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      <header className="main-header">
        <Link to="/" className="logo-group">
          <FaGamepad className="gamepad-icon" />
          <div className="logo-text">
            <h1 className="logo-title">FATALITY</h1>
            <span className="logo-subtitle">Used PlayStation Shop</span>
          </div>
        </Link>

        <div className="header-controls">
          <nav className={`main-nav ${isMenuOpen ? 'nav-open' : ''}`}>
            {isAboutPage ? (
              <Link to="/" className="nav-link">Каталог</Link>
            ) : (
              <Link to="/about" className="nav-link">Про нас</Link>
            )}
            {/* 🔥 ДОДАНО ПОСИЛАННЯ В ШАПКУ */}
            <Link to="/track-order" className="nav-link" style={{ color: 'var(--primary-color)' }}>Мої замовлення</Link>
          </nav>

          <Link to="/cart" className={`cart-button ${isCartBouncing ? 'cart-bounce' : ''}`}>
            <div className="cart-icon-wrapper">
              <FaShoppingCart className="cart-icon" />
              {itemsCount > 0 && <span className="cart-badge">{itemsCount}</span>}
            </div>
            <span className="cart-text">Кошик</span>
          </Link>

          <button 
            className="burger-btn" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Перемикач меню"
          >
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      <main className={`main-content ${location.pathname === '/about' ? 'no-padding' : ''}`}>
        <Routes>
          <Route path="/product/:id" element={<Product />} /> 
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/" element={<Home />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/success" element={<Success />} />
        </Routes>
      </main>

      <footer className="main-footer">
        <div className="footer-top">
          <div className="footer-logo">
            <FaGamepad className="footer-icon" />
            <span>FATALITY</span>
          </div>
          <div className="footer-links">
            <Link to="/">Каталог</Link>
            <Link to="/about">Про нас</Link>
            {/* 🔥 ДОДАНО ПОСИЛАННЯ В ПІДВАЛ */}
            <Link to="/track-order">Мої замовлення</Link>
            <Link to="/cart">Кошик</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FATALITY. Всі права захищені.</p>
          <p className="footer-subtext">Перший в Україні преміальний магазин відновлених консолей.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}