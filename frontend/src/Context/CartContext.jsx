import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('fatality_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Помилка читання кошика:", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fatality_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        toast.success(`Ще один ${product.model || product.title} у кошику!`, { 
          icon: '🎮', 
          id: `add-${product.id}` // Запобігає дублюванню тостів
        });
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      toast.success(`${product.title} додано в кошик!`, { 
        icon: '🕹️', 
        id: `add-${product.id}` 
      });
      return [...prevItems, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
    toast('Товар видалено з кошика', { icon: '🗑️', id: `remove-${id}` }); 
  }, []);

  const updateQuantity = useCallback((id, amount) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + amount;
          return { ...item, quantity: Math.max(newQuantity, 1) }; // Не дозволяє опустити менше 1
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Мемоїзація підсумкових значень для продуктивності
  const cartTotal = useMemo(() => 
    cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  , [cartItems]);
  
  const itemsCount = useMemo(() => 
    cartItems.reduce((count, item) => count + item.quantity, 0)
  , [cartItems]);

  // Мемоїзація значення контексту
  const contextValue = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    itemsCount
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemsCount]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);