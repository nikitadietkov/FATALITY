import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { FaGamepad, FaShoppingCart } from "react-icons/fa";
import { useState, useEffect } from 'react';
import { useCart } from './context/CartContext';
import './index.css';

import About from './pages/About';
import Home from './pages/Home';
import Product from './pages/Product';
import Cart from './pages/Cart';

function App() {
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const { itemsCount } = useCart();

  useEffect(() => {
    const handleBounce = () => {
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 400);
    };

    window.addEventListener('animate-cart', handleBounce);
    return () => window.removeEventListener('animate-cart', handleBounce);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="main-header">
          <Link to="/" className="logo-group">
            <FaGamepad className="gamepad-icon" />
            <div className="logo-text">
              <h1 className="logo-title">FATALITY</h1>
              <span className="logo-subtitle">Used PlayStation Shop</span>
            </div>
          </Link>
          <nav>
            <Link to="/cart" className={`cart-button ${isCartBouncing ? 'cart-bounce' : ''}`}>
          
              <div className="cart-icon-wrapper">
                <FaShoppingCart className="cart-icon" />
                {itemsCount > 0 && (
                  <span className="cart-badge">{itemsCount}</span>
                )}
              </div>
              
              <span>Cart</span>
            </Link>
          </nav>
        </header>
        <main style={{ padding: '40px 5%' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/product/:id" element={<Product />} /> 
            <Route path="/cart" element={<Cart />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;