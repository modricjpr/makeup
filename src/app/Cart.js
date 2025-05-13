'use client';
import React from 'react';
import { useCart } from '../../context/CartContext';

export default function Cart({ onClose }) {
  const { cart, removeFromCart, updateQuantity } = useCart();
  
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 370, height: '100vh',
      background: 'linear-gradient(120deg, #fff 60%, #f8bbd0 100%)',
      boxShadow: '-2px 0 16px #e7548033', zIndex: 20, padding: 0, display: 'flex', flexDirection: 'column', borderTopLeftRadius: 24, borderBottomLeftRadius: 24
    }}>
      <div style={{ padding: 24, borderBottom: '1.5px solid #F8BBD0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: '#E75480', fontWeight: 700, fontSize: 24, margin: 0 }}>Seu Carrinho</h2>
        <button onClick={onClose} style={{ background: 'none', color: '#E75480', border: 'none', fontSize: 28, cursor: 'pointer', fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {cart.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 48 }}>O carrinho está vazio.</p>
        ) : (
          <div>
            {cart.map(item => (
              <div key={item.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #f8bbd033', marginBottom: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.2s' }}>
                <img src={item.image} alt={item.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #F8BBD0', background: '#fff', marginRight: 8, transition: 'transform 0.2s', boxShadow: '0 1px 8px #f8bbd033' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 16, color: '#E75480' }}>{item.name}</strong>
                  {item.selectedColor && (
                    <div style={{ color: '#E75480', fontSize: 13, fontWeight: 600, margin: '2px 0 4px' }}>
                      Cor: {item.selectedColor}
                    </div>
                  )}
                  <div style={{ margin: '6px 0 2px', color: '#888', fontSize: 13 }}>{item.brand}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>Qtd:</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateQuantity(item.id, Number(e.target.value))}
                      style={{ width: 40, borderRadius: 8, border: '1px solid #F8BBD0', padding: '2px 6px', fontSize: 14 }}
                    />
                    <span style={{ color: '#E75480', fontWeight: 600, fontSize: 15 }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} style={{ background: '#fff', color: '#E75480', border: '1.5px solid #F8BBD0', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s, color 0.2s' }} title="Remover">
                  <span style={{ fontWeight: 700, fontSize: 20, lineHeight: 1 }}>×</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ borderTop: '1.5px solid #F8BBD0', padding: 24, background: '#fff', borderBottomLeftRadius: 24 }}>
        <h3 style={{ color: '#E75480', fontWeight: 700, fontSize: 20, margin: 0, marginBottom: 12 }}>Total: <span style={{ color: '#333', fontWeight: 700 }}>R$ {total.toFixed(2)}</span></h3>
        {cart.length > 0 ? (
          <a href="/checkout">
            <button style={{ width: '100%', marginTop: 12, background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 0', fontWeight: 'bold', fontSize: 18, boxShadow: '0 2px 8px #f8bbd033', transition: 'background 0.2s, color 0.2s, transform 0.1s', cursor: 'pointer' }}>Finalizar Compra</button>
          </a>
        ) : (
          <button disabled style={{ width: '100%', marginTop: 12, background: '#ccc', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 0', fontWeight: 'bold', fontSize: 18, boxShadow: '0 2px 8px #f8bbd033', cursor: 'not-allowed' }}>Adicione um item ao carrinho</button>
        )}
      </div>
      <style>{`
        ::-webkit-scrollbar { width: 8px; background: #f8bbd033; border-radius: 8px; }
        ::-webkit-scrollbar-thumb { background: #F8BBD0; border-radius: 8px; }
      `}</style>
    </div>
  );
}