import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaShoppingCart, FaArrowLeft, FaStar,
  FaChevronLeft, FaChevronRight, FaTimes, FaUserCircle,
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import styles from './Product.module.css';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function resolveImageUrl(raw) {
  if (!raw) return 'https://via.placeholder.com/600x400?text=No+Image';
  const clean = raw.replace(/\\/g, '/');
  return clean.startsWith('/uploads') ? `${BASE_URL}${clean}` : clean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImageSlider({ images, currentIndex, onPrev, onNext, onDotClick, onOpenModal, imageRef }) {
  const url = resolveImageUrl(images[currentIndex]);
  const hasMany = images.length > 1;

  return (
    <div className={styles.imageSection}>
      <div className={styles.sliderWrapper}>
        {hasMany && (
          <button className={`${styles.sliderArrow} ${styles.arrowLeft}`} onClick={onPrev} aria-label="Попереднє фото">
            <FaChevronLeft />
          </button>
        )}
        <div className={styles.mainImageWrapper} onClick={onOpenModal}>
          <img
            ref={imageRef}
            key={url}
            src={url}
            alt="Фото товару"
            className={`${styles.mainImage} ${styles.animatedImage}`}
          />
        </div>
        {hasMany && (
          <button className={`${styles.sliderArrow} ${styles.arrowRight}`} onClick={onNext} aria-label="Наступне фото">
            <FaChevronRight />
          </button>
        )}
      </div>

      {hasMany && (
        <div className={styles.sliderDots}>
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.sliderDot} ${currentIndex === idx ? styles.activeDot : ''}`}
              onClick={() => onDotClick(idx)}
              aria-label={`Фото ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageModal({ url, hasMany, onClose, onPrev, onNext }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasMany) onPrev();
      if (e.key === 'ArrowRight' && hasMany) onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext, hasMany]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Закрити">
          <FaTimes />
        </button>
        {hasMany && (
          <button className={`${styles.sliderArrow} ${styles.modalArrowLeft}`} onClick={onPrev}>
            <FaChevronLeft />
          </button>
        )}
        <img key={url} src={url} alt="Повний розмір" className={styles.modalImage} />
        {hasMany && (
          <button className={`${styles.sliderArrow} ${styles.modalArrowRight}`} onClick={onNext}>
            <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}

function RatingStars({ rating, reviewCount }) {
  if (!rating) {
    return (
      <div className={styles.ratingContainer}>
        <span className={styles.noRatingText}>Немає відгуків</span>
      </div>
    );
  }
  return (
    <div className={styles.ratingContainer}>
      <div className={styles.starsWrapper}>
        <div className={styles.starsOuter}>
          {Array.from({ length: 5 }, (_, i) => <FaStar key={`empty-${i}`} />)}
        </div>
        <div className={styles.starsInner} style={{ width: `${(rating / 5) * 100}%` }}>
          {Array.from({ length: 5 }, (_, i) => <FaStar key={`filled-${i}`} />)}
        </div>
      </div>
      <span className={styles.ratingText}>{rating} ({reviewCount})</span>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <FaUserCircle className={styles.userAvatar} />
        <div>
          <h4 className={styles.reviewerName}>{review.name}</h4>
          <div className={styles.reviewStars}>
            {Array.from({ length: 5 }, (_, i) => (
              <FaStar key={i} color={i < review.rating ? '#ff0000' : '#333333'} size={14} />
            ))}
          </div>
        </div>
        <span className={styles.reviewDate}>
          {new Date(review.createdAt).toLocaleDateString('uk-UA')}
        </span>
      </div>
      <p className={styles.reviewText}>{review.comment}</p>
      {review.adminReply && (
        <div className={styles.adminReplyBlock}>
          <span className={styles.adminReplyTitle}>🎮 Відповідь FATALITY:</span>
          <p>{review.adminReply}</p>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productId, onReviewAdded }) {
  const [name, setName]       = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating]   = useState(5);
  const [hover, setHover]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return toast.error('Заповніть всі поля!');

    setSubmitting(true);
    const toastId = toast.loading('Відправляємо відгук...');

    try {
      const res = await fetch(`${BASE_URL}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, comment }),
      });
      if (!res.ok) throw new Error('server error');
      const data = await res.json();
      onReviewAdded(data.product);
      setName(''); setComment(''); setRating(5);
      toast.success('Ваш відгук успішно додано!', { id: toastId });
    } catch {
      toast.error('Помилка при відправці відгуку.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.reviewFormContainer}>
      <h3>Написати відгук</h3>
      <div className={styles.reviewForm}>
        <input
          type="text"
          placeholder="Ваше ім'я"
          className={styles.reviewInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.interactiveRating}>
          <span>Оцінка:</span>
          <div className={styles.interactiveStars}>
            {Array.from({ length: 5 }, (_, i) => {
              const val = i + 1;
              return (
                <FaStar
                  key={i}
                  className={styles.starCursor}
                  size={24}
                  color={val <= (hover ?? rating) ? '#ff0000' : '#444444'}
                  onClick={() => setRating(val)}
                  onMouseEnter={() => setHover(val)}
                  onMouseLeave={() => setHover(null)}
                  aria-label={`${val} зірок`}
                />
              );
            })}
          </div>
        </div>

        <textarea
          placeholder="Поділіться враженнями про консоль..."
          rows="4"
          className={styles.reviewInput}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button
          className={styles.submitReviewBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Відправляємо…' : 'Відправити відгук'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Product() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageRef = useRef(null);

  // Fetch product
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/products/${id}`);
        if (!res.ok) throw new Error('Не вдалося завантажити товар');
        const data = await res.json();
        if (!cancelled) setProduct(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  // Derived image list
  const images = useMemo(() => {
    if (!product) return [];
    return product.imageUrls?.length ? product.imageUrls : [product.imageUrl].filter(Boolean);
  }, [product]);

  const displayImageUrl = resolveImageUrl(images[currentIndex]);

  const prevSlide = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const nextSlide = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: product._id,
      title: product.title,
      model: product.model,
      price: product.price,
      imageUrl: displayImageUrl,
    });

    const img = imageRef.current;
    const cartBtn = document.querySelector('.cart-button');
    if (!img || !cartBtn) return;

    const { left: iL, top: iT, width: iW, height: iH } = img.getBoundingClientRect();
    const { left: cL, top: cT, width: cW, height: cH } = cartBtn.getBoundingClientRect();

    const flyer = Object.assign(document.createElement('div'), { className: 'flying-item' });
    Object.assign(flyer.style, {
      left: `${iL}px`, top: `${iT}px`,
      width: `${iW}px`, height: `${iH}px`,
      borderRadius: '12px',
      backgroundImage: `url(${displayImageUrl})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      zIndex: 9999,
      position: 'fixed'
    });
    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      Object.assign(flyer.style, {
        left: `${cL + cW / 2 - 20}px`,
        top:  `${cT + cH / 2 - 20}px`,
        width: '40px', height: '40px',
        borderRadius: '50%',
        opacity: '0',
      });
    });

    setTimeout(() => {
      flyer.remove();
      window.dispatchEvent(new CustomEvent('animate-cart'));
    }, 400);
  }, [addToCart, product, displayImageUrl]);

  // ---------------------------------------------------------------------------
  if (loading) return <div className={styles.statusMessage}>Завантаження даних...</div>;
  if (error)   return <div className={styles.statusMessage}>Помилка: {error}</div>;
  if (!product) return <div className={styles.statusMessage}>Товар не знайдено</div>;

  return (
    <div className={styles.productPage}>
      {isModalOpen && (
        <ImageModal
          url={displayImageUrl}
          hasMany={images.length > 1}
          onClose={() => setIsModalOpen(false)}
          onPrev={prevSlide}
          onNext={nextSlide}
        />
      )}

      <Link to="/" className={styles.backLink}><FaArrowLeft /> Назад до каталогу</Link>

      <div className={styles.productContainer}>
        <ImageSlider
          images={images}
          currentIndex={currentIndex}
          onPrev={prevSlide}
          onNext={nextSlide}
          onDotClick={setCurrentIndex}
          onOpenModal={() => setIsModalOpen(true)}
          imageRef={imageRef}
        />

        <div className={styles.infoSection}>
          <div className={styles.headerInfo}>
            <span className={styles.conditionBadge}>{product.condition}</span>
            <span className={styles.modelTag}>{product.model} Console</span>
          </div>

          <h1 className={styles.title}>{product.title}</h1>

          <RatingStars
            rating={product.rating}
            reviewCount={product.reviews?.length ?? 0}
          />

          <div className={styles.priceBlock}>
            <span className={styles.price}>{product.price} грн</span>
            <span className={styles.status}>В наявності</span>
          </div>

          <div className={styles.descriptionBlock}>
            <h3>Опис</h3>
            <p>{product.description}</p>
          </div>

          <button className={styles.addToCartBtn} onClick={handleAddToCart}>
            <FaShoppingCart /> Додати в кошик
          </button>
        </div>
      </div>

      <section className={styles.reviewsSection} aria-label="Відгуки покупців">
        <h2 className={styles.reviewsTitle}>Відгуки покупців</h2>

        <div className={styles.reviewsLayout}>
          <div className={styles.reviewsList}>
            {!product.reviews?.length ? (
              <p className={styles.noReviewsMsg}>Станьте першим, хто залишить відгук!</p>
            ) : (
              product.reviews.map((review, i) => (
                <ReviewCard key={review._id ?? i} review={review} />
              ))
            )}
          </div>

          <ReviewForm
            productId={id}
            onReviewAdded={(updated) => setProduct(updated)}
          />
        </div>
      </section>
    </div>
  );
}