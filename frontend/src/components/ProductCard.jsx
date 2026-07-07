import { useMemo, useCallback } from 'react';
import { FaShoppingCart, FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ 
  id, title, model, condition, price, imageUrl, imageUrls, rating, 
  isFavorite, onToggleFavorite // 🔴 New props
}) {
  const { addToCart } = useCart();

  const validImageUrl = useMemo(() => {
    const arrayImages = imageUrls && imageUrls.length > 0 ? imageUrls : [imageUrl].filter(Boolean);
    const firstImg = arrayImages[0];
    if (!firstImg) return 'https://via.placeholder.com/300x200?text=No+Image';
    
    const cleanPath = firstImg.replace(/\\/g, '/');
    return cleanPath.startsWith('/uploads') 
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cleanPath}` 
      : cleanPath;
  }, [imageUrl, imageUrls]);

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    addToCart({ id, title, model, price, imageUrl: validImageUrl });
    
    const button = e.currentTarget;
    const card = button.closest('.' + styles.card);
    const img = card.querySelector('img');
    const cartBtn = document.querySelector('.cart-button');
    
    if (!img || !cartBtn) return;
    
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();
    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    
    Object.assign(flyer.style, {
      left: `${imgRect.left}px`,
      top: `${imgRect.top}px`,
      width: `${imgRect.width}px`,
      height: `${imgRect.height}px`,
      borderRadius: '12px',
      backgroundImage: `url(${validImageUrl})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      position: 'fixed',
      zIndex: 9999,
      transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
    });

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      Object.assign(flyer.style, {
        left: `${cartRect.left + cartRect.width / 2 - 20}px`,
        top: `${cartRect.top + cartRect.height / 2 - 20}px`,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        opacity: '0'
      });
    });
    
    setTimeout(() => {
      flyer.remove();
      window.dispatchEvent(new CustomEvent('animate-cart'));
    }, 400);
  }, [addToCart, id, title, model, price, validImageUrl]);

  return (
    <article className={styles.card}>
      {/* 🔴 Wishlist Toggle */}
      <button 
        className={`${styles.wishlistBtn} ${isFavorite ? styles.isFavorite : ''}`}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Видалити з улюблених" : "Додати в улюблені"}
      >
        {isFavorite ? <FaHeart /> : <FaRegHeart />}
      </button>

      <span className={styles.conditionBadge}>{condition}</span>
      
      <Link to={`/product/${id}`} className={styles.imageWrapper}>
        <img src={validImageUrl} alt={title} loading="lazy" />
      </Link>

      <div className={styles.info}>
        <Link to={`/product/${id}`} className={styles.titleLink}>
          <h4 className={styles.title} title={title}>{title}</h4>
        </Link>
        <span className={styles.modelName}>{model} Консоль</span>
        
        <div className={styles.footer}>
          <span className={styles.price}>{price} грн</span>
          <button 
            className={styles.addToCartBtn} 
            title="Додати в кошик" 
            aria-label="Додати в кошик"
            onClick={handleAddToCart}
          >
            <FaShoppingCart />
          </button>
        </div>
      </div>
    </article>
  );
}