'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [userInfo, setUserInfo] = useState({
    nome: '',
    endereco: '',
    telefone: '',
  });
  const [shippingInfo, setShippingInfo] = useState({
    cep: '',
    cidade: '',
    estado: '',
    freteGratis: false,
    valorFrete: 0,
    prazoEntrega: '',
    transportadora: ''
  });

  // Carregar carrinho do localStorage ao iniciar
  useEffect(() => {
    const stored = localStorage.getItem('cart');
    if (stored) setCart(JSON.parse(stored));
  }, []);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  function addToCart(product) {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id && item.selectedColor === product.selectedColor);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id && item.selectedColor === product.selectedColor
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    console.log('Removendo item com ID:', productId);
    setCart((prev) => {
      if (!productId) {
        console.error('ID do produto não fornecido');
        return prev;
      }
      const newCart = prev.filter((item) => item.id !== productId);
      console.log('Novo carrinho após remoção:', newCart);
      return newCart;
    });
  }

  function updateQuantity(productId, quantity) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  function updateShippingInfo(info) {
    setShippingInfo(info);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        userInfo,
        setUserInfo,
        shippingInfo,
        updateShippingInfo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}