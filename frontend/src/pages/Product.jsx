import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaShoppingCart, FaArrowLeft, FaStar,
  FaChevronLeft, FaChevronRight, FaTimes, FaUserCircle,
  FaRegHeart, FaHeart, FaShareAlt, FaTruck, FaShieldAlt,
  FaUndo, FaCheckCircle
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';
import styles from './Product.module.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FALLBACK_IMAGE = 'https://placehold.co/600x400/0a0a0a/333?text=No+Image';

function resolveImageUrl(raw) {
  if (!raw) return FALLBACK_IMAGE;
  const clean = raw.replace(/\\/g, '/');
  return clean.startsWith('/uploads') ? `${BASE_URL}${clean}` : clean;
}

function formatPrice(price) {
  if (typeof price !== 'number') return price;
  return price.toLocaleString('uk-UA');
}

// Handles broken image links gracefully
function handleImgError(e) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMAGE;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonLoader() {
  return (
    <div className={styles.productPage}>
      <div className={styles.skeletonBreadcrumb}></div>
      <div className={styles.productContainer}>
        <div className={styles.skeletonImage}></div>
        <div className={styles.infoSection}>
          <div className={styles.skeletonBadge}></div>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonTitle} style={{ width: '60%' }}></div>
          <div className={styles.skeletonRating}></div>
          <div className={styles.skeletonPrice}></div>
          <div className={styles.skeletonDesc}></div>
          <div className={styles.skeletonDesc}></div>
          <div className={styles.skeletonDesc} style={{ width: '80%' }}></div>
          <div className={styles.skeletonBtn}></div>
        </div>
      </div>
    </div>
  );
}

function ImageSlider({ images, currentIndex, onPrev, onNext, onDotClick, onOpenModal, imageRef }) {
  const url = resolveImageUrl(images[currentIndex]);
  const hasMany = images.length > 1;

  const touchStartX = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? onNext() : onPrev();
    }
    touchStartX.current = null;
  };

  return (
    <div className={styles.imageSection}>
      <div
        className={styles.sliderWrapper}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasMany && (
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.arrowLeft}`}
            onClick={onPrev}
            aria-label="Попереднє фото"
          >
            <FaChevronLeft />
          </button>
        )}
        <div className={styles.mainImageWrapper} onClick={onOpenModal}>
          <img
            ref={imageRef}
            key={url}
            src={url}
            onError={handleImgError}
            alt="Фото товару"
            className={`${styles.mainImage} ${styles.animatedImage}`}
          />
        </div>
        {hasMany && (
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.arrowRight}`}
            onClick={onNext}
            aria-label="Наступне фото"
          >
            <FaChevronRight />
          </button>
        )}
      </div>

      {hasMany && (
        <div className={styles.sliderDots}>
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.sliderDot} ${currentIndex === idx ? styles.activeDot : ''}`}
              onClick={() => onDotClick(idx)}
              aria-label={`Фото ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {hasMany && (
        <div className={styles.thumbnailStrip}>
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.thumb} ${currentIndex === idx ? styles.activeThumb : ''}`}
              onClick={() => onDotClick(idx)}
              aria-label={`Перейти до фото ${idx + 1}`}
            >
              <img src={resolveImageUrl(img)} onError={handleImgError} alt={`Мініатюра ${idx + 1}`} />
            </button>
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
        <button
          type="button"
          className={styles.modalCloseBtn}
          onClick={onClose}
          aria-label="Закрити"
        >
          <FaTimes />
        </button>
        {hasMany && (
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.modalArrowLeft}`}
            onClick={onPrev}
            aria-label="Попереднє фото"
          >
            <FaChevronLeft />
          </button>
        )}
        <img key={url} src={url} onError={handleImgError} alt="Повний розмір" className={styles.modalImage} />
        {hasMany && (
          <button
            type="button"
            className={`${styles.sliderArrow} ${styles.modalArrowRight}`}
            onClick={onNext}
            aria-label="Наступне фото"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}

export function RatingStars({ rating, reviewCount }) {
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
      <span className={styles.ratingText}>{rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'відгук' : 'відгуків'})</span>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewerInfo}>
          <FaUserCircle className={styles.userAvatar} />
          <div>
            <h4 className={styles.reviewerName}>{review.name}</h4>
            <div className={styles.reviewStars}>
              {Array.from({ length: 5 }, (_, i) => (
                <FaStar key={i} color={i < review.rating ? '#ff0000' : '#333333'} size={13} />
              ))}
            </div>
          </div>
        </div>
        <span className={styles.reviewDate}>
          {new Date(review.createdAt || Date.now()).toLocaleDateString('uk-UA')}
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
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const MAX_COMMENT_LENGTH = 1000;

  const handleSubmit = async () => {
    if (!name.trim() || !contact.trim() || !comment.trim()) {
      return toast.error("Заповніть всі обов'язкові поля!");
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Перевірка статусу покупки...");

    try {
      const response = await fetch(`${BASE_URL}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          rating,
          comment: comment.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Дякуємо! Ваш відгук успішно додано.", { id: loadingToast, icon: '🔥' });
        setName('');
        setContact('');
        setComment('');
        setRating(5);
        if (onReviewAdded) onReviewAdded(data);
      } else {
        toast.error(data.message || "Помилка додавання відгуку.", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Помилка з'єднання з сервером.", { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.reviewFormContainer}>
      <h3>Залишити відгук</h3>
      <div className={styles.reviewForm}>
        <input
          type="text"
          placeholder="Ваше ім'я *"
          maxLength={60}
          className={styles.reviewInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Email або телефон із замовлення *"
          maxLength={80}
          className={styles.reviewInput}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <span className={styles.privacyNote}>
          * Потрібно для підтвердження покупки. Дані конфіденційні.
        </span>

        <div className={styles.interactiveRating}>
          <span>Ваша оцінка:</span>
          <div className={styles.interactiveStars}>
            {Array.from({ length: 5 }, (_, i) => {
              const val = i + 1;
              return (
                <FaStar
                  key={i}
                  className={styles.starCursor}
                  size={22}
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

        <div className={styles.textareaWrapper}>
          <textarea
            placeholder="Поділіться враженнями про товар..."
            rows="4"
            maxLength={MAX_COMMENT_LENGTH}
            className={styles.reviewInput}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <span className={styles.charCounter}>
            {comment.length} / {MAX_COMMENT_LENGTH}
          </span>
        </div>

        <button
          type="button"
          className={styles.submitReviewBtn}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Обробка запиту…' : 'Опублікувати відгук'}
        </button>
      </div>
    </div>
  );
}

function InfoTabs({ product }) {
  const [activeTab, setActiveTab] = useState('description');

  return (
    <div className={styles.infoTabsBlock}>
      <div className={styles.infoTabsNav} role="tablist">
        {[
          { key: 'description', label: 'Опис' },
          { key: 'specs', label: 'Характеристики' },
          { key: 'delivery', label: 'Доставка та гарантія' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`${styles.infoTab} ${activeTab === key ? styles.activeInfoTab : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'description' && (
        <div className={styles.tabContent}>
          {product.description ? (
            <div
              className={styles.richDescription}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className={styles.richDescription}>Опис товару тимчасово відсутній.</p>
          )}
        </div>
      )}

      {activeTab === 'specs' && (
        <div className={styles.tabContent}>
          {product.specs?.length ? (
            <table className={styles.specsTable}>
              <tbody>
                {product.specs.map((row, i) => (
                  <tr key={i}>
                    <td className={styles.specLabel}>{row.label}</td>
                    <td className={styles.specValue}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.richDescription}>Детальні характеристики не вказані.</p>
          )}
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className={styles.tabContent}>
          <div className={styles.richDescription}>
            <p>📦 <strong>Нова Пошта:</strong> Відправка в день замовлення при оформленні до 16:00 (1-2 дні).</p>
            <p>🏪 <strong>Самовивіз:</strong> Точка видачі у м. Дніпро.</p>
            <p>🛡️ <strong>Гарантія:</strong> 14 днів на обмін/повернення та фірмова гарантія від FATALITY.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuantitySelector({ value, onChange }) {
  return (
    <div className={styles.quantityBlock}>
      <span className={styles.quantityLabel}>Кількість:</span>
      <div className={styles.quantityControl}>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(Math.max(1, value - 1))}
          aria-label="Зменшити"
        >
          −
        </button>
        <span className={styles.qtyValue}>{value}</span>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => onChange(Math.min(10, value + 1))}
          aria-label="Збільшити"
        >
          +
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

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const [isWishlisted, setIsWishlisted] = useState(() => {
    try {
      const saved = localStorage.getItem('fatality_favorites');
      const favs = saved ? JSON.parse(saved) : [];
      return favs.includes(id);
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fatality_favorites');
      const favs = saved ? JSON.parse(saved) : [];
      setIsWishlisted(favs.includes(id));
    } catch (e) {}
  }, [id]);

  const imageRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const load = async () => {
      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      setQuantity(1);

      try {
        const res = await fetch(`${BASE_URL}/api/products/${id}`);
        if (!res.ok) throw new Error('Не вдалося завантажити товар');
        const data = await res.json();
        if (!cancelled) setProduct(data);

        const simRes = await fetch(`${BASE_URL}/api/products`);
        if (simRes.ok) {
          const allProducts = await simRes.json();
          const filtered = allProducts.filter(p => p._id !== id);
          if (!cancelled) setSimilarProducts(filtered.slice(0, 4));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (loading) document.title = 'Завантаження... | FATALITY';
    else if (error) document.title = 'Помилка | FATALITY';
    else if (product) document.title = `${product.title} (${product.condition || 'New'}) | FATALITY`;
    return () => { document.title = 'FATALITY'; };
  }, [loading, error, product]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const images = useMemo(() => {
    if (!product) return [];
    if (product.imageUrls?.length) return product.imageUrls;
    return [product.imageUrl].filter(Boolean);
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

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: `Подивись на товар: ${product.title} у FATALITY!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Посилання скопійовано в буфер обміну!");
      }
    } catch (err) {}
  };

  const toggleFavorite = useCallback(() => {
    try {
      const saved = localStorage.getItem('fatality_favorites');
      let favs = saved ? JSON.parse(saved) : [];

      if (isWishlisted) {
        favs = favs.filter(favId => favId !== id);
        toast('Видалено з улюблених', { icon: '💔' });
      } else {
        favs.push(id);
        toast('Додано в улюблені', { icon: '❤️' });
      }

      localStorage.setItem('fatality_favorites', JSON.stringify(favs));
      setIsWishlisted(!isWishlisted);
    } catch (e) {
      console.error("Помилка оновлення улюблених", e);
    }
  }, [id, isWishlisted]);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: product._id,
      title: product.title,
      model: product.model,
      price: product.price,
      imageUrl: displayImageUrl,
      quantity,
    });

    const img = imageRef.current;
    const cartBtn = document.querySelector('.cart-button');
    if (!img || !cartBtn) {
      toast.success(`Товар додано до кошика (${quantity} шт.)`);
      return;
    }

    const { left: iL, top: iT, width: iW, height: iH } = img.getBoundingClientRect();
    const { left: cL, top: cT, width: cW, height: cH } = cartBtn.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = 'flying-item';
    Object.assign(flyer.style, {
      left: `${iL}px`, top: `${iT}px`,
      width: `${iW}px`, height: `${iH}px`,
      borderRadius: '12px',
      backgroundImage: `url(${displayImageUrl})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      zIndex: 9999,
      position: 'fixed',
      pointerEvents: 'none',
      transition: 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
    });
    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      Object.assign(flyer.style, {
        left: `${cL + cW / 2 - 20}px`,
        top: `${cT + cH / 2 - 20}px`,
        width: '40px', height: '40px',
        borderRadius: '50%',
        opacity: '0.5',
      });
    });

    setTimeout(() => {
      flyer.remove();
      window.dispatchEvent(new CustomEvent('animate-cart'));
      toast.success(`Товар додано до кошика (${quantity} шт.)`);
    }, 600);
  }, [addToCart, product, displayImageUrl, quantity]);

  if (loading) return <SkeletonLoader />;
  if (error) return <div className={styles.statusMessage}>Помилка: {error}</div>;
  if (!product) return <div className={styles.statusMessage}>Товар не знайдено</div>;

  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;

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

      {/* Breadcrumbs */}
      <nav className={styles.breadcrumb} aria-label="Навігація">
        <Link to="/"><FaArrowLeft /> Головна</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.currentCrumb}>{product.model || product.title}</span>
      </nav>

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
            {product.condition && (
              <span className={styles.conditionBadge}>{product.condition}</span>
            )}
            {product.model && (
              <span className={styles.modelTag}>{product.model}</span>
            )}
            {discountPercent && (
              <span className={styles.saleBadge}>-{discountPercent}%</span>
            )}
          </div>

          <h1 className={styles.title}>{product.title}</h1>

          <div className={styles.ratingShareRow}>
            <RatingStars rating={product.rating} reviewCount={product.reviews?.length ?? 0} />
            <button className={styles.iconBtn} onClick={handleShare} aria-label="Поділитися" title="Поділитися">
              <FaShareAlt />
            </button>
          </div>

          {/* Price block */}
          <div className={styles.priceBlock}>
            <div className={styles.priceWrapper}>
              <div>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className={styles.oldPrice}>{formatPrice(product.oldPrice)} грн</span>
                )}
                <span className={styles.price}>{formatPrice(product.price)} грн</span>
              </div>
              <span className={styles.status}>
                <FaCheckCircle size={13} style={{ marginRight: '4px' }} /> В наявності
              </span>
            </div>
          </div>

          <QuantitySelector value={quantity} onChange={setQuantity} />

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.badge}>
              <FaTruck className={styles.badgeIcon} />
              <span>Швидка доставка Новою Поштою по Україні</span>
            </div>
            <div className={styles.badge}>
              <FaShieldAlt className={styles.badgeIcon} />
              <span>Офіційна гарантія та перевірка якості FATALITY</span>
            </div>
            <div className={styles.badge}>
              <FaUndo className={styles.badgeIcon} />
              <span>Легке повернення або обмін протягом 14 днів</span>
            </div>
          </div>

          <div className={styles.actionBlock}>
            <button type="button" className={styles.addToCartBtn} onClick={handleAddToCart}>
              <FaShoppingCart /> Додати в кошик
            </button>
            <button
              type="button"
              className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlisted : ''}`}
              onClick={toggleFavorite}
              aria-label={isWishlisted ? 'Видалити з улюблених' : 'Додати в улюблене'}
            >
              {isWishlisted ? <FaHeart /> : <FaRegHeart />}
            </button>
          </div>

          <InfoTabs product={product} />
        </div>
      </div>

      <section className={styles.reviewsSection} aria-label="Відгуки покупців">
        <h2 className={styles.reviewsTitle}>Відгуки покупців ({product.reviews?.length ?? 0})</h2>

        <div className={styles.reviewsLayout}>
          <div className={styles.reviewsList}>
            {!product.reviews?.length ? (
              <div className={styles.emptyReviews}>
                <FaStar className={styles.emptyReviewsIcon} />
                <p>Поки немає відгуків. Станьте першим, хто залишить враження!</p>
              </div>
            ) : (
              product.reviews.map((review, i) => (
                <ReviewCard key={review._id ?? i} review={review} />
              ))
            )}
          </div>

          <ReviewForm
            productId={id}
            onReviewAdded={async () => {
              try {
                const res = await fetch(`${BASE_URL}/api/products/${id}`);
                if (res.ok) {
                  const freshData = await res.json();
                  setProduct(freshData);
                }
              } catch (err) {
                console.error("Помилка оновлення відгуків", err);
              }
            }}
          />
        </div>
      </section>

      {similarProducts.length > 0 && (
        <section className={styles.similarSection}>
          <h2 className={styles.similarTitle}>Вам також може сподобатися</h2>

          <div className={styles.similarGrid}>
            {similarProducts.map((item, index) => (
              <div
                key={item._id}
                className={styles.animatedCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ProductCard
                  id={item._id}
                  title={item.title}
                  model={item.model}
                  condition={item.condition}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  imageUrls={item.imageUrls}
                  rating={item.rating}
                />
              </div>
            ))}
          </div>

          <div className={styles.similarSlider}>
            {similarProducts.map((item, index) => (
              <div
                key={item._id}
                className={styles.animatedCard}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <ProductCard
                  id={item._id}
                  title={item.title}
                  model={item.model}
                  condition={item.condition}
                  price={item.price}
                  imageUrl={item.imageUrl}
                  imageUrls={item.imageUrls}
                  rating={item.rating}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}