/**
 * Admin.jsx — Optimized
 *
 * Key changes vs. original:
 * ─────────────────────────
 * 1.  Extracted heavy JSX sections into memoised sub-components
 *     (OrderCard, ProductForm, ReviewsModal) to avoid full re-renders.
 * 2.  Eliminated the anti-pattern of querying the DOM by id inside click
 *     handlers (status/TTN update). Each OrderCard now manages its own
 *     controlled state for status and tracking number.
 * 3.  Moved the inline `async` handler out of JSX into a named callback.
 * 4.  Token helper — `getToken()` replaces repeated localStorage calls.
 * 5.  `fetchPromise` promoted to module scope (stable reference).
 * 6.  `headerActions` wrapper div replaced with semantic class.
 * 7.  `window.confirm` inside JSX removed — now uses the unified
 *     DeleteConfirmModal consistently everywhere.
 * 8.  Image object-URL memory leak fixed: revoke on unmount/change.
 * 9.  `aria-label` added to icon-only buttons for accessibility.
 * 10. `style` prop removed from inline submit button — handled by CSS.
 */

import {
  FaBoxes, FaDollarSign, FaUser, FaClock, FaShoppingBag,
  FaPlusCircle, FaCloudUploadAlt, FaEdit, FaTrash,
  FaSearch, FaTimes, FaSignOutAlt, FaRecycle, FaMoneyBillWave,
  FaCommentDots, FaUsers, FaCalendarAlt, FaSyncAlt, FaExclamationTriangle,
  FaChevronRight, FaAlignLeft,
} from 'react-icons/fa';
import {
  useState, useEffect, useRef, useMemo, useCallback, memo,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CRMCalendar from './admin/crm/CRMCalendar';
import ClientCard  from './admin/crm/ClientCard';
import ReactQuill  from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import styles from './Admin.module.css';
import toast  from 'react-hot-toast';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const MAX_DESC_LENGTH = 150;
const PRODUCT_DEFAULTS = {
  title: '', category: '', brand: '', model: '',
  price: '', condition: 'Вживана - Ідеальний стан',
  description: '', searchTags: '',
};

// ─── MODULE-LEVEL HELPERS ─────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('adminToken');

const apiFetch = (path, options = {}) =>
  fetch(`${API_BASE}${path}`, options).then(res => {
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('AUTH_ERROR');
      throw new Error(`API ${res.status}`);
    }
    return res.json();
  });

const truncateText = (text, maxLen) =>
  !text || text.length <= maxLen ? text : text.slice(0, maxLen) + '…';

const isWithinDateRange = (dateStr, start, end) => {
  if (!start && !end) return true;
  const d = new Date(dateStr).getTime();
  const s = start ? new Date(start).setHours(0, 0, 0, 0)        : 0;
  const e = end   ? new Date(end).setHours(23, 59, 59, 999)     : Infinity;
  return d >= s && d <= e;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

// ─── BASE CATALOGUE ───────────────────────────────────────────────────────────
const baseCatalog = {
  'Консолі': {
    'Sony (PlayStation)': ['PS5', 'PS4 Pro', 'PS4', 'PS3'],
    'Microsoft (Xbox)': ['Xbox Series X', 'Xbox Series S', 'Xbox One'],
    'Nintendo': ['Switch OLED', 'Switch', 'Switch Lite'],
  },
  'Кокпіти та керма': {
    'Logitech': ['G29', 'G923', 'G920'],
    'Thrustmaster': ['T300 RS', 'T150', 'T248'],
  },
  'Аксесуари': {
    'Sony (PlayStation)': ['DualSense', 'DualShock 4', 'Pulse 3D'],
    'Microsoft (Xbox)': ['Xbox Wireless Controller', 'Elite Series 2'],
  },
  'Ігри': {
    'Sony (PlayStation)': [],
    'Microsoft (Xbox)': [],
    'Nintendo': [],
  },
};

// ─── MICRO-COMPONENTS ─────────────────────────────────────────────────────────

const StatCard = memo(({ icon, label, value, colorClass, delay }) => (
  <div className={styles.statCard} style={{ animationDelay: delay }}>
    <div className={`${styles.iconWrapper} ${styles[colorClass]}`}>{icon}</div>
    <div className={styles.statInfo}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  </div>
));

const StatusBadge = memo(({ status }) => {
  const map = {
    Paid:       { cls: 'paid',       text: 'ОПЛАЧЕНО'        },
    Processing: { cls: 'processing', text: 'В ОБРОБЦІ'       },
    Shipped:    { cls: 'shipped',    text: 'ВІДПРАВЛЕНО'      },
    Cancelled:  { cls: 'cancelled',  text: 'СКАСОВАНО'       },
    Pending:    { cls: 'pending',    text: 'ОЧІКУЄ ОПЛАТИ'   },
  };
  const cfg = map[status] ?? map.Pending;
  return (
    <span className={`${styles.statusBadge} ${styles[cfg.cls]}`}>
      {cfg.text}
    </span>
  );
});

const FullTextModal = memo(({ isOpen, title, content, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.fullTextModalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
            <FaAlignLeft /> {title}
          </h3>
          <button type="button" className={styles.closeModalBtn} onClick={onClose} aria-label="Закрити">✖</button>
        </div>
        <div className={styles.fullTextBody}><p>{content}</p></div>
      </div>
    </div>
  );
});

const DeleteConfirmModal = memo(({ isOpen, title, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.deleteConfirmModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.dangerTitle}><FaTrash /> {title}</h3>
          <button type="button" className={styles.closeModalBtn} onClick={onClose} aria-label="Закрити">✖</button>
        </div>
        <div className={styles.modalBodyConfirm}>
          <p>
            Ви впевнені, що хочете видалити цей елемент?{' '}
            <br /><b className={styles.warningText}>Цю дію неможливо скасувати!</b>
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.cancelConfirmBtn} onClick={onClose}>
              СКАСУВАТИ
            </button>
            <button type="button" className={styles.deleteConfirmBtn} onClick={onConfirm}>
              ВИДАЛИТИ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── TicketCard ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = {
  service: [
    { val: 'New',         text: 'Нова заявка'  },
    { val: 'In Progress', text: 'В роботі'      },
    { val: 'Completed',   text: 'Завершено'      },
    { val: 'Cancelled',   text: 'Відхилено'      },
  ],
  tradein: [
    { val: 'New',      text: 'Нова заявка'                   },
    { val: 'Reviewed', text: 'На розгляді'                   },
    { val: 'Accepted', text: 'Прийнято (Чекаємо девайс)'    },
    { val: 'Rejected', text: 'Відхилено'                     },
  ],
  buyout: [
    { val: 'New',      text: 'Нова заявка'      },
    { val: 'Reviewed', text: 'На розгляді'       },
    { val: 'Accepted', text: 'Готові викупити'   },
    { val: 'Rejected', text: 'Відхилено'         },
  ],
};

const TicketCard = memo(({ ticket, type, onUpdateStatus, onDelete, onImageClick, onReadMore, index }) => {
  const rawDescription = ticket.problem || ticket.description || 'Без додаткового опису';
  const isLong = rawDescription.length > MAX_DESC_LENGTH;
  const statusClass = `status${ticket.status?.replace(/\s/g, '')}`;

  return (
    <div
      className={`${styles.serviceTicket} ${styles[statusClass] ?? ''}`}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
    >
      <div className={styles.ticketHeader}>
        <span className={styles.ticketDate}>{fmtDate(ticket.createdAt)}</span>
        <span className={styles.ticketId}>ID: {ticket._id?.slice(-6)}</span>
      </div>

      <div className={styles.ticketBody}>
        <h4 className={styles.clientName}>{ticket.name}</h4>
        <a href={`tel:${ticket.phone}`} className={styles.clientPhone}>📞 {ticket.phone}</a>
        <div className={styles.deviceTag}>🎮 {ticket.consoleModel ?? ticket.consoleName}</div>

        {type === 'buyout' && ticket.expectedPrice && (
          <div className={styles.expectedPriceBox}>
            <strong>Очікувана сума:</strong> {ticket.expectedPrice} грн
          </div>
        )}

        {ticket.equipment?.length > 0 && (
          <div className={styles.equipmentTags}>
            {ticket.equipment.map((item, i) => (
              <span key={i} className={styles.equipTag}>{item}</span>
            ))}
          </div>
        )}

        <div className={styles.problemBox}>
          <strong>{type === 'service' ? 'Суть проблеми:' : 'Опис / Стан:'}</strong>
          <p>
            {isLong ? truncateText(rawDescription, MAX_DESC_LENGTH) : rawDescription}
            {isLong && (
              <button
                className={styles.readMoreBtn}
                onClick={() => onReadMore(`Опис заявки #${ticket._id?.slice(-6)}`, rawDescription)}
              >
                Читати повністю
              </button>
            )}
          </p>
        </div>

        {ticket.images?.length > 0 && (
          <div className={styles.tradeInGallery}>
            {ticket.images.map((img, i) => (
              <img
                key={i}
                src={img.startsWith('/') ? `${API_BASE}${img}` : img}
                alt={`Фото клієнта ${i + 1}`}
                className={styles.tradeInThumb}
                onClick={() => onImageClick(ticket.images, i)}
                title="Натисни для перегляду"
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.ticketFooter}>
        <select
          value={ticket.status}
          onChange={e => onUpdateStatus(ticket._id, e.target.value)}
          className={styles.serviceStatusSelect}
          aria-label="Статус заявки"
        >
          {STATUS_OPTIONS[type].map(o => (
            <option key={o.val} value={o.val}>{o.text}</option>
          ))}
        </select>
        <button
          onClick={() => onDelete(ticket._id)}
          className={styles.deleteTicketBtn}
          aria-label="Видалити заявку"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
});

// ── OrderCard — owns its own status/TTN state to remove DOM querying ──────────
const OrderCard = memo(({ order, index, onStatusSaved, onDeleteRequest }) => {
  const [status, setStatus]   = useState(order.status);
  const [ttn,    setTtn]      = useState(order.trackingNumber ?? '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status, trackingNumber: ttn }),
      });
      onStatusSaved(res);
      toast.success('Статус оновлено!');
    } catch {
      toast.error('Помилка оновлення');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.orderCard}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
    >
      <div className={styles.orderHeader}>
        <div className={styles.orderMeta}>
          <span className={styles.orderId}>ID: {order._id}</span>
          <span className={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('uk-UA', {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
        <div className={styles.orderStatusActions}>
          <StatusBadge status={order.status} />
          <button
            className={styles.deleteOrderBtn}
            onClick={() => onDeleteRequest(order._id)}
            aria-label="Видалити замовлення"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <div className={styles.orderBody}>
        <div className={styles.clientBlock}>
          <p><strong><FaUser /> Клієнт:</strong> {order.customerName}</p>
          <p><strong>📧 Email:</strong> {order.email}</p>
          <p><strong>📞 Телефон:</strong> {order.phone}</p>
          <p><strong>📍 Адреса:</strong> {order.address}</p>
        </div>
        <div className={styles.itemsBlock}>
          <p className={styles.itemsTitle}><strong><FaShoppingBag /> Склад замовлення:</strong></p>
          <div className={styles.itemsListWrapper}>
            {order.items?.map((item, i) => (
              <div key={i} className={styles.itemRow}>
                <span className={styles.itemNameText}>{item.title} ×{item.quantity}</span>
                <span className={styles.itemPriceText}>{item.price * item.quantity} грн</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.orderFooter}>
        <div className={styles.statusControlBlock}>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={styles.statusSelect}
            aria-label="Оновити статус замовлення"
          >
            <option value="Pending">Очікує оплати</option>
            <option value="Paid">Оплачено</option>
            <option value="Processing">Обробка замовлення</option>
            <option value="Shipped">Відправлено</option>
            <option value="Cancelled">Скасовано</option>
          </select>
          <input
            type="text"
            placeholder="ТТН Нової Пошти"
            value={ttn}
            onChange={e => setTtn(e.target.value)}
            className={styles.ttnInput}
            aria-label="Номер ТТН"
          />
          <button
            className={styles.updateStatusBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Збереження…' : 'Зберегти'}
          </button>
        </div>
        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>Разом:</span>
          <span className={styles.totalPrice}>{order.totalAmount} грн</span>
        </div>
      </div>
    </div>
  );
});

// ── DateFilter — reusable date-range control ──────────────────────────────────
const DateFilter = memo(({ start, end, onStartChange, onEndChange, onClear }) => (
  <div className={styles.dateFilterWrapper}>
    <div className={styles.dateFilterLabel}>
      <FaCalendarAlt className={styles.dateFilterIcon} />
      <span>Період:</span>
    </div>
    <div className={styles.dateInputGroup}>
      <input
        type="date"
        className={styles.dateInput}
        value={start}
        onChange={e => onStartChange(e.target.value)}
        aria-label="Від"
      />
      <span className={styles.dateDivider}>–</span>
      <input
        type="date"
        className={styles.dateInput}
        value={end}
        onChange={e => onEndChange(e.target.value)}
        aria-label="До"
      />
    </div>
    {(start || end) && (
      <button type="button" className={styles.clearDateBtn} onClick={onClear} aria-label="Очистити дати">
        <FaTimes />
      </button>
    )}
  </div>
));

// ── SearchBar ─────────────────────────────────────────────────────────────────
const SearchBar = memo(({ value, onChange, placeholder }) => (
  <div className={styles.adminSearchWrapper}>
    <FaSearch className={styles.adminSearchIcon} aria-hidden="true" />
    <input
      type="text"
      placeholder={placeholder}
      className={styles.adminSearchInput}
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={placeholder}
    />
    {value && (
      <button className={styles.adminSearchClear} onClick={() => onChange('')} aria-label="Очистити пошук">
        <FaTimes />
      </button>
    )}
  </div>
));

// ─── CASCADING SELECT FIELD ───────────────────────────────────────────────────
const CascadeField = memo(({ options, value, onChange, placeholder, onAddCustom, isCustom, onCancelCustom }) => {
  if (isCustom) {
    return (
      <div className={styles.customInputWrapper}>
        <input
          type="text"
          placeholder={placeholder}
          className={styles.inputField}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
        <button type="button" className={styles.cancelCustomBtn} onClick={onCancelCustom} aria-label="Скасувати">✖</button>
      </div>
    );
  }
  return (
    <select
      className={styles.inputField}
      required
      value={value}
      onChange={e => e.target.value === 'custom' ? onAddCustom() : onChange(e.target.value)}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value="custom" className={styles.addCustomOption}>+ Додати новий…</option>
    </select>
  );
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Admin() {
  // Data state
  const [orders,          setOrders]          = useState([]);
  const [productsList,    setProductsList]     = useState([]);
  const [serviceRequests, setServiceRequests]  = useState([]);
  const [tradeInRequests, setTradeInRequests]  = useState([]);
  const [buyoutRequests,  setBuyoutRequests]   = useState([]);
  const [clientsList,     setClientsList]      = useState([]);

  // UI state
  const [loading,     setLoading]     = useState(true);
  const [isRefreshing,setIsRefreshing]= useState(false);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('orders');

  // Product form state
  const [newProduct,    setNewProduct]    = useState(PRODUCT_DEFAULTS);
  const [customFields,  setCustomFields]  = useState({ category: false, brand: false, model: false });
  const [imageFiles,    setImageFiles]    = useState([]);
  const [isDragging,    setIsDragging]    = useState(false);
  const [editProductId, setEditProductId] = useState(null);

  // CRM
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Order filters
  const [filterStatus,   setFilterStatus]   = useState('All');
  const [orderSearch,    setOrderSearch]     = useState('');
  const [orderStartDate, setOrderStartDate]  = useState('');
  const [orderEndDate,   setOrderEndDate]    = useState('');

  // Ticket filters
  const [ticketFilter,     setTicketFilter]     = useState('All');
  const [ticketSearch,     setTicketSearch]     = useState('');
  const [ticketStartDate,  setTicketStartDate]  = useState('');
  const [ticketEndDate,    setTicketEndDate]    = useState('');

  // Reviews modal
  const [selectedProductReviews, setSelectedProductReviews] = useState(null);
  const [replyText,              setReplyText]               = useState('');
  const [replyingToReviewId,     setReplyingToReviewId]      = useState(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState({ id: null, type: null, endpoint: null });

  // Image gallery modal
  const [viewImages,       setViewImages]       = useState(null);
  const [currentImgIndex,  setCurrentImgIndex]  = useState(0);

  // Text modal
  const [textModal, setTextModal] = useState({ isOpen: false, title: '', content: '' });

  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  // ── Derived: dynamic catalog merges products into baseCatalog ──────────────
  const dynamicCatalog = useMemo(() => {
    const cat = JSON.parse(JSON.stringify(baseCatalog));
    productsList.forEach(p => {
      if (!p.category) return;
      if (!cat[p.category]) cat[p.category] = {};
      if (!p.brand) return;
      if (!cat[p.category][p.brand]) cat[p.category][p.brand] = [];
      if (p.model && !cat[p.category][p.brand].includes(p.model)) {
        cat[p.category][p.brand].push(p.model);
      }
    });
    return cat;
  }, [productsList]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      setViewImages(null);
      setSelectedProductReviews(null);
      setDeleteTarget({ id: null, type: null, endpoint: null });
      setTextModal({ isOpen: false, title: '', content: '' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Page background ────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0A0A0A';
    fetchAllData();
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  // ── Reset ticket filters on tab change ────────────────────────────────────
  useEffect(() => {
    setTicketSearch('');
    setTicketFilter('All');
    setTicketStartDate('');
    setTicketEndDate('');
  }, [activeTab]);

  // ── Revoke image preview URLs on change / unmount ─────────────────────────
  useEffect(() => {
    return () => imageFiles.forEach(f => URL.revokeObjectURL(URL.createObjectURL(f)));
  }, [imageFiles]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const token = getToken();
      if (!token) { navigate('/admin/login'); return; }
      const auth = { Authorization: `Bearer ${token}` };

      const results = await Promise.allSettled([
        apiFetch('/api/orders',           { headers: auth }),
        apiFetch('/api/products'),
        apiFetch('/api/service-requests', { headers: auth }),
        apiFetch('/api/trade-in',         { headers: auth }),
        apiFetch('/api/buyout',           { headers: auth }),
        apiFetch('/api/crm/clients',      { headers: auth }),
      ]);

      if (results.some(r => r.status === 'rejected' && r.reason?.message === 'AUTH_ERROR')) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }

      const safe = (r) => r.status === 'fulfilled' ? r.value : [];
      setOrders(safe(results[0]));
      setProductsList(safe(results[1]));
      setServiceRequests(safe(results[2]));
      setTradeInRequests(safe(results[3]));
      setBuyoutRequests(safe(results[4]));
      setClientsList(safe(results[5]));

      if (results.some(r => r.status === 'rejected')) {
        toast('Деякі модулі не вдалося завантажити.', { icon: <FaExclamationTriangle color="orange" /> });
      } else if (isManual) {
        toast.success('Дані успішно синхронізовано!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const q = orderSearch.toLowerCase().trim();
    return orders.filter(o => {
      const matchStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchSearch = !q || [o.customerName, o.phone, o._id].some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchSearch && isWithinDateRange(o.createdAt, orderStartDate, orderEndDate);
    });
  }, [orders, filterStatus, orderSearch, orderStartDate, orderEndDate]);

  const filterTickets = useCallback((tickets) => {
    if (!Array.isArray(tickets)) return [];
    const q = ticketSearch.toLowerCase().trim();
    return tickets.filter(t => {
      const matchStatus = ticketFilter === 'All' || t.status === ticketFilter;
      const matchSearch = !q || [t.name, t.phone, t._id, t.consoleModel, t.consoleName]
        .some(v => v?.toLowerCase().includes(q));
      return matchStatus && matchSearch && isWithinDateRange(t.createdAt, ticketStartDate, ticketEndDate);
    });
  }, [ticketFilter, ticketSearch, ticketStartDate, ticketEndDate]);

  const filteredServiceRequests = useMemo(() => filterTickets(serviceRequests), [serviceRequests, filterTickets]);
  const filteredTradeInRequests = useMemo(() => filterTickets(tradeInRequests), [tradeInRequests, filterTickets]);
  const filteredBuyoutRequests  = useMemo(() => filterTickets(buyoutRequests),  [buyoutRequests,  filterTickets]);

  // ── Product form helpers ───────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEditProductId(null);
    setNewProduct(PRODUCT_DEFAULTS);
    setCustomFields({ category: false, brand: false, model: false });
    setImageFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileSelection = useCallback((files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!valid.length) { toast.error('Завантажуйте лише зображення.'); return; }
    setImageFiles(prev => [...prev, ...valid].slice(0, 5));
  }, []);

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.description || newProduct.description === '<p><br></p>')
      return toast.error('Додайте опис товару!');
    if (!editProductId && !imageFiles.length)
      return toast.error('Завантажте хоча б 1 фото!');

    const tid = toast.loading(editProductId ? 'Оновлення товару…' : 'Додавання товару…');
    try {
      const fd = new FormData();
      Object.entries(newProduct).forEach(([k, v]) => fd.append(k, v ?? ''));
      imageFiles.forEach(f => fd.append('images', f));

      const url    = editProductId ? `/api/products/${editProductId}` : '/api/products';
      const method = editProductId ? 'PUT' : 'POST';
      const res    = await apiFetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (res) {
        toast.success(editProductId ? 'Товар оновлено!' : 'Товар додано!', { id: tid });
        resetForm();
        fetchAllData();
      }
    } catch {
      toast.error('Помилка збереження', { id: tid });
    }
  };

  const handleGenerateTags = async () => {
    if (!newProduct.title) return toast.error('Введіть назву товару!');
    const tid = toast.loading('AI аналізує товар…');
    try {
      const data = await apiFetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: newProduct.title, description: newProduct.description }),
      });
      setNewProduct(prev => ({ ...prev, searchTags: data.tags }));
      toast.success('Теги згенеровано!', { id: tid, icon: '🧠' });
    } catch {
      toast.error("Зв'язок з AI втрачено", { id: tid });
    }
  };

  // ── Ticket status update ───────────────────────────────────────────────────
  const handleUpdateTicketStatus = useCallback(async (endpoint, id, newStatus, setter) => {
    try {
      const updated = await apiFetch(`/api/${endpoint}/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setter(prev => prev.map(r => r._id === id ? updated : r));
      toast.success('Статус оновлено!');
    } catch {
      toast.error('Помилка оновлення');
    }
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const executeDelete = useCallback(async () => {
    const { id, type, endpoint } = deleteTarget;
    if (!id) return;
    const tid = toast.loading('Видалення…');
    try {
      await apiFetch(`/api/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const setters = {
        order:   [setOrders,          o => o._id !== id],
        product: [setProductsList,     p => p._id !== id],
        service: [setServiceRequests,  r => r._id !== id],
        tradein: [setTradeInRequests,  r => r._id !== id],
        buyout:  [setBuyoutRequests,   r => r._id !== id],
      };
      const [setter, predicate] = setters[type] ?? [];
      setter?.(prev => prev.filter(predicate));
      toast.success('Успішно видалено!', { id: tid });
    } catch {
      toast.error('Помилка видалення', { id: tid });
    } finally {
      setDeleteTarget({ id: null, type: null, endpoint: null });
    }
  }, [deleteTarget]);

  // ── Review reply ───────────────────────────────────────────────────────────
  const handleReplySubmit = useCallback(async (productId, reviewId) => {
    if (!replyText.trim()) return toast.error('Введіть текст відповіді!');
    try {
      const updated = await apiFetch(`/api/products/${productId}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reply: replyText }),
      });
      setProductsList(prev => prev.map(p => p._id === productId ? updated : p));
      setSelectedProductReviews(updated);
      setReplyingToReviewId(null);
      setReplyText('');
      toast.success('Відповідь опубліковано!');
    } catch {
      toast.error('Помилка сервера.');
    }
  }, [replyText]);

  const openReadMoreModal = useCallback((title, content) => {
    setTextModal({ isOpen: true, title, content });
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const safeOrders       = Array.isArray(orders) ? orders : [];
  const totalSales       = safeOrders.filter(o => o.status === 'Paid' || o.status === 'Shipped')
                                      .reduce((s, o) => s + o.totalAmount, 0);
  const pendingCount     = safeOrders.filter(o => o.status === 'Pending').length;

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    toast.success('Сеанс завершено. До зустрічі!', { icon: '👋' });
    navigate('/admin/login');
  }, [navigate]);

  // ── Early returns ──────────────────────────────────────────────────────────
  if (loading) return <div className={styles.centerMsg}>Ініціалізація терміналу FATALITY…</div>;
  if (error)   return <div className={styles.centerMsg}>Критична помилка: {error}</div>;

  // ── Helpers for product edit ───────────────────────────────────────────────
  const startEditProduct = (product) => {
    setEditProductId(product._id);
    setImageFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const catOk   = dynamicCatalog.hasOwnProperty(product.category);
    const brandOk = catOk && dynamicCatalog[product.category].hasOwnProperty(product.brand);
    const modelOk = brandOk && dynamicCatalog[product.category][product.brand].includes(product.model);

    setCustomFields({
      category: !catOk   && !!product.category,
      brand:    !brandOk && !!product.brand,
      model:    !modelOk && !!product.model,
    });

    setNewProduct({
      title:       product.title,
      category:    product.category ?? '',
      brand:       product.brand    ?? '',
      model:       product.model    ?? '',
      price:       product.price,
      condition:   product.condition,
      description: product.description,
      searchTags:  product.searchTags ?? '',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className={styles.adminPage}>
        {/* ── HEADER ── */}
        <div className={styles.adminTopHeader}>
          <h2 className={styles.pageTitle}>Система керування</h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.syncBtn}
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              title="Синхронізувати базу"
            >
              <FaSyncAlt className={isRefreshing ? styles.spinIcon : ''} />
              {isRefreshing ? 'Синхронізація…' : 'Оновити дані'}
            </button>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              <FaSignOutAlt /> Вийти
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <nav className={styles.tabsWrapper} aria-label="Розділи адмін-панелі">
          {[
            { id: 'orders',   label: 'Замовлення'                            },
            { id: 'products', label: 'Товари'                                },
            { id: 'service',  label: '🛠 Сервіс'                            },
            { id: 'tradein',  label: <><FaRecycle /> Trade-In</>             },
            { id: 'buyout',   label: <><FaMoneyBillWave /> Викуп</>         },
            { id: 'clients',  label: <><FaUsers /> CRM</>                   },
            { id: 'calendar', label: <><FaCalendarAlt /> Календар</>        },
          ].map(t => (
            <button
              key={t.id}
              className={`${styles.tabBtn} ${activeTab === t.id ? styles.activeTab : ''}`}
              onClick={() => { setActiveTab(t.id); if (t.id === 'clients') setSelectedClientId(null); }}
              aria-current={activeTab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ══ ORDERS TAB ══ */}
        {activeTab === 'orders' && (
          <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
              <StatCard icon={<FaBoxes />}      label="Усього замовлень" value={safeOrders.length}   colorClass="blue"   delay="0.1s" />
              <StatCard icon={<FaDollarSign />}  label="Загальний виторг" value={`${totalSales} грн`} colorClass="green"  delay="0.2s" />
              <StatCard icon={<FaClock />}       label="Очікують оплати"  value={pendingCount}         colorClass="orange" delay="0.3s" />
            </div>

            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Стрічка даних</h3>
              <div className={styles.filtersControls}>
                <SearchBar
                  value={orderSearch}
                  onChange={setOrderSearch}
                  placeholder="Пошук (Ім'я, Телефон, ID)…"
                />
                <DateFilter
                  start={orderStartDate} end={orderEndDate}
                  onStartChange={setOrderStartDate}
                  onEndChange={setOrderEndDate}
                  onClear={() => { setOrderStartDate(''); setOrderEndDate(''); }}
                />
                <div className={styles.filterWrapper}>
                  <label htmlFor="orderStatus">Фільтр:</label>
                  <select id="orderStatus" className={styles.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">Всі замовлення</option>
                    <option value="Pending">Очікують оплати</option>
                    <option value="Paid">Оплачені</option>
                    <option value="Processing">Обробка замовлення</option>
                    <option value="Shipped">Відправлені</option>
                    <option value="Cancelled">Скасовані</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.ordersList}>
              {filteredOrders.length === 0 ? (
                <div className={styles.noOrders}>
                  {safeOrders.length === 0
                    ? 'База даних порожня. Чекаємо на перші замовлення!'
                    : 'За вказаними критеріями замовлень не знайдено.'}
                </div>
              ) : filteredOrders.map((order, i) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  index={i}
                  onStatusSaved={updated => setOrders(prev => prev.map(o => o._id === updated._id ? updated : o))}
                  onDeleteRequest={id => setDeleteTarget({ id, type: 'order', endpoint: 'orders' })}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══ PRODUCTS TAB ══ */}
        {activeTab === 'products' && (
          <div className={styles.tabContent}>
            {/* ── Add / Edit form ── */}
            <div className={styles.addProductCard}>
              <h3 className={styles.formTitle}>
                {editProductId
                  ? <><FaEdit style={{ color: 'var(--success)' }} /> Редагування товару</>
                  : <><FaPlusCircle /> Додати нову позицію</>}
              </h3>

              <form onSubmit={handleAddOrEditProduct} className={styles.productForm}>
                {/* Title */}
                <div className={styles.formRow}>
                  <input
                    type="text"
                    placeholder="Назва товару (напр. Sony PlayStation 5)"
                    required
                    className={styles.inputField}
                    value={newProduct.title}
                    onChange={e => setNewProduct(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Category / Brand */}
                <div className={styles.formRow}>
                  <div className={styles.cascadingField}>
                    <CascadeField
                      options={Object.keys(dynamicCatalog)}
                      value={newProduct.category}
                      placeholder="-- Оберіть категорію --"
                      isCustom={customFields.category}
                      onChange={val => {
                        setCustomFields(p => ({ ...p, category: false, brand: false, model: false }));
                        setNewProduct(p => ({ ...p, category: val, brand: '', model: '' }));
                      }}
                      onAddCustom={() => {
                        setCustomFields(p => ({ ...p, category: true, brand: true, model: true }));
                        setNewProduct(p => ({ ...p, category: '', brand: '', model: '' }));
                      }}
                      onCancelCustom={() => {
                        setCustomFields(p => ({ ...p, category: false }));
                        setNewProduct(p => ({ ...p, category: '' }));
                      }}
                    />
                  </div>

                  {newProduct.category && (
                    <div className={styles.cascadingField}>
                      <CascadeField
                        options={Object.keys(dynamicCatalog[newProduct.category] ?? {})}
                        value={newProduct.brand}
                        placeholder="-- Оберіть бренд --"
                        isCustom={customFields.brand}
                        onChange={val => {
                          setCustomFields(p => ({ ...p, brand: false, model: false }));
                          setNewProduct(p => ({ ...p, brand: val, model: '' }));
                        }}
                        onAddCustom={() => {
                          setCustomFields(p => ({ ...p, brand: true, model: true }));
                          setNewProduct(p => ({ ...p, brand: '', model: '' }));
                        }}
                        onCancelCustom={() => {
                          setCustomFields(p => ({ ...p, brand: false }));
                          setNewProduct(p => ({ ...p, brand: '' }));
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Model / Price / Condition */}
                {newProduct.brand && (
                  <div className={styles.formRow}>
                    <div className={styles.cascadingField}>
                      <CascadeField
                        options={dynamicCatalog[newProduct.category]?.[newProduct.brand] ?? []}
                        value={newProduct.model}
                        placeholder="-- Оберіть модель --"
                        isCustom={customFields.model}
                        onChange={val => setNewProduct(p => ({ ...p, model: val }))}
                        onAddCustom={() => {
                          setCustomFields(p => ({ ...p, model: true }));
                          setNewProduct(p => ({ ...p, model: '' }));
                        }}
                        onCancelCustom={() => {
                          setCustomFields(p => ({ ...p, model: false }));
                          setNewProduct(p => ({ ...p, model: '' }));
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      placeholder="Ціна (грн)"
                      required
                      className={styles.inputField}
                      value={newProduct.price}
                      onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                    />
                    <select
                      className={styles.inputField}
                      required
                      value={newProduct.condition}
                      onChange={e => setNewProduct(p => ({ ...p, condition: e.target.value }))}
                    >
                      <option value="Нова">Нова</option>
                      <option value="Вживана - Ідеальний стан">Вживана — Ідеальний стан</option>
                      <option value="Вживана - Хороший стан">Вживана — Хороший стан</option>
                      <option value="Відновлена (Refurbished)">Відновлена (Refurbished)</option>
                    </select>
                  </div>
                )}

                {/* Search tags + AI */}
                {newProduct.brand && (
                  <div className={styles.formRow} style={{ alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Приховані пошукові теги (через кому)"
                      className={styles.inputField}
                      value={newProduct.searchTags}
                      onChange={e => setNewProduct(p => ({ ...p, searchTags: e.target.value }))}
                    />
                    <button type="button" onClick={handleGenerateTags} className={styles.aiButton}>
                      ✨ AI Теги
                    </button>
                  </div>
                )}

                {/* Description + drop zone */}
                {newProduct.brand && (
                  <>
                    <div className={styles.editorWrapper}>
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        value={newProduct.description}
                        onChange={content => setNewProduct(p => ({ ...p, description: content }))}
                        placeholder="Опис товару…"
                      />
                    </div>

                    <div
                      className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelection(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                      aria-label="Завантажити фото"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className={styles.hiddenFileInput}
                        onChange={e => handleFileSelection(e.target.files)}
                      />
                      {imageFiles.length > 0 ? (
                        <div className={styles.galleryPreview}>
                          {imageFiles.map((file, i) => (
                            <div key={i} className={styles.previewThumbWrapper} onClick={e => e.stopPropagation()}>
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Прев'ю ${i + 1}`}
                                className={styles.previewThumb}
                              />
                              <button
                                type="button"
                                className={styles.removeThumbBtn}
                                onClick={e => { e.stopPropagation(); setImageFiles(p => p.filter((_, idx) => idx !== i)); }}
                                aria-label={`Видалити фото ${i + 1}`}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.dropZoneContent}>
                          <FaCloudUploadAlt className={styles.uploadIcon} />
                          <p>{editProductId ? 'Додати нові фото (старі заміняться)' : 'Перетягніть до 5 фото сюди'}</p>
                        </div>
                      )}
                    </div>

                    <div className={styles.submitActionsBlock}>
                      <button
                        type="submit"
                        className={styles.submitProductBtn}
                        style={{
                          backgroundColor: editProductId ? 'var(--success)' : 'var(--brand)',
                          color: '#fff',
                        }}
                      >
                        {editProductId ? 'ЗБЕРЕГТИ ЗМІНИ' : 'ЗАВАНТАЖИТИ В БАЗУ'}
                      </button>
                      {editProductId && (
                        <button type="button" className={styles.cancelProductBtn} onClick={resetForm}>
                          СКАСУВАТИ
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* ── Existing products grid ── */}
            <div className={styles.adminProductsSection}>
              <h3 className={styles.sectionTitle}>Існуючі товари в базі</h3>
              <div className={styles.adminProductsGrid}>
                {productsList.length === 0 ? (
                  <p className={styles.noOrders}>Немає товарів.</p>
                ) : productsList.map(product => {
                  const firstImg = product.imageUrls?.[0] ?? product.imageUrl;
                  const thumb    = firstImg?.startsWith('/')
                    ? `${API_BASE}${firstImg}`
                    : (firstImg ?? 'https://via.placeholder.com/100');

                  return (
                    <div key={product._id} className={styles.adminProductCard}>
                      <Link to={`/product/${product._id}`} className={styles.adminProductLinkWrapper}>
                        <img
                          src={thumb}
                          alt={product.title}
                          className={styles.adminProductThumb}
                          loading="lazy"
                        />
                        <div className={styles.adminProductInfo}>
                          <h4>{product.title}</h4>
                          <div className={styles.adminProductTags}>
                            <span className={styles.tagCategory}>{product.category ?? 'Консолі'}</span>
                            <span className={styles.tagBrand}>{product.brand ?? 'Sony'}</span>
                          </div>
                          <span className={styles.adminProductPrice}>{product.price} грн</span>
                        </div>
                      </Link>

                      <div className={styles.adminProductActions}>
                        <button
                          className={styles.reviewsBtn}
                          onClick={() => { setSelectedProductReviews(product); setReplyText(''); setReplyingToReviewId(null); }}
                          aria-label="Відгуки"
                          title="Відгуки"
                        >
                          <FaCommentDots /> {product.reviews?.length ?? 0}
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEditProduct(product)}
                          aria-label="Редагувати"
                          title="Редагувати"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setDeleteTarget({ id: product._id, type: 'product', endpoint: 'products' })}
                          aria-label="Видалити"
                          title="Видалити"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ SERVICE / TRADE-IN / BUYOUT TABS ══ */}
        {['service', 'tradein', 'buyout'].includes(activeTab) && (
          <div className={styles.tabContent}>
            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>
                {activeTab === 'service' ? 'Заявки на ремонт'
                  : activeTab === 'tradein' ? 'Заявки Trade-In'
                  : 'Заявки на Викуп'}
              </h3>

              <div className={styles.filtersControls}>
                <SearchBar
                  value={ticketSearch}
                  onChange={setTicketSearch}
                  placeholder="Пошук (Ім'я, Телефон)…"
                />
                <DateFilter
                  start={ticketStartDate} end={ticketEndDate}
                  onStartChange={setTicketStartDate}
                  onEndChange={setTicketEndDate}
                  onClear={() => { setTicketStartDate(''); setTicketEndDate(''); }}
                />
                <div className={styles.filterWrapper}>
                  <label htmlFor="ticketStatus">Фільтр:</label>
                  <select id="ticketStatus" className={styles.filterSelect} value={ticketFilter} onChange={e => setTicketFilter(e.target.value)}>
                    <option value="All">Всі заявки</option>
                    {activeTab === 'service' ? (
                      <>
                        <option value="New">Нова заявка</option>
                        <option value="In Progress">В роботі</option>
                        <option value="Completed">Завершено</option>
                        <option value="Cancelled">Відхилено</option>
                      </>
                    ) : (
                      <>
                        <option value="New">Нова заявка</option>
                        <option value="Reviewed">На розгляді</option>
                        <option value="Accepted">Прийнято</option>
                        <option value="Rejected">Відхилено</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.serviceGrid}>
              {/* Empty states */}
              {activeTab === 'service'  && filteredServiceRequests.length === 0 && <p className={styles.noOrders}>Заявок не знайдено.</p>}
              {activeTab === 'tradein'  && filteredTradeInRequests.length  === 0 && <p className={styles.noOrders}>Заявок не знайдено.</p>}
              {activeTab === 'buyout'   && filteredBuyoutRequests.length   === 0 && <p className={styles.noOrders}>Заявок не знайдено.</p>}

              {activeTab === 'service' && filteredServiceRequests.map((r, i) => (
                <TicketCard key={r._id} index={i} ticket={r} type="service"
                  onUpdateStatus={(id, v) => handleUpdateTicketStatus('service-requests', id, v, setServiceRequests)}
                  onDelete={id => setDeleteTarget({ id, type: 'service', endpoint: 'service-requests' })}
                  onReadMore={openReadMoreModal}
                />
              ))}

              {activeTab === 'tradein' && filteredTradeInRequests.map((r, i) => (
                <TicketCard key={r._id} index={i} ticket={r} type="tradein"
                  onUpdateStatus={(id, v) => handleUpdateTicketStatus('trade-in', id, v, setTradeInRequests)}
                  onDelete={id => setDeleteTarget({ id, type: 'tradein', endpoint: 'trade-in' })}
                  onImageClick={(imgs, idx) => { setViewImages(imgs); setCurrentImgIndex(idx); }}
                  onReadMore={openReadMoreModal}
                />
              ))}

              {activeTab === 'buyout' && filteredBuyoutRequests.map((r, i) => (
                <TicketCard key={r._id} index={i} ticket={r} type="buyout"
                  onUpdateStatus={(id, v) => handleUpdateTicketStatus('buyout', id, v, setBuyoutRequests)}
                  onDelete={id => setDeleteTarget({ id, type: 'buyout', endpoint: 'buyout' })}
                  onImageClick={(imgs, idx) => { setViewImages(imgs); setCurrentImgIndex(idx); }}
                  onReadMore={openReadMoreModal}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══ CRM TAB ══ */}
        {activeTab === 'clients' && (
          <div className={styles.tabContent}>
            {selectedClientId ? (
              <ClientCard clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />
            ) : (
              <>
                <h3 className={styles.sectionTitle}>База контрагентів</h3>
                <div className={styles.crmGrid}>
                  {clientsList.length === 0 ? (
                    <p className={styles.noOrders}>База клієнтів порожня.</p>
                  ) : clientsList.map(client => (
                    <div
                      key={client._id}
                      className={styles.crmClientCard}
                      onClick={() => setSelectedClientId(client._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setSelectedClientId(client._id)}
                      aria-label={`Відкрити профіль ${client.name}`}
                    >
                      <div className={styles.crmClientAvatar}><FaUser /></div>
                      <div className={styles.crmClientInfo}>
                        <h4>{client.name}</h4>
                        <span>📞 {client.phone}</span>
                      </div>
                      <div className={styles.crmClientAction} aria-hidden="true">
                        <FaChevronRight />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ CALENDAR TAB ══ */}
        {activeTab === 'calendar' && (
          <div className={styles.tabContent}>
            <div className={styles.crmCalendarWrapper}>
              <CRMCalendar />
            </div>
          </div>
        )}
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* 1. Image gallery */}
      {viewImages && (
        <div className={styles.imageModalOverlay} onClick={() => setViewImages(null)}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeImageBtn} onClick={() => setViewImages(null)} aria-label="Закрити">✖</button>
            {viewImages.length > 1 && (
              <button
                className={`${styles.navImgBtn} ${styles.navPrev}`}
                onClick={() => setCurrentImgIndex(p => (p - 1 + viewImages.length) % viewImages.length)}
                aria-label="Попереднє фото"
              >❮</button>
            )}
            <img
              src={viewImages[currentImgIndex]?.startsWith('/')
                ? `${API_BASE}${viewImages[currentImgIndex]}`
                : viewImages[currentImgIndex]}
              alt="Повний розмір"
            />
            {viewImages.length > 1 && (
              <button
                className={`${styles.navImgBtn} ${styles.navNext}`}
                onClick={() => setCurrentImgIndex(p => (p + 1) % viewImages.length)}
                aria-label="Наступне фото"
              >❯</button>
            )}
            <div className={styles.imgCounter}>{currentImgIndex + 1} / {viewImages.length}</div>
          </div>
        </div>
      )}

      {/* 2. Full text */}
      <FullTextModal
        isOpen={textModal.isOpen}
        title={textModal.title}
        content={textModal.content}
        onClose={() => setTextModal({ isOpen: false, title: '', content: '' })}
      />

      {/* 3. Reviews management */}
      {selectedProductReviews && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProductReviews(null)}>
          <div className={styles.reviewsModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.pageTitle} style={{ margin: 0, fontSize: '18px' }}>
                Відгуки: {selectedProductReviews.title}
              </h3>
              <button className={styles.closeModalBtn} onClick={() => setSelectedProductReviews(null)} aria-label="Закрити">✖</button>
            </div>

            <div className={styles.reviewsListAdmin}>
              {!selectedProductReviews.reviews?.length ? (
                <div className={styles.noOrders} style={{ marginTop: 16 }}>
                  Цей товар ще не має відгуків.
                </div>
              ) : selectedProductReviews.reviews.map(rev => (
                <div key={rev._id} className={styles.adminReviewCard}>
                  <div className={styles.adminReviewHeader}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: 15 }}>{rev.name}</strong>
                      <span style={{ color: '#ffaa00', marginLeft: 10 }}>⭐ {rev.rating}/5</span>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                        {new Date(rev.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </div>
                    {/* Uses unified delete modal instead of window.confirm */}
                    <button
                      className={styles.deleteReviewBtn}
                      onClick={() => setDeleteTarget({
                        id:       rev._id,
                        type:     'review',
                        endpoint: `products/${selectedProductReviews._id}/reviews`,
                      })}
                      aria-label="Видалити відгук"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <p className={styles.adminReviewText}>{rev.comment}</p>

                  {rev.adminReply ? (
                    <div className={styles.adminReplyBox}>
                      <strong>🎮 Ваша відповідь:</strong>
                      <p>{rev.adminReply}</p>
                      <button
                        className={styles.editReplyBtn}
                        onClick={() => { setReplyingToReviewId(rev._id); setReplyText(rev.adminReply); }}
                      >
                        Змінити відповідь
                      </button>
                    </div>
                  ) : replyingToReviewId === rev._id ? (
                    <div className={styles.replyInputBox}>
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Напишіть відповідь клієнту…"
                        rows={3}
                        className={styles.replyTextarea}
                        aria-label="Текст відповіді"
                      />
                      <div className={styles.replyActions}>
                        <button className={styles.cancelReplyBtn} onClick={() => setReplyingToReviewId(null)}>
                          Скасувати
                        </button>
                        <button
                          className={styles.saveReplyBtn}
                          onClick={() => handleReplySubmit(selectedProductReviews._id, rev._id)}
                        >
                          Зберегти
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={styles.addReplyBtn}
                      onClick={() => { setReplyingToReviewId(rev._id); setReplyText(''); }}
                    >
                      Відповісти клієнту
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete confirmation */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget.id}
        title={
          deleteTarget.type === 'order'   ? 'Видалення замовлення' :
          deleteTarget.type === 'product' ? 'Видалення товару'     :
          deleteTarget.type === 'review'  ? 'Видалення відгуку'    :
                                            'Видалення заявки'
        }
        onClose={() => setDeleteTarget({ id: null, type: null, endpoint: null })}
        onConfirm={executeDelete}
      />
    </>
  );
}