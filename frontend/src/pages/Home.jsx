import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CiFilter } from "react-icons/ci";
import { FaTimes, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ReactSlider from 'react-slider';
import ProductCard from '../components/ProductCard';
import styles from './Home.module.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const MODELS = ['PS5', 'PS4 Pro', 'PS4', 'PS3'];
const CONDITIONS = ['Нова', 'Вживана - Ідеальний стан', 'Вживана - Хороший стан', 'Відновлена (Refurbished)'];
const PRICE_MIN_DEFAULT = 0;
const PRICE_MAX_DEFAULT = 40000;
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/products`;
const DEBOUNCE_DELAY = 400;
const ITEMS_PER_PAGE = 12; 

// ─── Hook: debounced value ─────────────────────────────────────────────────────
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [priceRange, setPriceRange] = useState([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [animationKey, setAnimationKey] = useState(0);

  const productsTopRef = useRef(null);

  const debouncedPriceRange = useDebounced(priceRange, DEBOUNCE_DELAY);
  const debouncedSearch = useDebounced(searchQuery, DEBOUNCE_DELAY);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
      const orderRef = searchParams.get('orderReference');
      if (orderRef) {
          navigate(`/success?orderId=${orderRef}`);
      }
  }, [searchParams, navigate]);

  useEffect(() => {
    document.body.style.overflow = isMobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileFilterOpen]);

  // ── Fetch products ─────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          minPrice: debouncedPriceRange[0],
          maxPrice: debouncedPriceRange[1],
        });
        if (selectedModels.length)     params.set('models', selectedModels.join(','));
        if (selectedConditions.length) params.set('conditions', selectedConditions.join(','));

        const res = await fetch(`${API_BASE}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Помилка сервера: ${res.status}`);

        setProducts(await res.json());
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort(); 
  }, [selectedModels, selectedConditions, debouncedPriceRange]);

  // ── Client-side search & sorting filter ─────────────────────────────────────
  const visibleProducts = useMemo(() => {
    let filtered = products;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = products.filter(
        (p) => p.title.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price; 
      if (sortBy === 'price-desc') return b.price - a.price; 
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA && timeB) return timeB - timeA;
        return b._id.localeCompare(a._id);
      }
      return 0;
    });
  }, [products, debouncedSearch, sortBy]);

  // ── Логіка Пагінації та Анімацій ────────────────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy, selectedModels, selectedConditions, debouncedPriceRange]);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [debouncedSearch, sortBy, selectedModels, selectedConditions, debouncedPriceRange, currentPage]);

  const totalPages = Math.ceil(visibleProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = visibleProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 🔥 СТАБІЛЬНИЙ СКРОЛ ЧЕРЕЗ setTimeout
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    setCurrentPage(page);
    
    // Даємо 50мс браузеру на відмальовку карток, щоб висота сторінки не стрибала
    setTimeout(() => {
      if (productsTopRef.current) {
        const headerOffset = 100;
        const elementPosition = productsTopRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 50);
  };

  const getPageElements = () => {
    const pages = [];
    let lastAdded = 0;
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        if (lastAdded + 1 !== i) {
          pages.push(<span key={`dots-${i}`} className={styles.dots}>...</span>);
        }
        pages.push(
          <button
            key={i}
            type="button"
            className={`${styles.pageBtn} ${currentPage === i ? styles.activePage : ''}`}
            onClick={() => handlePageChange(i)}
            aria-current={currentPage === i ? "page" : undefined}
          >
            {i}
          </button>
        );
        lastAdded = i;
      }
    }
    return pages;
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleItem = useCallback((setState) => (value) => {
    setState((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedModels([]);
    setSelectedConditions([]);
    setPriceRange([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT]);
    setSearchQuery('');
  }, []);

  const activeFilterCount =
    selectedModels.length +
    selectedConditions.length +
    (priceRange[0] !== PRICE_MIN_DEFAULT || priceRange[1] !== PRICE_MAX_DEFAULT ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.homeLayout}>

      {isMobileFilterOpen && (
        <div
          className={styles.mobileFilterOverlay}
          onClick={() => setIsMobileFilterOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`${styles.filterContainer} ${isMobileFilterOpen ? styles.open : ''}`}
        aria-label="Панель фільтрів"
      >
        <div className={styles.filterHeaderMobile}>
          <section className={styles.filterTitle}>
            <CiFilter className={styles.filterIcon} aria-hidden="true" />
            <p className={styles.filterName}>Фільтри</p>
          </section>
          <button
            type="button"
            className={styles.closeFilterBtn}
            onClick={() => setIsMobileFilterOpen(false)}
            aria-label="Закрити фільтри"
          >
            <FaTimes />
          </button>
        </div>

        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {selectedModels.map((m) => (
              <span key={m} className={styles.chip}>
                {m}
                <button type="button" onClick={() => toggleItem(setSelectedModels)(m)} aria-label={`Видалити фільтр ${m}`}>
                  <FaTimes />
                </button>
              </span>
            ))}
            {selectedConditions.map((c) => (
              <span key={c} className={styles.chip}>
                {c}
                <button type="button" onClick={() => toggleItem(setSelectedConditions)(c)} aria-label={`Видалити фільтр ${c}`}>
                  <FaTimes />
                </button>
              </span>
            ))}
            {(priceRange[0] !== PRICE_MIN_DEFAULT || priceRange[1] !== PRICE_MAX_DEFAULT) && (
              <span className={styles.chip}>
                {priceRange[0]} – {priceRange[1]} грн
                <button type="button" onClick={() => setPriceRange([PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT])} aria-label="Скинути ціну">
                  <FaTimes />
                </button>
              </span>
            )}
            <button type="button" className={styles.clearAll} onClick={clearAllFilters}>
              Скинути все
            </button>
          </div>
        )}

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Модель</h3>
          {MODELS.map((model) => (
            <label key={model} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedModels.includes(model)}
                onChange={() => toggleItem(setSelectedModels)(model)}
              />
              {model}
            </label>
          ))}
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Стан</h3>
          {CONDITIONS.map((condition) => (
            <label key={condition} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedConditions.includes(condition)}
                onChange={() => toggleItem(setSelectedConditions)(condition)}
              />
              {condition}
            </label>
          ))}
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Ціна (грн)</h3>
          <div className={styles.priceInputsGroup}>
            <input
              type="number"
              placeholder="Min"
              className={styles.priceInput}
              value={priceRange[0]}
              min={PRICE_MIN_DEFAULT}
              max={priceRange[1]}
              onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
            />
            <span className={styles.priceDivider}>–</span>
            <input
              type="number"
              placeholder="Max"
              className={styles.priceInput}
              value={priceRange[1]}
              min={priceRange[0]}
              max={PRICE_MAX_DEFAULT}
              onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
            />
          </div>
          <div className={styles.sliderWrapper}>
            <ReactSlider
              className={styles.dualSlider}
              thumbClassName={styles.thumb}
              trackClassName="track"
              value={priceRange}
              min={PRICE_MIN_DEFAULT}
              max={PRICE_MAX_DEFAULT}
              onChange={setPriceRange}
              ariaLabel={['Мінімальна ціна', 'Максимальна ціна']}
            />
          </div>
        </section>
      </aside>

      {/* ── Products area ───────────────────────────────────────────────────── */}
      <section className={styles.productsArea} ref={productsTopRef}>
        <div className={styles.productsAreaHeader}>
          <div className={styles.titleGroup}>
            <h2 className={styles.productsTitle}>Всі товари</h2>
            {!loading && (
              <span className={styles.productCount}>
                {visibleProducts.length} товар{visibleProducts.length === 1 ? '' : 'ів'}
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
            <div className={styles.sortWrapper}>
              <select 
                className={styles.sortSelect} 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Сортування товарів"
              >
                <option value="newest">Спочатку нові</option>
                <option value="price-asc">Від дешевих до дорогих</option>
                <option value="price-desc">Від дорогих до дешевих</option>
              </select>
            </div>

            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                placeholder="Пошук консолі..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Пошук товарів"
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистити пошук"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.mobileFilterToggle}
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label={`Відкрити фільтри${activeFilterCount ? ` (${activeFilterCount} активних)` : ''}`}
            >
              <CiFilter size={20} />
              Фільтри
              {activeFilterCount > 0 && (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {loading && products.length === 0 && (
          <div className={styles.statusMessage}>
            <span className={styles.spinner} aria-hidden="true" />
            Завантаження товарів...
          </div>
        )}

        {error && (
          <div className={styles.errorMessage} role="alert">
            ⚠ {error}
          </div>
        )}

        {!loading && !error && visibleProducts.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>Нічого не знайдено</p>
            <p className={styles.emptyStateText}>
              Спробуйте змінити фільтри або пошуковий запит.
            </p>
            {hasActiveFilters && (
              <button type="button" className={styles.emptyStateClear} onClick={clearAllFilters}>
                Скинути фільтри
              </button>
            )}
          </div>
        )}

        {!error && visibleProducts.length > 0 && (
          <>
            <div className={`${styles.productsGrid} ${loading ? styles.loadingGrid : ''}`}>
              {paginatedProducts.map((item, index) => (
                <div
                  key={`${item._id}-${animationKey}`}
                  className={styles.animatedCard}
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
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

            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  aria-label="Попередня сторінка"
                >
                  <FaChevronLeft />
                </button>
                
                {getPageElements()}
                
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  aria-label="Наступна сторінка"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}