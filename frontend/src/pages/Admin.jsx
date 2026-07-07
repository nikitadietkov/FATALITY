import { 
  FaBoxes, FaDollarSign, FaUser, FaClock, FaShoppingBag, 
  FaPlusCircle, FaCloudUploadAlt, FaEdit, FaTrash, 
  FaSearch, FaTimes, FaSignOutAlt, FaRecycle, FaMoneyBillWave,
  FaCommentDots, FaUsers, FaCalendarAlt, FaSyncAlt, FaExclamationTriangle,
  FaChevronRight, FaAlignLeft, FaTags
} from 'react-icons/fa';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CRMCalendar from './admin/crm/CRMCalendar';
import ClientCard from './admin/crm/ClientCard';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; 
import styles from './Admin.module.css';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean'] 
  ],
};

const MAX_DESC_LENGTH = 150;
const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Хелпер для перевірки діапазону дат у фільтрах
const isWithinDateRange = (dateString, start, end) => {
  if (!start && !end) return true;
  const itemDate = new Date(dateString).getTime();
  const sDate = start ? new Date(start).setHours(0, 0, 0, 0) : 0;
  const eDate = end ? new Date(end).setHours(23, 59, 59, 999) : Infinity;
  return itemDate >= sDate && itemDate <= eDate;
};

// ─── БАЗОВА СТРУКТУРА КАТАЛОГУ ───────────────────────────────────────────
const baseCatalog = {
  'Консолі': {
    'Sony (PlayStation)': ['PS5', 'PS4 Pro', 'PS4', 'PS3'],
    'Microsoft (Xbox)': ['Xbox Series X', 'Xbox Series S', 'Xbox One'],
    'Nintendo': ['Switch OLED', 'Switch', 'Switch Lite']
  },
  'Кокпіти та керма': {
    'Logitech': ['G29', 'G923', 'G920'],
    'Thrustmaster': ['T300 RS', 'T150', 'T248']
  },
  'Аксесуари': {
    'Sony (PlayStation)': ['DualSense', 'DualShock 4', 'Pulse 3D'],
    'Microsoft (Xbox)': ['Xbox Wireless Controller', 'Elite Series 2']
  },
  'Ігри': {
    'Sony (PlayStation)': [],
    'Microsoft (Xbox)': [],
    'Nintendo': []
  }
};

// ─── MICRO-COMPONENTS ─────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, colorClass, delay }) => (
  <div className={styles.statCard} style={{ animationDelay: delay }}>
    <div className={`${styles.iconWrapper} ${styles[colorClass]}`}>{icon}</div>
    <div className={styles.statInfo}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusMap = {
    'Paid': { class: 'paid', text: 'ОПЛАЧЕНО' },
    'Processing': { class: 'processing', text: 'В ОБРОБЦІ' },
    'Shipped': { class: 'shipped', text: 'ВІДПРАВЛЕНО' },
    'Cancelled': { class: 'cancelled', text: 'СКАСОВАНО' },
    'Pending': { class: 'pending', text: 'ОЧІКУЄ ОПЛАТИ' }
  };
  const config = statusMap[status] || statusMap['Pending'];
  return <span className={`${styles.statusBadge} ${styles[config.class]}`}>{config.text}</span>;
};

const FullTextModal = ({ isOpen, title, content, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.fullTextModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}><FaAlignLeft /> {title}</h3>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>✖</button>
        </div>
        <div className={styles.fullTextBody}>
          <p>{content}</p>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, title, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.dangerTitle}><FaTrash /> {title}</h3>
          <button type="button" className={styles.closeModalBtn} onClick={onClose}>✖</button>
        </div>
        <div className={styles.modalBodyConfirm}>
          <p>Ви впевнені, що хочете видалити цей елемент? <br/><b className={styles.warningText}>Цю дію неможливо скасувати!</b></p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.cancelConfirmBtn} onClick={onClose}>СКАСУВАТИ</button>
            <button type="button" className={styles.deleteConfirmBtn} onClick={onConfirm}>ВИДАЛИТИ</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketCard = ({ ticket, type, onUpdateStatus, onDelete, onImageClick, onReadMore, index }) => {
  const statusOptions = {
    service: [
      { val: 'New', text: 'Нова заявка' }, { val: 'In Progress', text: 'В роботі' },
      { val: 'Completed', text: 'Завершено' }, { val: 'Cancelled', text: 'Відхилено' }
    ],
    tradein: [
      { val: 'New', text: 'Нова заявка' }, { val: 'Reviewed', text: 'На розгляді' },
      { val: 'Accepted', text: 'Прийнято (Чекаємо девайс)' }, { val: 'Rejected', text: 'Відхилено' }
    ],
    buyout: [
      { val: 'New', text: 'Нова заявка' }, { val: 'Reviewed', text: 'На розгляді' },
      { val: 'Accepted', text: 'Готові викупити' }, { val: 'Rejected', text: 'Відхилено' }
    ]
  };

  const rawDescription = ticket.problem || ticket.description || 'Без додаткового опису';
  const isLongDescription = rawDescription.length > MAX_DESC_LENGTH;

  return (
    <div className={`${styles.serviceTicket} ${styles[`status${ticket.status?.replace(' ', '')}`]}`} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className={styles.ticketHeader}>
        <span className={styles.ticketDate}>{new Date(ticket.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        <span className={styles.ticketId}>ID: {ticket._id?.slice(-6)}</span>
      </div>
      <div className={styles.ticketBody}>
        <h4 className={styles.clientName}>{ticket.name}</h4>
        <a href={`tel:${ticket.phone}`} className={styles.clientPhone}>📞 {ticket.phone}</a>
        <div className={styles.deviceTag}>🎮 {ticket.consoleModel || ticket.consoleName}</div>
        
        {type === 'buyout' && ticket.expectedPrice && (
          <div className={styles.expectedPriceBox}><strong>Очікувана сума:</strong> {ticket.expectedPrice} грн</div>
        )}
        
        {ticket.equipment?.length > 0 && (
          <div className={styles.equipmentTags}>
            {ticket.equipment.map((item, idx) => <span key={idx} className={styles.equipTag}>{item}</span>)}
          </div>
        )}
        
        <div className={styles.problemBox}>
          <strong>{type === 'service' ? 'Суть проблеми:' : 'Опис / Стан:'}</strong>
          <p>
            {isLongDescription ? truncateText(rawDescription, MAX_DESC_LENGTH) : rawDescription}
            {isLongDescription && (
              <button className={styles.readMoreBtn} onClick={() => onReadMore(`Опис заявки #${ticket._id?.slice(-6)}`, rawDescription)}>
                Читати повністю
              </button>
            )}
          </p>
        </div>
        
        {ticket.images?.length > 0 && (
          <div className={styles.tradeInGallery}>
            {ticket.images.map((img, idx) => (
              <img key={idx} src={img.startsWith('/') ? `${API_BASE}${img}` : img} alt="Фото клієнта" 
                   className={styles.tradeInThumb} onClick={() => onImageClick(ticket.images, idx)} title="Натисни для перегляду" />
            ))}
          </div>
        )}
      </div>
      <div className={styles.ticketFooter}>
        <select value={ticket.status} onChange={(e) => onUpdateStatus(ticket._id, e.target.value)} className={styles.serviceStatusSelect}>
          {statusOptions[type].map(opt => <option key={opt.val} value={opt.val}>{opt.text}</option>)}
        </select>
        <button onClick={() => onDelete(ticket._id)} className={styles.deleteTicketBtn} title="Видалити заявку"><FaTrash /></button>
      </div>
    </div>
  );
};


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]); 
  const [serviceRequests, setServiceRequests] = useState([]);
  const [tradeInRequests, setTradeInRequests] = useState([]);
  const [buyoutRequests, setBuyoutRequests] = useState([]);
  const [clientsList, setClientsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  
  const [newProduct, setNewProduct] = useState({ 
    title: '', category: '', brand: '', model: '', 
    price: '', condition: 'Вживана - Ідеальний стан', description: '', searchTags: '' 
  });
  
  const [customFields, setCustomFields] = useState({ category: false, brand: false, model: false });
  
  const [imageFiles, setImageFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  // Фільтри для Замовлень
  const [filterStatus, setFilterStatus] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  
  // Фільтри для Заявок (Service, Trade-In, Buyout)
  const [ticketFilterStatus, setTicketFilterStatus] = useState('All');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStartDate, setTicketStartDate] = useState('');
  const [ticketEndDate, setTicketEndDate] = useState('');
  
  const [selectedProductReviews, setSelectedProductReviews] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyingToReviewId, setReplyingToReviewId] = useState(null);
  
  const [deleteTarget, setDeleteTarget] = useState({ id: null, type: null, endpoint: null });

  const [viewImages, setViewImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [textModalData, setTextModalData] = useState({ isOpen: false, title: '', content: '' });

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const dynamicCatalog = useMemo(() => {
    const catalog = JSON.parse(JSON.stringify(baseCatalog)); 

    productsList.forEach(p => {
      if (!p.category) return;
      if (!catalog[p.category]) catalog[p.category] = {};

      if (!p.brand) return;
      if (!catalog[p.category][p.brand]) catalog[p.category][p.brand] = [];

      if (p.model && !catalog[p.category][p.brand].includes(p.model)) {
        catalog[p.category][p.brand].push(p.model);
      }
    });

    return catalog;
  }, [productsList]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setViewImages(null);
        setSelectedProductReviews(null);
        setDeleteTarget({ id: null, type: null, endpoint: null });
        setTextModalData({ isOpen: false, title: '', content: '' });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = '#0A0A0A';
    const mainEl = document.querySelector('main');
    if(mainEl) mainEl.style.backgroundColor = '#0A0A0A';
    fetchInitialData();
    return () => {
      document.body.style.backgroundColor = '';
      if(mainEl) mainEl.style.backgroundColor = '';
    };
  }, []);

  // Скидання фільтрів при перемиканні вкладок
  useEffect(() => {
    setTicketSearchQuery('');
    setTicketFilterStatus('All');
    setTicketStartDate('');
    setTicketEndDate('');
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Сеанс завершено. До зустрічі!', { icon: '👋' });
    navigate('/admin/login');
  };

  const fetchInitialData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { navigate('/admin/login'); return; }

      const authHeaders = { 'Authorization': `Bearer ${token}` };

      const fetchPromise = (url, options = {}) => fetch(`${API_BASE}${url}`, options).then(res => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) throw new Error('AUTH_ERROR');
          throw new Error(`API Error: ${res.status}`);
        }
        return res.json();
      });

      const results = await Promise.allSettled([
        fetchPromise('/api/orders', { headers: authHeaders }),
        fetchPromise('/api/products'),
        fetchPromise('/api/service-requests', { headers: authHeaders }),
        fetchPromise('/api/trade-in', { headers: authHeaders }),
        fetchPromise('/api/buyout', { headers: authHeaders }),
        fetchPromise('/api/crm/clients', { headers: authHeaders })
      ]);

      const hasAuthError = results.some(r => r.status === 'rejected' && r.reason.message === 'AUTH_ERROR');
      if (hasAuthError) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }

      setOrders(results[0].status === 'fulfilled' ? results[0].value : []);
      setProductsList(results[1].status === 'fulfilled' ? results[1].value : []);
      setServiceRequests(results[2].status === 'fulfilled' ? results[2].value : []);
      setTradeInRequests(results[3].status === 'fulfilled' ? results[3].value : []);
      setBuyoutRequests(results[4].status === 'fulfilled' ? results[4].value : []);
      setClientsList(results[5].status === 'fulfilled' ? results[5].value : []);

      if (results.some(r => r.status === 'rejected')) {
        toast('Деякі модулі не вдалося завантажити.', { icon: <FaExclamationTriangle color="orange"/> });
      } else if (isManualRefresh) {
        toast.success('Дані успішно синхронізовано!');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Фільтрація ЗАМОВЛЕНЬ (з перевіркою дати)
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(order => {
      const matchesStatus = filterStatus === 'All' ? true : order.status === filterStatus;
      const query = orderSearchQuery.toLowerCase().trim();
      const matchesSearch = query === '' ? true : (
        order.customerName?.toLowerCase().includes(query) ||
        order.phone?.toLowerCase().includes(query) ||
        order._id?.toLowerCase().includes(query)
      );
      const matchesDate = isWithinDateRange(order.createdAt, orderStartDate, orderEndDate);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, filterStatus, orderSearchQuery, orderStartDate, orderEndDate]);

  // Універсальний фільтр для ЗАЯВОК (з перевіркою дати)
  const filterTickets = useCallback((tickets) => {
    if (!Array.isArray(tickets)) return [];
    return tickets.filter(t => {
      const matchesStatus = ticketFilterStatus === 'All' ? true : t.status === ticketFilterStatus;
      const q = ticketSearchQuery.toLowerCase().trim();
      const matchesSearch = q === '' ? true : (
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t._id && t._id.toLowerCase().includes(q)) ||
        (t.consoleModel && t.consoleModel.toLowerCase().includes(q)) ||
        (t.consoleName && t.consoleName.toLowerCase().includes(q))
      );
      const matchesDate = isWithinDateRange(t.createdAt, ticketStartDate, ticketEndDate);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [ticketFilterStatus, ticketSearchQuery, ticketStartDate, ticketEndDate]);

  const filteredServiceRequests = useMemo(() => filterTickets(serviceRequests), [serviceRequests, filterTickets]);
  const filteredTradeInRequests = useMemo(() => filterTickets(tradeInRequests), [tradeInRequests, filterTickets]);
  const filteredBuyoutRequests = useMemo(() => filterTickets(buyoutRequests), [buyoutRequests, filterTickets]);

  const resetForm = () => {
    setEditProductId(null);
    setNewProduct({ title: '', category: '', brand: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '', searchTags: '' });
    setCustomFields({ category: false, brand: false, model: false });
    setImageFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelection = useCallback((files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length > 0) setImageFiles(prev => [...prev, ...validFiles].slice(0, 5));
    else toast.error('Завантажуйте лише зображення.');
  }, []);

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.description || newProduct.description === '<p><br></p>') return toast.error('Додайте опис товару!');
    if (!editProductId && imageFiles.length === 0) return toast.error('Завантажте хоча б 1 фото!');

    const loadingToast = toast.loading(editProductId ? 'Оновлення товару...' : 'Додавання товару...');

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      Object.entries(newProduct).forEach(([key, val]) => formData.append(key, val || ''));
      imageFiles.forEach(file => formData.append('images', file));

      const url = editProductId ? `${API_BASE}/api/products/${editProductId}` : `${API_BASE}/api/products`;
      const response = await fetch(url, {
        method: editProductId ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success(editProductId ? 'Товар оновлено!' : 'Товар додано!', { id: loadingToast });
        resetForm();
        fetchInitialData();
      } else throw new Error('Помилка сервера');
    } catch (err) { toast.error('Помилка збереження', { id: loadingToast }); }
  };

  const handleGenerateTags = async () => {
    if (!newProduct.title) return toast.error('Введіть назву товару!');
    const loadingToast = toast.loading('Штучний інтелект аналізує товар...');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/generate-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newProduct.title, description: newProduct.description })
      });
      if (res.ok) {
        const data = await res.json();
        setNewProduct(prev => ({ ...prev, searchTags: data.tags }));
        toast.success('Теги згенеровано!', { id: loadingToast, icon: '🧠' });
      } else throw new Error();
    } catch (error) { toast.error('Втрачено зв\'язок з AI', { id: loadingToast }); }
  };

  const handleUpdateTicketStatus = async (endpoint, id, newStatus, stateUpdater) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/${endpoint}/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        stateUpdater(prev => prev.map(r => r._id === id ? updated : r));
        toast.success('Статус оновлено!');
      } else throw new Error();
    } catch (err) { toast.error('Помилка оновлення'); }
  };

  const executeDelete = async () => {
    const { id, type, endpoint } = deleteTarget;
    if (!id) return;
    const loadingToast = toast.loading('Видалення...');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/${endpoint}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        if (type === 'order') setOrders(prev => prev.filter(o => o._id !== id));
        if (type === 'product') setProductsList(prev => prev.filter(p => p._id !== id));
        if (type === 'service') setServiceRequests(prev => prev.filter(r => r._id !== id));
        if (type === 'tradein') setTradeInRequests(prev => prev.filter(r => r._id !== id));
        if (type === 'buyout') setBuyoutRequests(prev => prev.filter(r => r._id !== id));
        toast.success('Успішно видалено!', { id: loadingToast });
      } else throw new Error();
    } catch (err) { toast.error('Помилка видалення', { id: loadingToast }); } 
    finally { setDeleteTarget({ id: null, type: null, endpoint: null }); }
  };

  const handleReplySubmit = async (productId, reviewId) => {
    if (!replyText.trim()) return toast.error("Введіть текст відповіді!");
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews/${reviewId}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText })
      });
      if (response.ok) {
        const updatedProduct = await response.json();
        setProductsList(prev => prev.map(p => p._id === productId ? updatedProduct : p));
        setSelectedProductReviews(updatedProduct);
        setReplyingToReviewId(null); setReplyText('');
        toast.success("Відповідь опубліковано!");
      } else throw new Error();
    } catch (error) { toast.error("Помилка сервера."); }
  };

  const openReadMoreModal = (title, content) => {
    setTextModalData({ isOpen: true, title, content });
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalSales = safeOrders.filter(o => o.status === 'Paid' || o.status === 'Shipped').reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrdersCount = safeOrders.filter(o => o.status === 'Pending').length;

  if (loading) return <div className={styles.centerMsg}>Ініціалізація терміналу FATALITY...</div>;
  if (error) return <div className={styles.centerMsg}>Критична помилка: {error}</div>;

  return (
    <>
      <div className={styles.adminPage}>
        <div className={styles.adminTopHeader}>
          <h2 className={styles.pageTitle}>Система керування</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button type="button" className={styles.syncBtn} onClick={() => fetchInitialData(true)} disabled={isRefreshing} title="Синхронізувати базу">
              <FaSyncAlt className={isRefreshing ? styles.spinIcon : ''} /> {isRefreshing ? 'Синхронізація...' : 'Оновити дані'}
            </button>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout} title="Завершити сеанс">
              <FaSignOutAlt /> Вийти
            </button>
          </div>
        </div>

        <div className={styles.tabsWrapper}>
          <button className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTab : ''}`} onClick={() => setActiveTab('orders')}>Замовлення</button>
          <button className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`} onClick={() => setActiveTab('products')}>Товари</button>
          <button className={`${styles.tabBtn} ${activeTab === 'service' ? styles.activeTab : ''}`} onClick={() => setActiveTab('service')}>🛠 Сервіс</button>
          <button className={`${styles.tabBtn} ${activeTab === 'tradein' ? styles.activeTab : ''}`} onClick={() => setActiveTab('tradein')}><FaRecycle/> Trade-In</button>
          <button className={`${styles.tabBtn} ${activeTab === 'buyout' ? styles.activeTab : ''}`} onClick={() => setActiveTab('buyout')}><FaMoneyBillWave/> Викуп</button>
          <button className={`${styles.tabBtn} ${activeTab === 'clients' ? styles.activeTab : ''}`} onClick={() => { setActiveTab('clients'); setSelectedClientId(null); }}><FaUsers/> CRM</button>
          <button className={`${styles.tabBtn} ${activeTab === 'calendar' ? styles.activeTab : ''}`} onClick={() => setActiveTab('calendar')}><FaCalendarAlt/> Календар</button>
        </div>

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
          <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
              <StatCard icon={<FaBoxes />} label="Усього замовлень" value={safeOrders.length} colorClass="blue" delay="0.1s" />
              <StatCard icon={<FaDollarSign />} label="Загальний виторг" value={`${totalSales} грн`} colorClass="green" delay="0.2s" />
              <StatCard icon={<FaClock />} label="Очікують оплати" value={pendingOrdersCount} colorClass="orange" delay="0.3s" />
            </div>

            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Стрічка даних</h3>
              <div className={styles.filtersControls}>
                <div className={styles.adminSearchWrapper}>
                  <FaSearch className={styles.adminSearchIcon} />
                  <input type="text" placeholder="Пошук (Ім'я, Телефон, ID)..." className={styles.adminSearchInput} value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} />
                  {orderSearchQuery && <button className={styles.adminSearchClear} onClick={() => setOrderSearchQuery('')}><FaTimes /></button>}
                </div>

                <div className={styles.dateFilterWrapper}>
                  <div className={styles.dateFilterLabel}>
                    <FaCalendarAlt className={styles.dateFilterIcon} />
                    <span>Період:</span>
                  </div>
                  <div className={styles.dateInputGroup}>
                    <input type="date" className={styles.dateInput} value={orderStartDate} onChange={(e) => setOrderStartDate(e.target.value)} title="Початкова дата" />
                    <span className={styles.dateDivider}>-</span>
                    <input type="date" className={styles.dateInput} value={orderEndDate} onChange={(e) => setOrderEndDate(e.target.value)} title="Кінцева дата" />
                  </div>
                  {(orderStartDate || orderEndDate) && (
                    <button type="button" className={styles.clearDateBtn} onClick={() => { setOrderStartDate(''); setOrderEndDate(''); }} title="Очистити дати">
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className={styles.filterWrapper}>
                  <label htmlFor="statusFilter">Фільтр:</label>
                  <select id="statusFilter" className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
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
                  {safeOrders.length === 0 ? "База даних порожня. Чекаємо на перші замовлення!" : "За вказаними критеріями замовлень не знайдено."}
                </div>
              ) : (
                filteredOrders.map((order, index) => (
                  <div key={order._id} className={styles.orderCard} style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
                    <div className={styles.orderHeader}>
                      <div className={styles.orderMeta}>
                        <span className={styles.orderId}>ID: {order._id}</span>
                        <span className={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={styles.orderStatusActions}>
                        <StatusBadge status={order.status} />
                        <button className={styles.deleteOrderBtn} onClick={() => setDeleteTarget({ id: order._id, type: 'order', endpoint: 'orders' })} title="Видалити замовлення"><FaTrash /></button>
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
                          {order.items?.map((item, idx) => (
                            <div key={idx} className={styles.itemRow}>
                              <span className={styles.itemNameText}>{item.title} x{item.quantity}</span>
                              <span className={styles.itemPriceText}>{item.price * item.quantity} грн</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.orderFooter}>
                      <div className={styles.statusControlBlock}>
                        <select id={`status-${order._id}`} defaultValue={order.status} className={styles.statusSelect}>
                          <option value="Pending">Очікує оплати</option>
                          <option value="Paid">Оплачено</option>
                          <option value="Processing">Обробка замовлення</option>
                          <option value="Shipped">Відправлено</option>
                          <option value="Cancelled">Скасовано</option>
                        </select>
                        <input id={`ttn-${order._id}`} type="text" placeholder="ТТН Нової Пошти" defaultValue={order.trackingNumber || ''} className={styles.ttnInput} />
                        <button className={styles.updateStatusBtn} onClick={async () => {
                          const statusEl = document.getElementById(`status-${order._id}`);
                          const ttnEl = document.getElementById(`ttn-${order._id}`);
                          try {
                            const res = await fetch(`${API_BASE}/api/orders/${order._id}/status`, {
                              method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                              body: JSON.stringify({ status: statusEl.value, trackingNumber: ttnEl.value })
                            });
                            if (res.ok) {
                              const updatedOrder = await res.json();
                              setOrders(prev => prev.map(o => o._id === order._id ? updatedOrder : o));
                              toast.success('Оновлено!');
                            }
                          } catch(e) { toast.error('Помилка оновлення'); }
                        }}>Зберегти</button>
                      </div>
                      <div className={styles.totalBlock}>
                        <span className={styles.totalLabel}>Разом:</span>
                        <span className={styles.totalPrice}>{order.totalAmount} грн</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
          <div className={styles.tabContent}>
            <div className={styles.addProductCard}>
              <h3 className={styles.formTitle}>
                {editProductId ? <FaEdit style={{ color: 'var(--success-color)' }} /> : <FaPlusCircle />} 
                {editProductId ? 'Редагування товару' : 'Додати нову позицію'}
              </h3>
              
              <form onSubmit={handleAddOrEditProduct} className={styles.productForm}>
                
                <div className={styles.formRow}>
                  <input type="text" placeholder="Назва товару (напр. Sony PlayStation 5)" required className={styles.inputField} value={newProduct.title} onChange={e => setNewProduct(prev => ({...prev, title: e.target.value}))} />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.cascadingField}>
                    {customFields.category ? (
                      <div className={styles.customInputWrapper}>
                        <input type="text" placeholder="Введіть нову категорію..." className={styles.inputField} required value={newProduct.category} onChange={e => setNewProduct(prev => ({...prev, category: e.target.value}))} autoFocus />
                        <button type="button" className={styles.cancelCustomBtn} onClick={() => { setCustomFields(prev => ({...prev, category: false})); setNewProduct(prev => ({...prev, category: ''})); }}>✖</button>
                      </div>
                    ) : (
                      <select 
                        className={styles.inputField} 
                        required 
                        value={newProduct.category} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCustomFields(prev => ({...prev, category: true, brand: true, model: true}));
                            setNewProduct(prev => ({...prev, category: '', brand: '', model: ''}));
                          } else {
                            setCustomFields(prev => ({...prev, category: false, brand: false, model: false}));
                            setNewProduct(prev => ({...prev, category: val, brand: '', model: ''}));
                          }
                        }}
                      >
                        <option value="" disabled>-- Оберіть категорію --</option>
                        {Object.keys(dynamicCatalog).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="custom" className={styles.addCustomOption}>+ Створити нову категорію...</option>
                      </select>
                    )}
                  </div>

                  {newProduct.category && (
                    <div className={styles.cascadingField}>
                      {customFields.brand ? (
                        <div className={styles.customInputWrapper}>
                          <input type="text" placeholder="Введіть новий бренд..." className={styles.inputField} required value={newProduct.brand} onChange={e => setNewProduct(prev => ({...prev, brand: e.target.value}))} autoFocus />
                          <button type="button" className={styles.cancelCustomBtn} onClick={() => { setCustomFields(prev => ({...prev, brand: false})); setNewProduct(prev => ({...prev, brand: ''})); }}>✖</button>
                        </div>
                      ) : (
                        <select 
                          className={styles.inputField} 
                          required 
                          value={newProduct.brand} 
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setCustomFields(prev => ({...prev, brand: true, model: true}));
                              setNewProduct(prev => ({...prev, brand: '', model: ''}));
                            } else {
                              setCustomFields(prev => ({...prev, brand: false, model: false}));
                              setNewProduct(prev => ({...prev, brand: val, model: ''}));
                            }
                          }}
                        >
                          <option value="" disabled>-- Оберіть бренд --</option>
                          {dynamicCatalog[newProduct.category] && Object.keys(dynamicCatalog[newProduct.category]).map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                          <option value="custom" className={styles.addCustomOption}>+ Створити новий бренд...</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {newProduct.brand && (
                  <div className={styles.formRow}>
                    <div className={styles.cascadingField}>
                      {customFields.model ? (
                        <div className={styles.customInputWrapper}>
                          <input type="text" placeholder="Введіть нову модель..." className={styles.inputField} required value={newProduct.model} onChange={e => setNewProduct(prev => ({...prev, model: e.target.value}))} autoFocus />
                          <button type="button" className={styles.cancelCustomBtn} onClick={() => { setCustomFields(prev => ({...prev, model: false})); setNewProduct(prev => ({...prev, model: ''})); }}>✖</button>
                        </div>
                      ) : (
                        <select 
                          className={styles.inputField} 
                          required 
                          value={newProduct.model} 
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setCustomFields(prev => ({...prev, model: true}));
                              setNewProduct(prev => ({...prev, model: ''}));
                            } else {
                              setNewProduct(prev => ({...prev, model: val}));
                            }
                          }}
                        >
                          <option value="" disabled>-- Оберіть модель --</option>
                          {(dynamicCatalog[newProduct.category] && dynamicCatalog[newProduct.category][newProduct.brand]) && 
                            dynamicCatalog[newProduct.category][newProduct.brand].map(model => (
                              <option key={model} value={model}>{model}</option>
                            ))
                          }
                          <option value="custom" className={styles.addCustomOption}>+ Створити нову модель...</option>
                        </select>
                      )}
                    </div>

                    <input type="number" placeholder="Ціна (грн)" required className={styles.inputField} value={newProduct.price} onChange={e => setNewProduct(prev => ({...prev, price: e.target.value}))} />
                    
                    <select className={styles.inputField} required value={newProduct.condition} onChange={e => setNewProduct(prev => ({...prev, condition: e.target.value}))}>
                      <option value="Нова">Нова</option>
                      <option value="Вживана - Ідеальний стан">Вживана - Ідеальний стан</option>
                      <option value="Вживана - Хороший стан">Вживана - Хороший стан</option>
                      <option value="Відновлена (Refurbished)">Відновлена (Refurbished)</option>
                    </select>
                  </div>
                )}

                {newProduct.brand && (
                  <div className={styles.formRow} style={{ alignItems: 'center' }}>
                    <input type="text" placeholder="Приховані пошукові теги (через кому)" className={styles.inputField} value={newProduct.searchTags} onChange={e => setNewProduct(prev => ({...prev, searchTags: e.target.value}))} />
                    <button type="button" onClick={handleGenerateTags} className={styles.aiButton}>✨ AI Теги</button>
                  </div>
                )}
                
                {newProduct.brand && (
                  <>
                    <div className={styles.editorWrapper}>
                      <ReactQuill theme="snow" modules={quillModules} value={newProduct.description} onChange={(content) => setNewProduct(prev => ({...prev, description: content}))} placeholder="Опис товару..." />
                    </div>
                    
                    <div className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`} 
                         onDragOver={e => { e.preventDefault(); setIsDragging(true); }} 
                         onDragLeave={() => setIsDragging(false)} 
                         onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileSelection(e.dataTransfer.files); }} 
                         onClick={() => fileInputRef.current?.click()}>
                      <input ref={fileInputRef} type="file" multiple accept="image/*" className={styles.hiddenFileInput} onChange={e => handleFileSelection(e.target.files)} />
                      {imageFiles.length > 0 ? (
                        <div className={styles.galleryPreview}>
                          {imageFiles.map((file, idx) => (
                            <div key={idx} className={styles.previewThumbWrapper} onClick={(e) => e.stopPropagation()}>
                              <img src={URL.createObjectURL(file)} alt="preview" className={styles.previewThumb} />
                              <button type="button" className={styles.removeThumbBtn} onClick={(e) => { e.stopPropagation(); setImageFiles(prev => prev.filter((_, i) => i !== idx)); }}>×</button>
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
                      <button type="submit" className={styles.submitProductBtn} style={{ backgroundColor: editProductId ? 'var(--success-color)' : 'var(--primary-color)' }}>
                        {editProductId ? 'ЗБЕРЕГТИ ЗМІНИ' : 'ЗАВАНТАЖИТИ В БАЗУ'}
                      </button>
                      {editProductId && (
                        <button type="button" className={styles.cancelProductBtn} onClick={resetForm}>СКАСУВАТИ</button>
                      )}
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className={styles.adminProductsSection}>
              <h3 className={styles.sectionTitle}>Існуючі товари в базі</h3>
              <div className={styles.adminProductsGrid}>
                {productsList.length === 0 ? <p className={styles.noOrders}>Немає товарів.</p> : productsList.map(product => {
                  const firstImg = product.imageUrls?.[0] || product.imageUrl;
                  const validThumb = firstImg?.startsWith('/') ? `${API_BASE}${firstImg}` : firstImg;
                  return (
                    <div key={product._id} className={styles.adminProductCard}>
                      <Link to={`/product/${product._id}`} className={styles.adminProductLinkWrapper}>
                        <img src={validThumb || 'https://via.placeholder.com/100'} alt={product.title} className={styles.adminProductThumb} />
                        <div className={styles.adminProductInfo}>
                          <h4>{product.title}</h4>
                          
                          {/* ВИПРАВЛЕНО: ТЕГИ ТОВАРУ ЗАМІСТЬ INLINE-СТИЛІВ */}
                          <div className={styles.adminProductTags}>
                            <span className={styles.tagCategory}>{product.category || 'Консолі'}</span>
                            <span className={styles.tagBrand}>{product.brand || 'Sony'}</span>
                          </div>

                          <span className={styles.adminProductPrice}>{product.price} грн</span>
                        </div>
                      </Link>
                      <div className={styles.adminProductActions}>
                        <button className={styles.reviewsBtn} onClick={() => { setSelectedProductReviews(product); setReplyText(''); setReplyingToReviewId(null); }} title="Відгуки"><FaCommentDots /> {product.reviews?.length || 0}</button>
                        <button className={styles.editBtn} onClick={() => {
                          setEditProductId(product._id); setImageFiles([]); window.scrollTo({ top: 0, behavior: 'smooth' });
                          const catExists = dynamicCatalog.hasOwnProperty(product.category);
                          const brandExists = catExists && dynamicCatalog[product.category].hasOwnProperty(product.brand);
                          const modelExists = brandExists && dynamicCatalog[product.category][product.brand].includes(product.model);
                          
                          setCustomFields({
                            category: !catExists && !!product.category,
                            brand: !brandExists && !!product.brand,
                            model: !modelExists && !!product.model
                          });

                          setNewProduct({ 
                            title: product.title, 
                            category: product.category || 'Консолі', 
                            brand: product.brand || 'Sony', 
                            model: product.model || '', 
                            price: product.price, 
                            condition: product.condition, 
                            description: product.description, 
                            searchTags: product.searchTags || '' 
                          });
                        }} title="Редагувати"><FaEdit /></button>
                        <button className={styles.deleteBtn} onClick={() => setDeleteTarget({ id: product._id, type: 'product', endpoint: 'products' })} title="Видалити"><FaTrash /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- SERVICE / TRADE-IN / BUYOUT TABS --- */}
        {['service', 'tradein', 'buyout'].includes(activeTab) && (
          <div className={styles.tabContent}>
            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>
                {activeTab === 'service' ? 'Заявки на ремонт' : activeTab === 'tradein' ? 'Заявки Trade-In' : 'Заявки на Викуп'}
              </h3>
              
              <div className={styles.filtersControls}>
                <div className={styles.adminSearchWrapper}>
                  <FaSearch className={styles.adminSearchIcon} />
                  <input type="text" placeholder="Пошук (Ім'я, Телефон)..." className={styles.adminSearchInput} value={ticketSearchQuery} onChange={(e) => setTicketSearchQuery(e.target.value)} />
                  {ticketSearchQuery && <button className={styles.adminSearchClear} onClick={() => setTicketSearchQuery('')}><FaTimes /></button>}
                </div>

                <div className={styles.dateFilterWrapper}>
                  <div className={styles.dateFilterLabel}>
                    <FaCalendarAlt className={styles.dateFilterIcon} />
                    <span>Період:</span>
                  </div>
                  <div className={styles.dateInputGroup}>
                    <input type="date" className={styles.dateInput} value={ticketStartDate} onChange={(e) => setTicketStartDate(e.target.value)} title="Початкова дата" />
                    <span className={styles.dateDivider}>-</span>
                    <input type="date" className={styles.dateInput} value={ticketEndDate} onChange={(e) => setTicketEndDate(e.target.value)} title="Кінцева дата" />
                  </div>
                  {(ticketStartDate || ticketEndDate) && (
                    <button type="button" className={styles.clearDateBtn} onClick={() => { setTicketStartDate(''); setTicketEndDate(''); }} title="Очистити дати">
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className={styles.filterWrapper}>
                  <label htmlFor="ticketStatusFilter">Фільтр:</label>
                  <select id="ticketStatusFilter" className={styles.filterSelect} value={ticketFilterStatus} onChange={(e) => setTicketFilterStatus(e.target.value)}>
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
              {activeTab === 'service' && filteredServiceRequests.length === 0 && <p className={styles.noOrders}>За вказаними критеріями заявок не знайдено.</p>}
              {activeTab === 'tradein' && filteredTradeInRequests.length === 0 && <p className={styles.noOrders}>За вказаними критеріями заявок не знайдено.</p>}
              {activeTab === 'buyout' && filteredBuyoutRequests.length === 0 && <p className={styles.noOrders}>За вказаними критеріями заявок не знайдено.</p>}
              
              {activeTab === 'service' && filteredServiceRequests.map((req, i) => (
                <TicketCard key={req._id} index={i} ticket={req} type="service" 
                  onUpdateStatus={(id, val) => handleUpdateTicketStatus('service-requests', id, val, setServiceRequests)} 
                  onDelete={(id) => setDeleteTarget({ id, type: 'service', endpoint: 'service-requests' })} 
                  onReadMore={openReadMoreModal} />
              ))}
              
              {activeTab === 'tradein' && filteredTradeInRequests.map((req, i) => (
                <TicketCard key={req._id} index={i} ticket={req} type="tradein" 
                  onUpdateStatus={(id, val) => handleUpdateTicketStatus('trade-in', id, val, setTradeInRequests)} 
                  onDelete={(id) => setDeleteTarget({ id, type: 'tradein', endpoint: 'trade-in' })} 
                  onImageClick={(imgs, idx) => { setViewImages(imgs); setCurrentImageIndex(idx); }} 
                  onReadMore={openReadMoreModal} />
              ))}
              
              {activeTab === 'buyout' && filteredBuyoutRequests.map((req, i) => (
                <TicketCard key={req._id} index={i} ticket={req} type="buyout" 
                  onUpdateStatus={(id, val) => handleUpdateTicketStatus('buyout', id, val, setBuyoutRequests)} 
                  onDelete={(id) => setDeleteTarget({ id, type: 'buyout', endpoint: 'buyout' })} 
                  onImageClick={(imgs, idx) => { setViewImages(imgs); setCurrentImageIndex(idx); }} 
                  onReadMore={openReadMoreModal} />
              ))}
            </div>
          </div>
        )}

        {/* --- CRM TABS --- */}
        {activeTab === 'clients' && (
          <div className={styles.tabContent}>
            {!selectedClientId ? (
              <>
                <h3 className={styles.sectionTitle}>База контрагентів</h3>
                <div className={styles.crmGrid}>
                  {clientsList.length === 0 ? <p className={styles.noOrders}>База клієнтів порожня.</p> : 
                    clientsList.map(client => (
                      <div key={client._id} className={styles.crmClientCard} onClick={() => setSelectedClientId(client._id)}>
                        <div className={styles.crmClientAvatar}>
                          <FaUser />
                        </div>
                        <div className={styles.crmClientInfo}>
                          <h4>{client.name}</h4>
                          <span>📞 {client.phone}</span>
                        </div>
                        <div className={styles.crmClientAction}>
                          <FaChevronRight />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </>
            ) : <ClientCard clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className={styles.tabContent}>
            <div className={styles.crmCalendarWrapper}>
              <CRMCalendar />
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Image Gallery Modal */}
      {viewImages && (
        <div className={styles.imageModalOverlay} onClick={() => setViewImages(null)}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeImageBtn} onClick={() => setViewImages(null)}>✖</button>
            {viewImages.length > 1 && <button className={`${styles.navImgBtn} ${styles.navPrev}`} onClick={() => setCurrentImageIndex(prev => (prev - 1 + viewImages.length) % viewImages.length)}>❮</button>}
            <img src={viewImages[currentImageIndex].startsWith('/') ? `${API_BASE}${viewImages[currentImageIndex]}` : viewImages[currentImageIndex]} alt="Full size preview" />
            {viewImages.length > 1 && <button className={`${styles.navImgBtn} ${styles.navNext}`} onClick={() => setCurrentImageIndex(prev => (prev + 1) % viewImages.length)}>❯</button>}
            <div className={styles.imgCounter}>{currentImageIndex + 1} / {viewImages.length}</div>
          </div>
        </div>
      )}

      {/* 2. Full Text Reading Modal */}
      <FullTextModal 
        isOpen={textModalData.isOpen} 
        title={textModalData.title} 
        content={textModalData.content} 
        onClose={() => setTextModalData({ isOpen: false, title: '', content: '' })} 
      />

      {/* 3. Reviews Management Modal */}
      {selectedProductReviews && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProductReviews(null)}>
          <div className={styles.reviewsModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.pageTitle} style={{ margin: 0, fontSize: '20px' }}>Відгуки: {selectedProductReviews.title}</h3>
              <button className={styles.closeModalBtn} onClick={() => setSelectedProductReviews(null)}>✖</button>
            </div>
            
            <div className={styles.reviewsListAdmin}>
              {!selectedProductReviews.reviews?.length ? (
                <div className={styles.noOrders} style={{ marginTop: '20px' }}>Цей товар ще не має відгуків.</div>
              ) : (
                selectedProductReviews.reviews.map(rev => (
                  <div key={rev._id} className={styles.adminReviewCard}>
                    <div className={styles.adminReviewHeader}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '16px' }}>{rev.name}</strong> 
                        <span style={{ color: '#ffaa00', marginLeft: '10px' }}>⭐ {rev.rating}/5</span>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{new Date(rev.createdAt).toLocaleString('uk-UA')}</div>
                      </div>
                      <button className={styles.deleteReviewBtn} onClick={async () => {
                        if(!window.confirm("Видалити відгук?")) return;
                        const res = await fetch(`${API_BASE}/api/products/${selectedProductReviews._id}/reviews/${rev._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
                        if(res.ok) {
                          const updatedProduct = await res.json();
                          setProductsList(prev => prev.map(p => p._id === selectedProductReviews._id ? updatedProduct : p));
                          setSelectedProductReviews(updatedProduct);
                          toast.success("Відгук видалено!");
                        }
                      }} title="Видалити відгук"><FaTrash /></button>
                    </div>
                    <p className={styles.adminReviewText}>{rev.comment}</p>
                    {rev.adminReply ? (
                      <div className={styles.adminReplyBox}>
                        <strong>🎮 Ваша відповідь:</strong> 
                        <p style={{ margin: '5px 0' }}>{rev.adminReply}</p>
                        <button className={styles.editReplyBtn} onClick={() => { setReplyingToReviewId(rev._id); setReplyText(rev.adminReply); }}>Змінити відповідь</button>
                      </div>
                    ) : (
                      replyingToReviewId === rev._id ? (
                        <div className={styles.replyInputBox}>
                          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Напишіть відповідь клієнту..." rows="3" className={styles.replyTextarea} />
                          <div className={styles.replyActions}>
                            <button className={styles.cancelReplyBtn} onClick={() => setReplyingToReviewId(null)}>Скасувати</button>
                            <button className={styles.saveReplyBtn} onClick={() => handleReplySubmit(selectedProductReviews._id, rev._id)}>Зберегти</button>
                          </div>
                        </div>
                      ) : <button className={styles.addReplyBtn} onClick={() => { setReplyingToReviewId(rev._id); setReplyText(''); }}>Відповісти клієнту</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Unified Delete Confirmation Modal */}
      <DeleteConfirmModal 
        isOpen={!!deleteTarget.id} 
        title={
          deleteTarget.type === 'order' ? 'Видалення замовлення' :
          deleteTarget.type === 'product' ? 'Видалення товару' :
          deleteTarget.type === 'service' ? 'Видалення заявки' : 'Видалення'
        } 
        onClose={() => setDeleteTarget({ id: null, type: null, endpoint: null })} 
        onConfirm={executeDelete} 
      />

    </>
  );
}