import { 
  FaBoxes, FaDollarSign, FaUser, FaClock, FaShoppingBag, 
  FaPlusCircle, FaCloudUploadAlt, FaEdit, FaTrash, 
  FaSearch, FaTimes 
} from 'react-icons/fa';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
    title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '' 
  });
  
  const [replyText, setReplyText] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [productMsg, setProductMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  
  const [replyingToReviewId, setReplyingToReviewId] = useState(null);
  const [selectedProductReviews, setSelectedProductReviews] = useState(null);
  const [editProductId, setEditProductId] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const fileInputRef = useRef(null);

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
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/products`)
      ]);

      if (!ordersRes.ok) throw new Error(`Доступ до замовлень заборонено (${ordersRes.status})`);
      if (!productsRes.ok) throw new Error(`Помилка завантаження товарів (${productsRes.status})`);
      
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProductsList(Array.isArray(productsData) ? productsData : []);
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
        setNewProduct({ title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '' });
        setImageFiles([]); 
        setEditProductId(null); 
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        const updatedProducts = await fetch(`${API_BASE}/api/products`).then(res => res.json());
        setProductsList(Array.isArray(updatedProducts) ? updatedProducts : []);
      } else {
        toast.error('❌ Помилка при збереженні.', { id: loadingToast });
      }
    } catch (err) { 
      toast.error('Помилка сервера', { id: loadingToast }); 
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Точно видалити цей товар назавжди?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        setProductsList(prev => prev.filter(p => p._id !== id));
        toast.success('Товар назавжди видалено!');
      } else {
        toast.error("Помилка видалення товару");
      }
    } catch (err) { console.error(err); }
  };

  const handleEditClick = (product) => {
    setEditProductId(product._id);
    setNewProduct({ 
      title: product.title || '', 
      model: product.model || '', 
      price: product.price || '', 
      condition: product.condition || 'Вживана - Ідеальний стан', 
      description: product.description || '' 
    });
    setImageFiles([]); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
    setEditProductId(null); 
    setNewProduct({ title: '', model: '', price: '', condition: 'Вживана - Ідеальний стан', description: '' });
    setImageFiles([]); 
    setProductMsg('');
  };

  const handleUpdateOrderStatus = async (orderId) => {
    const statusEl = document.getElementById(`status-${orderId}`);
    const ttnEl = document.getElementById(`ttn-${orderId}`);
    if (!statusEl || !ttnEl) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: statusEl.value, trackingNumber: ttnEl.value })
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
        toast.success('Статус та ТТН успішно оновлено!');
      } else {
        toast.error('Помилка оновлення статусу.');
      }
    } catch (err) { 
        toast.error('Помилка з\'єднання з сервером.');
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    const loadingToast = toast.loading('Видалення замовлення...');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/orders/${orderToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setOrders(prev => prev.filter(o => o._id !== orderToDelete));
        toast.success('Замовлення успішно видалено!', { id: loadingToast });
      } else {
        toast.error("Помилка видалення замовлення", { id: loadingToast });
      }
    } catch (err) { 
      toast.error('Помилка сервера', { id: loadingToast }); 
    } finally {
      setOrderToDelete(null); 
    }
  };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className={`${styles.statusBadge} ${styles.paid}`}>ОПЛАЧЕНО</span>;
      case 'Processing': return <span className={`${styles.statusBadge} ${styles.processing}`}>В ОБРОБЦІ</span>; // 🔥 ДОДАНО СЮДИ
      case 'Shipped': return <span className={`${styles.statusBadge} ${styles.shipped}`}>ВІДПРАВЛЕНО</span>;
      case 'Cancelled': return <span className={`${styles.statusBadge} ${styles.cancelled}`}>СКАСОВАНО</span>;
      default: return <span className={`${styles.statusBadge} ${styles.pending}`}>ОЧІКУЄ ОПЛАТИ</span>;
    }
  };

  const handleDeleteReview = async (productId, reviewId) => {
    if (!window.confirm("Точно видалити цей відгук?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(prev => prev.map(p => p._id === productId ? data.product : p));
        setSelectedProductReviews(data.product);
        toast.success("Відгук видалено!");
      }
    } catch (err) { toast.error("Помилка видалення"); }
  };

  const handleReplyReview = async (productId, reviewId) => {
    if (!replyText.trim()) return toast.error("Введіть текст відповіді");
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/products/${productId}/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reply: replyText })
      });
      if (response.ok) {
        const data = await response.json();
        setProductsList(prev => prev.map(p => p._id === productId ? data.product : p));
        setSelectedProductReviews(data.product);
        setReplyingToReviewId(null);
        setReplyText('');
        toast.success("Відповідь опубліковано!");
      }
    } catch (err) { toast.error("Помилка відправки відповіді"); }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalSales = safeOrders.filter(o => o.status === 'Paid' || o.status === 'Shipped').reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingOrdersCount = safeOrders.filter(o => o.status === 'Pending').length;

  if (loading) return <div className={styles.centerMsg}>Ініціалізація терміналу FATALITY...</div>;
  if (error) return <div className={styles.centerMsg}>Критична помилка: {error}</div>;

  return (
    <>
      <div className={styles.adminPage}>
        <h2 className={styles.pageTitle}>Система керування</h2>

        <div className={styles.tabsWrapper}>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTab : ''}`} onClick={() => setActiveTab('orders')}>Замовлення</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`} onClick={() => setActiveTab('products')}>Управління товарами</button>
        </div>

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
                  <input
                    type="text"
                    placeholder="Пошук (Ім'я, Телефон, ID)..."
                    className={styles.adminSearchInput}
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                  />
                  {orderSearchQuery && (
                    <button type="button" className={styles.adminSearchClear} onClick={() => setOrderSearchQuery('')}>
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className={styles.filterWrapper}>
                  <label htmlFor="statusFilter">Фільтр:</label>
                  <select 
                    id="statusFilter"
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">Всі замовлення</option>
                    <option value="Pending">Очікують оплати</option>
                    <option value="Paid">Оплачені</option>
                    <option value="Shipped">Відправлені</option>
                    <option value="Cancelled">Скасовані</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.ordersList}>
              {filteredOrders.length === 0 ? (
                <p className={styles.noOrders}>
                  {safeOrders.length === 0 ? "База даних порожня." : "За вказаними критеріями замовлень не знайдено."}
                </p>
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
                          <button 
                            type="button"
                            className={styles.deleteOrderBtn} 
                            onClick={() => setOrderToDelete(order._id)}
                            title="Видалити замовлення"
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
                          <input 
                            id={`ttn-${order._id}`} 
                            type="text" 
                            placeholder="ТТН Нової Пошти" 
                            defaultValue={order.trackingNumber || ''} 
                            className={styles.ttnInput} 
                          />
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

        {activeTab === 'products' && (
          <div className={styles.tabContent}>
            <div className={styles.addProductCard}>
              <h3>
                {editProductId ? <FaEdit style={{ color: 'var(--success-color)' }} /> : <FaPlusCircle />} 
                {editProductId ? 'Редагування товару' : 'Додати нову консоль'}
              </h3>
              <form onSubmit={handleAddOrEditProduct} className={styles.productForm}>
                <div className={styles.formRow}>
                  <input 
                    type="text" 
                    placeholder="Назва (напр. Sony PlayStation 5)" 
                    required 
                    className={styles.inputField} 
                    value={newProduct.title || ''} 
                    onChange={e => setNewProduct(prev => ({...prev, title: e.target.value}))} 
                  />
                  <input 
                    type="text" 
                    placeholder="Модель (напр. PS5)" 
                    required 
                    className={styles.inputField} 
                    value={newProduct.model || ''} 
                    onChange={e => setNewProduct(prev => ({...prev, model: e.target.value}))} 
                  />
                </div>

                <div className={styles.formRow}>
                  <input 
                    type="number" 
                    placeholder="Ціна (грн)" 
                    required 
                    className={styles.inputField} 
                    value={newProduct.price || ''} 
                    onChange={e => setNewProduct(prev => ({...prev, price: e.target.value}))} 
                  />
                  <select 
                    className={styles.inputField} 
                    required 
                    value={newProduct.condition || 'Вживана - Ідеальний стан'} 
                    onChange={e => setNewProduct(prev => ({...prev, condition: e.target.value}))}
                  >
                    <option value="Нова">Нова</option>
                    <option value="Вживана - Ідеальний стан">Вживана - Ідеальний стан</option>
                    <option value="Вживана - Хороший стан">Вживана - Хороший стан</option>
                    <option value="Відновлена (Refurbished)">Відновлена (Refurbished)</option>
                  </select>
                </div>

                <div className={styles.editorWrapper}>
                  <ReactQuill 
                    theme="snow"
                    modules={quillModules}
                    value={newProduct.description || ''}
                    onChange={(content) => setNewProduct(prev => ({...prev, description: content}))}
                    placeholder="Опис товару (комплектація, гарантія, дефекти... Можна використовувати списки!)"
                  />
                </div>

                <div 
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
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
                    <button type="button" className={styles.cancelProductBtn} onClick={cancelEdit}>
                      СКАСУВАТИ
                    </button>
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
                        <Link 
                          to={`/product/${product._id}`} 
                          className={styles.adminProductLinkWrapper}
                          title="Відкрити сторінку товару"
                        >
                          <img src={validThumb || 'https://via.placeholder.com/100?text=No+Image'} alt={product.title} className={styles.adminProductThumb} />
                          <div className={styles.adminProductInfo}>
                            <h4>{product.title}</h4>
                            <span className={styles.adminProductPrice}>{product.price} грн</span>
                          </div>
                        </Link>

                        <div className={styles.adminProductActions}>
                          <button type="button" className={styles.editBtn} onClick={() => handleEditClick(product)} title="Редагувати">
                            <FaEdit />
                          </button>
                          <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteProduct(product._id)} title="Видалити">
                            <FaTrash />
                          </button>
                          <button type="button" className={styles.actionBtn} onClick={() => setSelectedProductReviews(product)}>
                            💬 Відгуки ({product.reviews?.length || 0})
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProductReviews && (
        <div className={styles.modalOverlay} onClick={() => { setSelectedProductReviews(null); setReplyingToReviewId(null); }}>
          <div className={styles.reviewsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Відгуки: {selectedProductReviews.title}</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setSelectedProductReviews(null)}>✖</button>
            </div>
            
            <div className={styles.modalBody}>
              {!selectedProductReviews.reviews || selectedProductReviews.reviews.length === 0 ? (
                <p className={styles.noReviews}>На цей товар ще немає відгуків.</p>
              ) : (
                selectedProductReviews.reviews.map(review => (
                  <div key={review._id} className={styles.adminReviewCard}>
                    <div className={styles.adminReviewHeader}>
                      <strong>{review.name}</strong>
                      <span className={styles.stars}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span>
                      <span className={styles.date}>{new Date(review.createdAt).toLocaleDateString('uk-UA')}</span>
                    </div>
                    <p className={styles.adminReviewText}>{review.comment}</p>
                    
                    {review.adminReply && (
                      <div className={styles.existingReply}>
                        <strong>Ваша відповідь:</strong> {review.adminReply}
                      </div>
                    )}

                    <div className={styles.adminReviewActions}>
                      {!review.adminReply && replyingToReviewId !== review._id && (
                        <button type="button" className={styles.replyBtn} onClick={() => setReplyingToReviewId(review._id)}>Відповісти</button>
                      )}
                      <button type="button" className={styles.deleteReviewBtn} onClick={() => handleDeleteReview(selectedProductReviews._id, review._id)}>Видалити</button>
                    </div>

                    {replyingToReviewId === review._id && (
                      <div className={styles.replyBox}>
                        <textarea 
                          placeholder="Напишіть вашу відповідь клієнту..." 
                          value={replyText} 
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className={styles.replyBoxActions}>
                          <button type="button" onClick={() => handleReplyReview(selectedProductReviews._id, review._id)}>Зберегти відповідь</button>
                          <button type="button" onClick={() => setReplyingToReviewId(null)} className={styles.cancelReplyBtn}>Скасувати</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {orderToDelete && (
        <div className={styles.modalOverlay} onClick={() => setOrderToDelete(null)}>
          <div className={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.dangerTitle}><FaTrash /> Видалення замовлення</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setOrderToDelete(null)}>✖</button>
            </div>
            
            <div className={styles.modalBodyConfirm}>
              <p>
                Ви впевнені, що хочете видалити це замовлення? <br/>
                <b>Цю дію неможливо скасувати!</b>
              </p>
              
              <div className={styles.confirmActions}>
                <button type="button" className={styles.cancelConfirmBtn} onClick={() => setOrderToDelete(null)}>СКАСУВАТИ</button>
                <button type="button" className={styles.deleteConfirmBtn} onClick={handleDeleteOrder}>ВИДАЛИТИ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}