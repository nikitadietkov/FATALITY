import { 
  FaBoxes, FaDollarSign, FaUser, FaClock, FaShoppingBag, 
  FaPlusCircle, FaCloudUploadAlt, FaEdit, FaTrash, 
  FaSearch, FaTimes, FaSignOutAlt, FaRecycle, FaMoneyBillWave, FaCommentDots
} from 'react-icons/fa';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  
  const [newProduct, setNewProduct] = useState({ 
    title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '', searchTags: ''
  });
  
  const [replyText, setReplyText] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [productMsg, setProductMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  
  // --- СТЕЙТИ ДЛЯ ВІДГУКІВ ---
  const [selectedProductReviews, setSelectedProductReviews] = useState(null);
  const [replyingToReviewId, setReplyingToReviewId] = useState(null);
  
  const [editProductId, setEditProductId] = useState(null);
  
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceToDelete, setServiceToDelete] = useState(null);  

  const [tradeInRequests, setTradeInRequests] = useState([]);
  const [tradeInToDelete, setTradeInToDelete] = useState(null);
  
  const [buyoutRequests, setBuyoutRequests] = useState([]);
  const [buyoutToDelete, setBuyoutToDelete] = useState(null);

  const [viewImages, setViewImages] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Сеанс завершено. До зустрічі!', { icon: '👋' });
    navigate('/admin-login');
  };

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

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { navigate('/admin-login'); return; }

      const [ordersRes, productsRes, serviceRes, tradeInRes, buyoutRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/service-requests`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/trade-in`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/buyout`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (ordersRes.status === 401 || ordersRes.status === 403) {
        localStorage.removeItem('adminToken'); navigate('/admin-login'); return;
      }

      if (!ordersRes.ok) throw new Error(`Доступ заборонено (${ordersRes.status})`);
      if (!productsRes.ok) throw new Error(`Помилка товарів (${productsRes.status})`);
      if (!serviceRes.ok) throw new Error(`Помилка сервісів (${serviceRes.status})`);
      if (!tradeInRes.ok) throw new Error(`Помилка Трейд-ін (${tradeInRes.status})`);
      if (!buyoutRes.ok) throw new Error(`Помилка Викупу (${buyoutRes.status})`);
      
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const serviceData = await serviceRes.json();
      const tradeInData = await tradeInRes.json();
      const buyoutData = await buyoutRes.json();
      
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProductsList(Array.isArray(productsData) ? productsData : []);
      setServiceRequests(Array.isArray(serviceData) ? serviceData : []);
      setTradeInRequests(Array.isArray(tradeInData) ? tradeInData : []);
      setBuyoutRequests(Array.isArray(buyoutData) ? buyoutData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, orderSearchQuery]);

  // --- ЛОГІКА ТОВАРІВ ---
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFileSelection(e.dataTransfer.files); };
  const handleFileInput = (e) => handleFileSelection(e.target.files);
  const removeImage = (indexToRemove, e) => {
    e.stopPropagation();
    setImageFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };
  const handleFileSelection = (files) => {
    setProductMsg('');
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length > 0) setImageFiles(prev => [...prev, ...validFiles].slice(0, 5));
    else setProductMsg('❌ Помилка: завантажте лише зображення.');
  };

  const handleAddOrEditProduct = async (e) => {
    e.preventDefault();
    setProductMsg('');
    const isDescEmpty = !newProduct.description || newProduct.description === '<p><br></p>';
    if (isDescEmpty) return toast.error('Додайте опис товару!');
    if (!editProductId && imageFiles.length === 0) return toast.error('Завантажте хоча б 1 фото!');

    const loadingToast = toast.loading(editProductId ? 'Оновлення товару...' : 'Додавання товару...');

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('title', newProduct.title);
      formData.append('model', newProduct.model);
      formData.append('price', newProduct.price);
      formData.append('condition', newProduct.condition);
      formData.append('description', newProduct.description);
      formData.append('searchTags', newProduct.searchTags || '');
      imageFiles.forEach(file => formData.append('images', file));

      const method = editProductId ? 'PUT' : 'POST';
      const url = editProductId ? `${API_BASE}/api/products/${editProductId}` : `${API_BASE}/api/products`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success(editProductId ? 'Товар успішно оновлено!' : 'Товар успішно додано!', { id: loadingToast });
        setNewProduct({ title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '', searchTags: '' });
        setImageFiles([]); 
        setEditProductId(null); 
        if (fileInputRef.current) fileInputRef.current.value = '';
        const updatedProducts = await fetch(`${API_BASE}/api/products`).then(res => res.json());
        setProductsList(Array.isArray(updatedProducts) ? updatedProducts : []);
      } else {
        toast.error('❌ Помилка при збереженні.', { id: loadingToast });
      }
    } catch (err) { toast.error('Помилка сервера', { id: loadingToast }); }
  };

  const handleGenerateTags = async () => {
    if (!newProduct.title) return toast.error('Спочатку введіть назву товару!');
    const loadingToast = toast.loading('Штучний інтелект аналізує товар...');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/generate-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newProduct.title, description: newProduct.description })
      });
      if (response.ok) {
        const data = await response.json();
        setNewProduct(prev => ({ ...prev, searchTags: data.tags }));
        toast.success('Ідеальні теги згенеровано!', { id: loadingToast, icon: '🧠' });
      } else { toast.error('Помилка генерації.', { id: loadingToast }); }
    } catch (error) { toast.error('Втрачено зв\'язок з AI', { id: loadingToast }); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Точно видалити цей товар назавжди?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        setProductsList(prev => prev.filter(p => p._id !== id));
        toast.success('Товар назавжди видалено!');
      } else { toast.error("Помилка видалення товару"); }
    } catch (err) { console.error(err); }
  };

  const handleEditClick = (product) => {
    setEditProductId(product._id);
    setNewProduct({ 
      title: product.title || '', model: product.model || '', price: product.price || '', 
      condition: product.condition || 'Вживана - Ідеальний стан', description: product.description || '', searchTags: product.searchTags || ''
    });
    setImageFiles([]); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
    setEditProductId(null); 
    setNewProduct({ title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '', searchTags: '' });
    setImageFiles([]); setProductMsg('');
  };

  // --- ЛОГІКА ВІДГУКІВ (НОВЕ) ---
  const openReviewsModal = (product) => {
    setSelectedProductReviews(product);
    setReplyText('');
    setReplyingToReviewId(null);
  };

  const handleDeleteReview = async (productId, reviewId) => {
    if (!window.confirm("Точно видалити цей відгук?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews/${reviewId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const updatedProduct = await response.json();
        // Оновлюємо товар у списку
        setProductsList(prev => prev.map(p => p._id === productId ? updatedProduct : p));
        // Оновлюємо модалку
        setSelectedProductReviews(updatedProduct);
        toast.success("Відгук видалено!");
      } else { toast.error("Помилка видалення."); }
    } catch (error) { toast.error("Помилка сервера."); }
  };

  const handleReplySubmit = async (productId, reviewId) => {
    if (!replyText.trim()) return toast.error("Введіть текст відповіді!");
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText })
      });
      if (response.ok) {
        const updatedProduct = await response.json();
        setProductsList(prev => prev.map(p => p._id === productId ? updatedProduct : p));
        setSelectedProductReviews(updatedProduct);
        setReplyingToReviewId(null);
        setReplyText('');
        toast.success("Відповідь опубліковано!");
      } else { toast.error("Помилка збереження."); }
    } catch (error) { toast.error("Помилка сервера."); }
  };

  // --- ЛОГІКА ЗАМОВЛЕНЬ ---
  const handleUpdateOrderStatus = async (orderId) => {
    const statusEl = document.getElementById(`status-${orderId}`);
    const ttnEl = document.getElementById(`ttn-${orderId}`);
    if (!statusEl || !ttnEl) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: statusEl.value, trackingNumber: ttnEl.value })
      });
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        toast.success('Статус та ТТН успішно оновлено!');
      } else { toast.error('Помилка оновлення статусу.'); }
    } catch (err) { toast.error('Помилка з\'єднання з сервером.'); }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    const loadingToast = toast.loading('Видалення замовлення...');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/orders/${orderToDelete}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        setOrders(prev => prev.filter(o => o._id !== orderToDelete));
        toast.success('Замовлення успішно видалено!', { id: loadingToast });
      } else { toast.error("Помилка видалення замовлення", { id: loadingToast }); }
    } catch (err) { toast.error('Помилка сервера', { id: loadingToast }); 
    } finally { setOrderToDelete(null); }
  };

  // --- ІНШІ ОБРОБНИКИ СТАТУСІВ (Service, TradeIn, Buyout) ---
  const handleUpdateStatus = async (endpoint, id, newStatus, stateUpdater) => {
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
      }
    } catch (err) { toast.error('Помилка оновлення'); }
  };

  const confirmDeleteTicket = async (endpoint, id, stateUpdater, setDeleteId) => {
    if (!id) return;
    const loadingToast = toast.loading('Видалення заявки...');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/${endpoint}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        stateUpdater(prev => prev.filter(r => r._id !== id));
        toast.success('Заявку успішно видалено!', { id: loadingToast });
      } else { toast.error('Помилка видалення', { id: loadingToast }); }
    } catch (err) { toast.error('Помилка сервера', { id: loadingToast }); } 
    finally { setDeleteId(null); }
  };

  // --- ФОТОГАЛЕРЕЯ ---
  const openImageViewer = (images, index) => { setViewImages(images); setCurrentImageIndex(index); };
  const nextImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % viewImages.length); };
  const prevImage = (e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + viewImages.length) % viewImages.length); };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className={`${styles.statusBadge} ${styles.paid}`}>ОПЛАЧЕНО</span>;
      case 'Processing': return <span className={`${styles.statusBadge} ${styles.processing}`}>В ОБРОБЦІ</span>;
      case 'Shipped': return <span className={`${styles.statusBadge} ${styles.shipped}`}>ВІДПРАВЛЕНО</span>;
      case 'Cancelled': return <span className={`${styles.statusBadge} ${styles.cancelled}`}>СКАСОВАНО</span>;
      default: return <span className={`${styles.statusBadge} ${styles.pending}`}>ОЧІКУЄ ОПЛАТИ</span>;
    }
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
          <button type="button" className={styles.logoutBtn} onClick={handleLogout} title="Завершити сеанс">
            <FaSignOutAlt /> Вийти
          </button>
        </div>

        <div className={styles.tabsWrapper}>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTab : ''}`} onClick={() => setActiveTab('orders')}>Замовлення</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`} onClick={() => setActiveTab('products')}>Управління товарами</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'service' ? styles.activeTab : ''}`} onClick={() => setActiveTab('service')}>🛠 Сервісний центр</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'tradein' ? styles.activeTab : ''}`} onClick={() => setActiveTab('tradein')}><FaRecycle/> Trade-In</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'buyout' ? styles.activeTab : ''}`} onClick={() => setActiveTab('buyout')}><FaMoneyBillWave/> Викуп</button>
        </div>

        {/* --- ВКЛАДКА: ЗАМОВЛЕННЯ --- */}
        {activeTab === 'orders' && (
          <div className={styles.tabContent}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard} style={{ animationDelay: '0.1s' }}>
                <div className={`${styles.iconWrapper} ${styles.blue}`}><FaBoxes /></div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Усього замовлень</span>
                  <span className={styles.statValue}>{safeOrders.length}</span>
                </div>
              </div>
              <div className={styles.statCard} style={{ animationDelay: '0.2s' }}>
                <div className={`${styles.iconWrapper} ${styles.green}`}><FaDollarSign /></div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Загальний виторг</span>
                  <span className={styles.statValue}>{totalSales} грн</span>
                </div>
              </div>
              <div className={styles.statCard} style={{ animationDelay: '0.3s' }}>
                <div className={`${styles.iconWrapper} ${styles.orange}`}><FaClock /></div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Очікують оплати</span>
                  <span className={styles.statValue}>{pendingOrdersCount}</span>
                </div>
              </div>
            </div>

            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Стрічка даних</h3>
              
              <div className={styles.filtersControls}>
                <div className={styles.adminSearchWrapper}>
                  <FaSearch className={styles.adminSearchIcon} />
                  <input type="text" placeholder="Пошук (Ім'я, Телефон, ID)..." className={styles.adminSearchInput} value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} />
                  {orderSearchQuery && <button type="button" className={styles.adminSearchClear} onClick={() => setOrderSearchQuery('')}><FaTimes /></button>}
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
                <p className={styles.noOrders}>{safeOrders.length === 0 ? "База даних порожня." : "За вказаними критеріями замовлень не знайдено."}</p>
              ) : (
                filteredOrders.map((order, index) => (
                    <div key={order._id} className={styles.orderCard} style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}>
                      <div className={styles.orderHeader}>
                        <div className={styles.orderMeta}>
                          <span className={styles.orderId}>ID: {order._id}</span>
                          <span className={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={styles.orderStatusActions}>
                          {renderStatusBadge(order.status)}
                          <button type="button" className={styles.deleteOrderBtn} onClick={() => setOrderToDelete(order._id)} title="Видалити замовлення"><FaTrash /></button>
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
                                <span>{item.title} x{item.quantity}</span>
                                <span>{item.price * item.quantity} грн</span>
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
                          <button type="button" className={styles.updateStatusBtn} onClick={() => handleUpdateOrderStatus(order._id)}>Зберегти</button>
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

        {/* --- ВКЛАДКА: ТОВАРИ --- */}
        {activeTab === 'products' && (
          <div className={styles.tabContent}>
            <div className={styles.addProductCard}>
              <h3 className={styles.formTitle}>
                {editProductId ? <FaEdit style={{ color: 'var(--success-color)' }} /> : <FaPlusCircle />} 
                {editProductId ? 'Редагування товару' : 'Додати нову консоль'}
              </h3>
              <form onSubmit={handleAddOrEditProduct} className={styles.productForm}>
                <div className={styles.formRow}>
                  <input type="text" placeholder="Назва (напр. Sony PlayStation 5)" required className={styles.inputField} value={newProduct.title || ''} onChange={e => setNewProduct(prev => ({...prev, title: e.target.value}))} />
                  <input type="text" placeholder="Модель (напр. PS5)" required className={styles.inputField} value={newProduct.model || ''} onChange={e => setNewProduct(prev => ({...prev, model: e.target.value}))} />
                </div>

                <div className={styles.formRow}>
                  <input type="number" placeholder="Ціна (грн)" required className={styles.inputField} value={newProduct.price || ''} onChange={e => setNewProduct(prev => ({...prev, price: e.target.value}))} />
                  <select className={styles.inputField} required value={newProduct.condition || 'Вживана - Ідеальний стан'} onChange={e => setNewProduct(prev => ({...prev, condition: e.target.value}))}>
                    <option value="Нова">Нова</option>
                    <option value="Вживана - Ідеальний стан">Вживана - Ідеальний стан</option>
                    <option value="Вживана - Хороший стан">Вживана - Хороший стан</option>
                    <option value="Відновлена (Refurbished)">Відновлена (Refurbished)</option>
                  </select>
                </div>

                <div className={styles.formRow} style={{ alignItems: 'center', gap: '15px' }}>
                  <input type="text" placeholder="Приховані пошукові теги (через кому)" className={styles.inputField} style={{ flex: 1, marginBottom: 0 }} value={newProduct.searchTags || ''} onChange={e => setNewProduct(prev => ({...prev, searchTags: e.target.value}))} />
                  <button type="button" onClick={handleGenerateTags} className={styles.aiButton} title="Згенерувати теги">✨ AI Теги</button>
                </div>

                <div className={styles.editorWrapper}>
                  <ReactQuill theme="snow" modules={quillModules} value={newProduct.description || ''} onChange={(content) => setNewProduct(prev => ({...prev, description: content}))} placeholder="Опис товару (комплектація, гарантія...)" />
                </div>

                <div className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" multiple accept="image/*" className={styles.hiddenFileInput} onChange={handleFileInput} />
                  {imageFiles.length > 0 ? (
                    <div className={styles.galleryPreview}>
                      {imageFiles.map((file, idx) => (
                        <div key={idx} className={styles.previewThumbWrapper} onClick={(e) => e.stopPropagation()}>
                          <img src={URL.createObjectURL(file)} alt="preview" className={styles.previewThumb} />
                          <button type="button" className={styles.removeThumbBtn} onClick={(e) => removeImage(idx, e)}>×</button>
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
                    <button type="button" className={styles.cancelProductBtn} onClick={cancelEdit}>СКАСУВАТИ</button>
                  )}
                </div>
              </form>
            </div>

            <div className={styles.adminProductsSection}>
              <h3 className={styles.sectionTitle}>Існуючі товари в базі</h3>
              <div className={styles.adminProductsGrid}>
                {productsList.length === 0 ? (
                  <p className={styles.noOrders}>Немає товарів.</p>
                ) : (
                  productsList.map(product => {
                    const firstImg = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl;
                    const validThumb = firstImg?.startsWith('/uploads') ? `${API_BASE}${firstImg}` : firstImg;
                    return (
                      <div key={product._id} className={styles.adminProductCard}>
                        <Link to={`/product/${product._id}`} className={styles.adminProductLinkWrapper} title="Відкрити сторінку">
                          <img src={validThumb || 'https://via.placeholder.com/100'} alt={product.title} className={styles.adminProductThumb} />
                          <div className={styles.adminProductInfo}>
                            <h4>{product.title}</h4>
                            <span className={styles.adminProductPrice}>{product.price} грн</span>
                          </div>
                        </Link>
                        
                        {/* 🔥 ДОДАНО КНОПКУ ВІДГУКІВ ТУТ */}
                        <div className={styles.adminProductActions}>
                          <button type="button" className={styles.reviewsBtn} onClick={() => openReviewsModal(product)} title="Керування відгуками">
                            <FaCommentDots /> {product.reviews?.length || 0}
                          </button>
                          <button type="button" className={styles.editBtn} onClick={() => handleEditClick(product)} title="Редагувати"><FaEdit /></button>
                          <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteProduct(product._id)} title="Видалити"><FaTrash /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- ВКЛАДКА: СЕРВІСНИЙ ЦЕНТР --- */}
        {activeTab === 'service' && (
          <div className={styles.tabContent}>
            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Заявки на ремонт та профілактику</h3>
            </div>
            <div className={styles.serviceGrid}>
              {serviceRequests.length === 0 ? (
                <p className={styles.noOrders}>Немає нових заявок на сервіс.</p>
              ) : (
                serviceRequests.map((req, index) => (
                  <div key={req._id} className={`${styles.serviceTicket} ${styles[`status${req.status.replace(' ', '')}`]}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className={styles.ticketHeader}>
                      <span className={styles.ticketDate}>{new Date(req.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={styles.ticketId}>ID: {req._id.slice(-6)}</span>
                    </div>
                    <div className={styles.ticketBody}>
                      <h4 className={styles.clientName}>{req.name}</h4>
                      <a href={`tel:${req.phone}`} className={styles.clientPhone}>📞 {req.phone}</a>
                      <div className={styles.deviceTag}>🎮 {req.consoleModel}</div>
                      <div className={styles.problemBox}>
                        <strong>Суть проблеми:</strong>
                        <p>{req.problem || 'Клієнт не залишив опису'}</p>
                      </div>
                    </div>
                    <div className={styles.ticketFooter}>
                      <select value={req.status} onChange={(e) => handleUpdateStatus('service-requests', req._id, e.target.value, setServiceRequests)} className={styles.serviceStatusSelect}>
                        <option value="New">Нова заявка</option>
                        <option value="In Progress">В роботі</option>
                        <option value="Completed">Завершено</option>
                        <option value="Cancelled">Відхилено</option>
                      </select>
                      <button onClick={() => setServiceToDelete(req._id)} className={styles.deleteTicketBtn} title="Видалити заявку"><FaTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- ВКЛАДКА: ТРЕЙД-ІН --- */}
        {activeTab === 'tradein' && (
          <div className={styles.tabContent}>
            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Заявки на Trade-In (Оцінка консолей)</h3>
            </div>
            <div className={styles.serviceGrid}>
              {tradeInRequests.length === 0 ? (
                <p className={styles.noOrders}>Немає нових заявок на Trade-In.</p>
              ) : (
                tradeInRequests.map((req, index) => (
                  <div key={req._id} className={`${styles.serviceTicket} ${styles[`status${req.status.replace(' ', '')}`]}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className={styles.ticketHeader}>
                      <span className={styles.ticketDate}>{new Date(req.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={styles.ticketId}>ID: {req._id.slice(-6)}</span>
                    </div>
                    <div className={styles.ticketBody}>
                      <h4 className={styles.clientName}>{req.name}</h4>
                      <a href={`tel:${req.phone}`} className={styles.clientPhone}>📞 {req.phone}</a>
                      <div className={styles.deviceTag}>🎮 {req.consoleName}</div>
                      {req.equipment && req.equipment.length > 0 && (
                        <div className={styles.equipmentTags}>
                          {req.equipment.map((item, idx) => <span key={idx} className={styles.equipTag}>{item}</span>)}
                        </div>
                      )}
                      <div className={styles.problemBox}><strong>Опис / Стан:</strong><p>{req.description || 'Без додаткового опису'}</p></div>
                      {req.images && req.images.length > 0 && (
                        <div className={styles.tradeInGallery}>
                          {req.images.map((img, idx) => {
                            const imgUrl = img.startsWith('/') ? `${API_BASE}${img}` : img;
                            return <img key={idx} src={imgUrl} alt="Консоль клієнта" className={styles.tradeInThumb} onClick={() => openImageViewer(req.images, idx)} title="Натисни для перегляду" />
                          })}
                        </div>
                      )}
                    </div>
                    <div className={styles.ticketFooter}>
                      <select value={req.status} onChange={(e) => handleUpdateStatus('trade-in', req._id, e.target.value, setTradeInRequests)} className={styles.serviceStatusSelect}>
                        <option value="New">Нова заявка</option>
                        <option value="Reviewed">На розгляді</option>
                        <option value="Accepted">Прийнято (Чекаємо девайс)</option>
                        <option value="Rejected">Відхилено</option>
                      </select>
                      <button onClick={() => setTradeInToDelete(req._id)} className={styles.deleteTicketBtn} title="Видалити заявку"><FaTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- ВКЛАДКА: ВИКУП --- */}
        {activeTab === 'buyout' && (
          <div className={styles.tabContent}>
            <div className={styles.ordersHeaderRow}>
              <h3 className={styles.sectionTitle}>Заявки на терміновий Викуп</h3>
            </div>
            <div className={styles.serviceGrid}>
              {buyoutRequests.length === 0 ? (
                <p className={styles.noOrders}>Немає нових заявок на викуп.</p>
              ) : (
                buyoutRequests.map((req, index) => (
                  <div key={req._id} className={`${styles.serviceTicket} ${styles[`status${req.status.replace(' ', '')}`]}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className={styles.ticketHeader}>
                      <span className={styles.ticketDate}>{new Date(req.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={styles.ticketId}>ID: {req._id.slice(-6)}</span>
                    </div>
                    <div className={styles.ticketBody}>
                      <h4 className={styles.clientName}>{req.name}</h4>
                      <a href={`tel:${req.phone}`} className={styles.clientPhone}>📞 {req.phone}</a>
                      <div className={styles.deviceTag}>🎮 {req.consoleName}</div>
                      <div className={styles.expectedPriceBox}><strong>Очікувана сума:</strong> {req.expectedPrice ? `${req.expectedPrice} грн` : 'Не вказано'}</div>
                      {req.equipment && req.equipment.length > 0 && (
                        <div className={styles.equipmentTags}>
                          {req.equipment.map((item, idx) => <span key={idx} className={styles.equipTag}>{item}</span>)}
                        </div>
                      )}
                      <div className={styles.problemBox}><strong>Опис / Стан:</strong><p>{req.description || 'Без додаткового опису'}</p></div>
                      {req.images && req.images.length > 0 && (
                        <div className={styles.tradeInGallery}>
                          {req.images.map((img, idx) => {
                            const imgUrl = img.startsWith('/') ? `${API_BASE}${img}` : img;
                            return <img key={idx} src={imgUrl} alt="Консоль клієнта" className={styles.tradeInThumb} onClick={() => openImageViewer(req.images, idx)} title="Натисни для перегляду" />
                          })}
                        </div>
                      )}
                    </div>
                    <div className={styles.ticketFooter}>
                      <select value={req.status} onChange={(e) => handleUpdateStatus('buyout', req._id, e.target.value, setBuyoutRequests)} className={styles.serviceStatusSelect}>
                        <option value="New">Нова заявка</option>
                        <option value="Reviewed">На розгляді</option>
                        <option value="Accepted">Готові викупити</option>
                        <option value="Rejected">Відхилено</option>
                      </select>
                      <button onClick={() => setBuyoutToDelete(req._id)} className={styles.deleteTicketBtn} title="Видалити заявку"><FaTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- МОДАЛЬНІ ВІКНА --- */}
      
      {/* Модалка Галереї */}
      {viewImages && (
        <div className={styles.imageModalOverlay} onClick={() => setViewImages(null)}>
          <div className={styles.imageModalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeImageBtn} onClick={() => setViewImages(null)}>✖</button>
            {viewImages.length > 1 && <button className={`${styles.navImgBtn} ${styles.navPrev}`} onClick={prevImage}>❮</button>}
            <img src={viewImages[currentImageIndex].startsWith('/') ? `${API_BASE}${viewImages[currentImageIndex]}` : viewImages[currentImageIndex]} alt="Full size preview" />
            {viewImages.length > 1 && <button className={`${styles.navImgBtn} ${styles.navNext}`} onClick={nextImage}>❯</button>}
            <div className={styles.imgCounter}>{currentImageIndex + 1} / {viewImages.length}</div>
          </div>
        </div>
      )}

      {/* 🔥 МОДАЛКА УПРАВЛІННЯ ВІДГУКАМИ (НОВА) */}
      {selectedProductReviews && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProductReviews(null)}>
          <div className={styles.reviewsModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.pageTitle} style={{ margin: 0, fontSize: '20px' }}>
                Відгуки: {selectedProductReviews.title}
              </h3>
              <button className={styles.closeModalBtn} onClick={() => setSelectedProductReviews(null)}>✖</button>
            </div>
            
            <div className={styles.reviewsListAdmin}>
              {(!selectedProductReviews.reviews || selectedProductReviews.reviews.length === 0) ? (
                <p className={styles.noOrders} style={{ marginTop: '30px' }}>Цей товар ще не має відгуків.</p>
              ) : (
                selectedProductReviews.reviews.map(rev => (
                  <div key={rev._id} className={styles.adminReviewCard}>
                    <div className={styles.adminReviewHeader}>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '16px' }}>{rev.name}</strong> 
                        <span style={{ color: '#ffaa00', marginLeft: '10px' }}>⭐ {rev.rating}/5</span>
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          {new Date(rev.createdAt).toLocaleString('uk-UA')}
                        </div>
                      </div>
                      <button 
                        className={styles.deleteReviewBtn} 
                        onClick={() => handleDeleteReview(selectedProductReviews._id, rev._id)}
                        title="Видалити відгук"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <p className={styles.adminReviewText}>{rev.comment}</p>
                    
                    {rev.adminReply ? (
                      <div className={styles.adminReplyBox}>
                        <strong>🎮 Ваша відповідь:</strong> 
                        <p style={{ margin: '5px 0' }}>{rev.adminReply}</p>
                        <button 
                          className={styles.editReplyBtn} 
                          onClick={() => { setReplyingToReviewId(rev._id); setReplyText(rev.adminReply); }}
                        >
                          Змінити відповідь
                        </button>
                      </div>
                    ) : (
                      replyingToReviewId === rev._id ? (
                        <div className={styles.replyInputBox}>
                          <textarea 
                            value={replyText} 
                            onChange={e => setReplyText(e.target.value)} 
                            placeholder="Напишіть відповідь клієнту..." 
                            rows="3"
                            className={styles.replyTextarea}
                          />
                          <div className={styles.replyActions}>
                            <button className={styles.saveReplyBtn} onClick={() => handleReplySubmit(selectedProductReviews._id, rev._id)}>Зберегти</button>
                            <button className={styles.cancelReplyBtn} onClick={() => setReplyingToReviewId(null)}>Скасувати</button>
                          </div>
                        </div>
                      ) : (
                        <button className={styles.addReplyBtn} onClick={() => { setReplyingToReviewId(rev._id); setReplyText(''); }}>
                          Відповісти клієнту
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалки Видалення (Order, Service, TradeIn, Buyout) */}
      {orderToDelete && (
        <div className={styles.modalOverlay} onClick={() => setOrderToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerTitle}><FaTrash /> Видалення замовлення</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setOrderToDelete(null)}>✖</button>
            </div>
            <div className={styles.modalBodyConfirm}>
              <p>Ви впевнені, що хочете видалити це замовлення? <br/><b>Цю дію неможливо скасувати!</b></p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelConfirmBtn} onClick={() => setOrderToDelete(null)}>СКАСУВАТИ</button>
                <button type="button" className={styles.deleteConfirmBtn} onClick={handleDeleteOrder}>ВИДАЛИТИ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {serviceToDelete && (
        <div className={styles.modalOverlay} onClick={() => setServiceToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerTitle}><FaTrash /> Видалення заявки на ремонт</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setServiceToDelete(null)}>✖</button>
            </div>
            <div className={styles.modalBodyConfirm}>
              <p>Ви впевнені, що хочете видалити цю заявку? <br/><b>Цю дію неможливо скасувати!</b></p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelConfirmBtn} onClick={() => setServiceToDelete(null)}>СКАСУВАТИ</button>
                <button type="button" className={styles.deleteConfirmBtn} onClick={() => confirmDeleteTicket('service-requests', serviceToDelete, setServiceRequests, setServiceToDelete)}>ВИДАЛИТИ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tradeInToDelete && (
        <div className={styles.modalOverlay} onClick={() => setTradeInToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerTitle}><FaTrash /> Видалення заявки Trade-In</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setTradeInToDelete(null)}>✖</button>
            </div>
            <div className={styles.modalBodyConfirm}>
              <p>Ви впевнені, що хочете видалити цю заявку? <br/><b>Цю дію неможливо скасувати!</b></p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelConfirmBtn} onClick={() => setTradeInToDelete(null)}>СКАСУВАТИ</button>
                <button type="button" className={styles.deleteConfirmBtn} onClick={() => confirmDeleteTicket('trade-in', tradeInToDelete, setTradeInRequests, setTradeInToDelete)}>ВИДАЛИТИ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {buyoutToDelete && (
        <div className={styles.modalOverlay} onClick={() => setBuyoutToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerTitle}><FaTrash /> Видалення заявки на Викуп</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setBuyoutToDelete(null)}>✖</button>
            </div>
            <div className={styles.modalBodyConfirm}>
              <p>Ви впевнені, що хочете видалити цю заявку? <br/><b>Цю дію неможливо скасувати!</b></p>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelConfirmBtn} onClick={() => setBuyoutToDelete(null)}>СКАСУВАТИ</button>
                <button type="button" className={styles.deleteConfirmBtn} onClick={() => confirmDeleteTicket('buyout', buyoutToDelete, setBuyoutRequests, setBuyoutToDelete)}>ВИДАЛИТИ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}