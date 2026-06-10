import { useMemo, useCallback } from 'react';
import { FaShoppingCart, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ id, title, model, condition, price, imageUrl, imageUrls, rating }) {
  const { addToCart } = useCart();

  // Оптимізація: обчислюємо URL картинки лише при зміні пропсів
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
    e.preventDefault(); // Запобігаємо переходу за посиланням при кліку на кошик
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
    
    // Стилізація елементу, що летить
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

    // Анімація польоту
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
    
    // Видалення після завершення
    setTimeout(() => {
      flyer.remove();
      window.dispatchEvent(new CustomEvent('animate-cart'));
    }, 400);
  }, [addToCart, id, title, model, price, validImageUrl]);

  const renderStars = () => {
    if (!rating || rating === 0) {
      return (
        <div className={styles.ratingContainer}>
          <span className={styles.noRatingText}>Ще немає відгуків :(</span>
        </div>
      );
    } 

    const fillPercentage = (rating / 5) * 100;

    return (
      <div className={styles.ratingContainer} title={`Рейтинг: ${rating} з 5`}>
        <div className={styles.starsWrapper}>
          <div className={styles.starsOuter}>
            <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
          </div>
          <div className={styles.starsInner} style={{ width: `${fillPercentage}%` }}>
            <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
          </div>
        </div>
        <span className={styles.ratingText}>{rating}</span>
      </div>
    );
  };

  return (
    <article className={styles.card}>
      <span className={styles.conditionBadge}>
        {condition}
      </span>
      
      <Link to={`/product/${id}`} className={styles.imageWrapper}>
        <img src={validImageUrl} alt={title} loading="lazy" />
      </Link>

      <div className={styles.info}>
        <Link to={`/product/${id}`} className={styles.titleLink}>
          <h4 className={styles.title} title={title}>{title}</h4>
        </Link>
        <span className={styles.modelName}>{model} Консоль</span>
        
        {renderStars()}
        
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