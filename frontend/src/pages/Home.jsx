import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CiFilter } from "react-icons/ci";
import { 
  FaTimes, FaSearch, FaChevronLeft, FaChevronRight, 
  FaMapMarkerAlt, FaWrench, FaExchangeAlt, FaMoneyBillWave, 
  FaThLarge, FaList, FaFire, FaGamepad, FaChevronDown, FaHeart 
} from "react-icons/fa";
import ReactSlider from 'react-slider';
import ProductCard from '../components/ProductCard';
import styles from './Home.module.css';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const CONDITIONS = ['Нова', 'Вживана - Ідеальний стан', 'Вживана - Хороший стан', 'Відновлена (Refurbished)'];
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

// ─── Micro-Components ────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonImg}></div>
    <div className={styles.skeletonText} style={{ width: '80%' }}></div>
    <div className={styles.skeletonText} style={{ width: '60%' }}></div>
    <div className={styles.skeletonBtn}></div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [catalogTree, setCatalogTree] = useState({}); 
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]); 
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(['Консолі']); 
  
  const [priceBounds, setPriceBounds] = useState([0, 40000]); 
  const [priceRange, setPriceRange] = useState([0, 40000]); 
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [animationKey, setAnimationKey] = useState(0);

  // 🔴 Favorites State & LocalStorage Init
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('fatality_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const productsTopRef = useRef(null);

  const debouncedPriceRange = useDebounced(priceRange, DEBOUNCE_DELAY);
  const debouncedSearch = useDebounced(searchQuery, DEBOUNCE_DELAY);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔴 Sync Favorites to LocalStorage
  useEffect(() => {
    localStorage.setItem('fatality_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
      const orderRef = searchParams.get('orderReference');
      if (orderRef) navigate(`/success?orderId=${orderRef}`);
  }, [searchParams, navigate]);

  useEffect(() => {
    document.body.style.overflow = isMobileFilterOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileFilterOpen]);

  // 1. Fetch Bounds & Build Catalog
  useEffect(() => {
    fetch(`${API_BASE}/meta`)
      .then(res => res.json())
      .then(data => {
        const min = data.minPrice || 0;
        const max = data.maxPrice || 40000;
        setPriceBounds([min, max]);
        setPriceRange([min, max]);
      })
      .catch(err => console.error("Помилка завантаження меж цін:", err));

    fetch(`${API_BASE}`)
      .then(res => res.json())
      .then(data => {
        const tree = {};
        data.forEach(p => {
          const cat = p.category || 'Інше';
          const brand = p.brand || 'Інше';
          if (!tree[cat]) tree[cat] = [];
          if (!tree[cat].includes(brand)) tree[cat].push(brand);
        });
        setCatalogTree(tree);
        if (Object.keys(tree).length > 0 && !expandedCategories.length) {
          setExpandedCategories([Object.keys(tree)[0]]);
        }
      })
      .catch(err => console.error("Помилка побудови каталогу:", err));
  }, []);

  // 2. Fetch Products
  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          minPrice: debouncedPriceRange[0],
          maxPrice: debouncedPriceRange[1],
        });
        
        const cats = new Set(selectedCategories);
        const brs = new Set();
        selectedBrands.forEach(b => {
          const [c, br] = b.split('::');
          cats.add(c);
          brs.add(br);
        });

        if (cats.size) params.set('categories', Array.from(cats).join(','));
        if (brs.size) params.set('brands', Array.from(brs).join(','));
        if (selectedConditions.length) params.set('conditions', selectedConditions.join(','));

        const res = await fetch(`${API_BASE}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Помилка сервера: ${res.status}`);

        setProducts(await res.json());
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setTimeout(() => setLoading(false), 400); 
      }
    };

    fetchProducts();
    return () => controller.abort(); 
  }, [selectedCategories, selectedBrands, selectedConditions, debouncedPriceRange]);

  // 3. Exact Client-Side Filtering & Sorting
  const visibleProducts = useMemo(() => {
    let filtered = products;

    // 🔴 Фільтр по улюблених
    if (showFavoritesOnly) {
      filtered = filtered.filter(p => favorites.includes(p._id));
    }

    if (selectedCategories.length > 0 || selectedBrands.length > 0) {
      filtered = filtered.filter(p => {
        const catMatch = selectedCategories.includes(p.category);
        const brandMatch = selectedBrands.includes(`${p.category}::${p.brand}`);
        return catMatch || brandMatch;
      });
    }

    if (selectedConditions.length > 0) {
      filtered = filtered.filter(p => selectedConditions.includes(p.condition));
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (p) => p.title.toLowerCase().includes(q) || 
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.searchTags && p.searchTags.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
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
  }, [products, debouncedSearch, sortBy, selectedCategories, selectedBrands, selectedConditions, showFavoritesOnly, favorites]);

  // Pagination logic
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, sortBy, selectedCategories, selectedBrands, selectedConditions, debouncedPriceRange, showFavoritesOnly]);
  useEffect(() => { setAnimationKey(prev => prev + 1); }, [debouncedSearch, sortBy, selectedCategories, selectedBrands, selectedConditions, debouncedPriceRange, showFavoritesOnly, currentPage, viewMode]);

  const totalPages = Math.ceil(visibleProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = visibleProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    setTimeout(() => {
      if (productsTopRef.current) {
        const headerOffset = 100;
        const elementPosition = productsTopRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }, 50);
  };

  const getPageElements = () => {
    const pages = [];
    let lastAdded = 0;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        if (lastAdded + 1 !== i) pages.push(<span key={`dots-${i}`} className={styles.dots}>...</span>);
        pages.push(
          <button key={i} type="button" className={`${styles.pageBtn} ${currentPage === i ? styles.activePage : ''}`} onClick={() => handlePageChange(i)} aria-current={currentPage === i ? "page" : undefined}>
            {i}
          </button>
        );
        lastAdded = i;
      }
    }
    return pages;
  };

  const toggleItem = useCallback((setState) => (value) => {
    setState((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  }, []);

  const toggleCategoryExpand = (cat) => {
    setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // 🔴 Favorites Toggle Action
  const toggleFavorite = useCallback((id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(id);
      if (isFav) {
        toast('Видалено з улюблених', { icon: '💔' });
        return prev.filter(fId => fId !== id);
      } else {
        toast('Додано в улюблені', { icon: '❤️' });
        return [...prev, id];
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedConditions([]);
    setPriceRange([...priceBounds]);
    setSearchQuery('');
    setShowFavoritesOnly(false); // 🔴 Скидаємо фільтр улюблених
  }, [priceBounds]);

  const applyQuickFilter = (type) => {
    clearAllFilters();
    if (type === 'ps5') {
      setSelectedBrands(['Консолі::Sony']);
      setSearchQuery('PS5');
    }
    if (type === 'budget') setPriceRange([priceBounds[0], 10000]);
    if (type === 'favorites') { // 🔴 Включаємо тільки улюблені
      if (favorites.length === 0) {
        toast.error("Ваш список улюблених порожній.");
      } else {
        setShowFavoritesOnly(true);
      }
    }
  };

  const activeFilterCount = selectedCategories.length + selectedBrands.length + selectedConditions.length + (priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1] ? 1 : 0) + (showFavoritesOnly ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim().length > 0;

  return (
    <div className={styles.homeLayout}>
      <Helmet>
        <title>Каталог консолей | FATALITY</title>
        <meta name="description" content="Купити, обміняти або відремонтувати ігрові консолі PlayStation у магазині FATALITY." />
      </Helmet>

      {isMobileFilterOpen && <div className={styles.mobileFilterOverlay} onClick={() => setIsMobileFilterOpen(false)} aria-hidden="true" />}

      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      <aside className={`${styles.filterContainer} ${isMobileFilterOpen ? styles.open : ''}`} aria-label="Панель фільтрів">
        <div className={styles.filterHeaderMobile}>
          <section className={styles.filterTitle}>
            <CiFilter className={styles.filterIcon} aria-hidden="true" />
            <p className={styles.filterName}>Фільтри</p>
          </section>
          <button type="button" className={styles.closeFilterBtn} onClick={() => setIsMobileFilterOpen(false)}><FaTimes /></button>
        </div>

        {hasActiveFilters && (
          <div className={styles.activeFilters}>
            {showFavoritesOnly && (
               <span className={styles.chip}>
                 Тільки улюблені <button type="button" onClick={() => setShowFavoritesOnly(false)}><FaTimes /></button>
               </span>
            )}
            {selectedCategories.map((c) => (
              <span key={`cat-${c}`} className={styles.chip}>
                {c} <button type="button" onClick={() => toggleItem(setSelectedCategories)(c)}><FaTimes /></button>
              </span>
            ))}
            {selectedBrands.map((b) => {
              const [cat, brand] = b.split('::');
              return (
                <span key={`brand-${b}`} className={styles.chip}>
                  {cat}: {brand} <button type="button" onClick={() => toggleItem(setSelectedBrands)(b)}><FaTimes /></button>
                </span>
              );
            })}
            {selectedConditions.map((c) => (
              <span key={`cond-${c}`} className={styles.chip}>
                {c} <button type="button" onClick={() => toggleItem(setSelectedConditions)(c)}><FaTimes /></button>
              </span>
            ))}
            {(priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1]) && (
              <span className={styles.chip}>
                {priceRange[0]} – {priceRange[1]} грн
                <button type="button" onClick={() => setPriceRange([...priceBounds])}><FaTimes /></button>
              </span>
            )}
            <button type="button" className={styles.clearAll} onClick={clearAllFilters}>Скинути все</button>
          </div>
        )}

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Каталог</h3>
          <div className={styles.catalogTree}>
            {Object.keys(catalogTree).map((category) => (
              <div key={category} className={styles.catalogNode}>
                <div className={styles.catalogNodeHeader}>
                  <label className={styles.checkboxLabel} style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleItem(setSelectedCategories)(category)} />
                    <span className={styles.customCheck}></span>
                    <span className={styles.categoryName}>{category}</span>
                  </label>
                  
                  {catalogTree[category].length > 0 && (
                    <button type="button" className={`${styles.expandBtn} ${expandedCategories.includes(category) ? styles.expanded : ''}`} onClick={() => toggleCategoryExpand(category)}>
                      <FaChevronDown />
                    </button>
                  )}
                </div>
                
                {catalogTree[category].length > 0 && (
                  <div className={`${styles.catalogSubItems} ${expandedCategories.includes(category) ? styles.subItemsOpen : ''}`}>
                    {catalogTree[category].map(brand => {
                      const compKey = `${category}::${brand}`;
                      return (
                        <label key={compKey} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={selectedBrands.includes(compKey)} onChange={() => toggleItem(setSelectedBrands)(compKey)} />
                          <span className={styles.customCheck}></span>
                          {brand}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(catalogTree).length === 0 && <p style={{color: '#888', fontSize: '13px'}}>Каталог формується...</p>}
          </div>
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Стан</h3>
          {CONDITIONS.map((condition) => (
            <label key={condition} className={styles.checkboxLabel}>
              <input type="checkbox" checked={selectedConditions.includes(condition)} onChange={() => toggleItem(setSelectedConditions)(condition)} />
              <span className={styles.customCheck}></span>
              {condition}
            </label>
          ))}
        </section>

        <section className={styles.filterSection}>
          <h3 className={styles.sectionTitle}>Ціна (грн)</h3>
          <div className={styles.priceInputsGroup}>
            <input type="number" placeholder="Min" className={styles.priceInput} value={priceRange[0]} onChange={(e) => setPriceRange([Math.max(priceBounds[0], Math.min(Number(e.target.value), priceRange[1])), priceRange[1]])} />
            <span className={styles.priceDivider}>–</span>
            <input type="number" placeholder="Max" className={styles.priceInput} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Math.min(priceBounds[1], Math.max(Number(e.target.value), priceRange[0]))])} />
          </div>
          <div className={styles.sliderWrapper}>
            <ReactSlider className={styles.dualSlider} thumbClassName={styles.thumb} trackClassName="track" value={priceRange} min={priceBounds[0]} max={priceBounds[1]} onChange={setPriceRange} />
          </div>
        </section>
      </aside>

      {/* ── Products area ───────────────────────────────────────────────────── */}
      <section className={styles.productsArea} ref={productsTopRef}>
        
        <div className={styles.promoBanner}>
          <div className={styles.promoContent}>
            <span className={styles.promoBadge}><FaFire /> Гаряча пропозиція</span>
            <h2>ОНОВИ СВІЙ ГЕЙМІНГ</h2>
            <p>Принось стару консоль — забирай нову PS5 зі знижкою до 60%</p>
            <Link to="/trade-in" className={styles.promoBtn}>ОЦІНИТИ В TRADE-IN</Link>
          </div>
          <div className={styles.promoGraphic}></div>
        </div>

        <div className={styles.actionCardsContainer}>
          <Link to="/service" className={styles.actionCard}>
            <div className={styles.actionIconWrapper}><FaWrench /></div>
            <div className={styles.actionText}>
              <h3>Сервіс</h3>
              <p>Чистка, термопаста, ремонт</p>
            </div>
          </Link>
          <Link to="/trade-in" className={styles.actionCard}>
            <div className={styles.actionIconWrapper}><FaExchangeAlt /></div>
            <div className={styles.actionText}>
              <h3>Трейд-ін</h3>
              <p>Обміняй стару консоль</p>
            </div>
          </Link>
          <Link to="/buyout" className={styles.actionCard}>
            <div className={styles.actionIconWrapper}><FaMoneyBillWave /></div>
            <div className={styles.actionText}>
              <h3>Викуп</h3>
              <p>Миттєва оцінка та виплата</p>
            </div>
          </Link>
        </div>

        <div className={styles.productsAreaHeader}>
          <div className={styles.titleGroup}>
            <h2 className={styles.productsTitle}>{showFavoritesOnly ? 'Улюблені товари' : 'Каталог'}</h2>
            {!loading && <span className={styles.productCount}>{visibleProducts.length} товар{visibleProducts.length === 1 ? '' : 'ів'}</span>}
          </div>

          <div className={styles.headerActions}>
            <div className={styles.quickFilters}>
              <button onClick={() => applyQuickFilter('all')} className={styles.quickFilterBtn}>Всі</button>
              <button onClick={() => applyQuickFilter('favorites')} className={`${styles.quickFilterBtn} ${showFavoritesOnly ? styles.highlightBtn : ''}`}>
                <FaHeart /> Улюблені {favorites.length > 0 && `(${favorites.length})`}
              </button>
            </div>

            <div className={styles.viewToggles}>
              <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? styles.activeView : ''} aria-label="Вигляд сіткою"><FaThLarge/></button>
              <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? styles.activeView : ''} aria-label="Вигляд списком"><FaList/></button>
            </div>

            <div className={styles.sortWrapper}>
              <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Спочатку нові</option>
                <option value="price-asc">Від дешевих до дорогих</option>
                <option value="price-desc">Від дорогих до дешевих</option>
              </select>
            </div>

            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} aria-hidden="true" />
              <input type="search" placeholder="Пошук..." className={styles.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button type="button" className={styles.searchClear} onClick={() => setSearchQuery('')}><FaTimes /></button>}
            </div>

            <button type="button" className={styles.mobileFilterToggle} onClick={() => setIsMobileFilterOpen(true)}>
              <CiFilter size={20} /> Фільтри {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className={styles.nativeLocationHint}>
          <FaMapMarkerAlt className={styles.nativeLocIcon} />
          <span>Працюємо офлайн у м. Дніпро. Завітайте на безкоштовний тест-драйв перед покупкою!</span>
        </div>

        {loading && (
          <div className={viewMode === 'grid' ? styles.productsGrid : styles.productsList}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </div>
        )}

        {error && <div className={styles.errorMessage}><FaTimes className={styles.errorIcon}/> Ой, виникла проблема: {error}</div>}

        {!loading && !error && visibleProducts.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconGhost}>👻</div>
            <p className={styles.emptyStateTitle}>Тут порожньо</p>
            <p className={styles.emptyStateText}>Спробуйте змінити фільтри або пошуковий запит.</p>
            {hasActiveFilters && <button type="button" className={styles.emptyStateClear} onClick={clearAllFilters}>Скинути фільтри</button>}
          </div>
        )}

        {!loading && !error && visibleProducts.length > 0 && (
          <>
            <div className={viewMode === 'grid' ? styles.productsGrid : styles.productsList}>
              {paginatedProducts.map((item, index) => (
                <div key={`${item._id}-${animationKey}`} className={`${styles.animatedCard} ${viewMode === 'list' ? styles.listCardWrapper : ''}`} style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}>
                  <ProductCard 
                    id={item._id} 
                    title={item.title} 
                    model={item.model} 
                    condition={item.condition} 
                    price={item.price} 
                    imageUrl={item.imageUrl} 
                    imageUrls={item.imageUrls} 
                    rating={item.rating} 
                    layoutMode={viewMode}
                    isFavorite={favorites.includes(item._id)}
                    onToggleFavorite={(e) => toggleFavorite(item._id, e)}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.paginationContainer}>
                <button type="button" className={styles.pageBtn} disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}><FaChevronLeft /></button>
                {getPageElements()}
                <button type="button" className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}><FaChevronRight /></button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}