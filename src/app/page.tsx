'use client';
import React, { useState, useEffect } from 'react';
import products from '../../data/products';
import { useCart } from '../../context/CartContext';
import Cart from './Cart';

export default function Home() {
  const [showCart, setShowCart] = useState(false);
  const { addToCart, cart } = useCart();

  const totalItens = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : 0;
  const [showCepModal, setShowCepModal] = useState(true);
  const [cep, setCep] = useState('');
  const [localizacao, setLocalizacao] = useState({ cidade: '', estado: '' });
  const [mensagem, setMensagem] = useState('');
  const [toast, setToast] = useState('');
  const [purchaseToasts, setPurchaseToasts] = useState<{ id: number; message: string }[]>([]);
  // Timer regressivo de 15 minutos
  const [timer, setTimer] = useState(15 * 60); // 15 minutos em segundos

  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});
  // Adicionar estado para o índice de início do carrossel de cores
  const [colorStartIndexes, setColorStartIndexes] = useState<Record<string, number>>({});
  // Adicionar estados auxiliares para animação do carrossel de cores
  const [colorCarouselAnimating, setColorCarouselAnimating] = useState<Record<string, boolean>>({});
  const [colorCarouselDirection, setColorCarouselDirection] = useState<Record<string, 'left' | 'right' | null>>({});
  // Estados auxiliares para swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Função para buscar cidade/estado pelo CEP usando ViaCEP
  async function buscarCep() {
    const cepNumeros = cep.replace(/\D/g, '');
    if (cepNumeros.length !== 8) {
      setMensagem('Digite um CEP válido com 8 dígitos.');
      return;
    }
    const res = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
    const data = await res.json();
    if (data.erro) {
      setMensagem('CEP não encontrado.');
    } else {
      setLocalizacao({ cidade: data.localidade, estado: data.uf });
      setMensagem(`Há uma distribuidora a 1,5km de sua residência em ${data.localidade}/${data.uf}`);
      setTimeout(() => setShowCepModal(false), 3000);
    }
  }

  // Toasts de compra aleatórios
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    function showToast() {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomPeople = Math.floor(Math.random() * 8) + 2; // 2 a 9 pessoas
      const id = Date.now() + Math.random();
      setPurchaseToasts((prev) => [
        ...prev,
        {
          id,
          message: `${randomPeople} pessoas compraram ${randomProduct.name} agora mesmo!`,
        },
      ]);
      // Remover toast após 4s
      setTimeout(() => {
        setPurchaseToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
      // Próximo toast com atraso aleatório entre 6 e 12 segundos
      const nextDelay = Math.floor(Math.random() * 6000) + 6000;
      timeout = setTimeout(showToast, nextDelay);
    }
    timeout = setTimeout(showToast, 3000); // Primeira notificação após 3s
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  function formatTimer(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Função para rolar o carrossel de cores com animação
  function animateColorCarousel(_prodId: string, direction: 'left' | 'right', colorsLength: number) {
    setColorCarouselDirection(dir => ({ ...dir, [_prodId]: direction }));
    setColorCarouselAnimating(anim => ({ ...anim, [_prodId]: true }));
    setTimeout(() => {
      setColorCarouselAnimating(anim => ({ ...anim, [_prodId]: false }));
      setColorCarouselDirection(dir => ({ ...dir, [_prodId]: null }));
      setColorStartIndexes(idx => ({
        ...idx,
        [_prodId]: direction === 'left'
          ? ((idx[_prodId] ?? 0) - 1 + colorsLength) % colorsLength
          : ((idx[_prodId] ?? 0) + 1) % colorsLength
      }));
    }, 300); // 300ms igual ao transition
  }

  // Função para lidar com swipe no carrossel de cores
  function handleTouchStart(e: React.TouchEvent, prodId: string) {
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(null);
  }
  function handleTouchMove(e: React.TouchEvent) {
    setTouchEndX(e.touches[0].clientX);
  }
  function handleTouchEnd(colorsLength: number) {
    if (touchStartX !== null && touchEndX !== null) {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 30) { // só considera swipe se for maior que 30px
        if (diff > 0) {
          // Swipe para a esquerda (próxima cor)
          animateColorCarousel('', 'right', colorsLength);
        } else {
          // Swipe para a direita (cor anterior)
          animateColorCarousel('', 'left', colorsLength);
        }
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  }

  return (
    <div>
      {/* Banner topo */}
      <div style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden', marginBottom: 24 }}>
        <img
          src="/banner-queima-estoque.png"
          alt="Queima de Estoque - 50% de desconto em todos os produtos"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Ícone centralizado abaixo do banner */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <img
          src="/logo-emporio-make.png"
          alt="Empório da Make"
          style={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 24, boxShadow: '0 4px 24px #f8bbd033', background: '#fff' }}
        />
      </div>

      {/* Localização */}
      {!showCepModal && localizacao.cidade && (
        <div style={{
          background: '#F8BBD0',
          color: '#E75480',
          padding: 8,
          textAlign: 'center',
          fontWeight: 'bold',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" fill="#E75480" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </span>
            Sua localização: {localizacao.cidade} / {localizacao.estado}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            background: '#fff',
            padding: '8px 16px',
            borderRadius: 12,
            boxShadow: '0 2px 8px #f8bbd033'
          }}>
            <svg width="24" height="24" fill="#E75480" viewBox="0 0 24 24">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
            <span>Entrega grátis via Jadlog - Entrega em 1 dia útil</span>
          </div>
        </div>
      )}

      {/* Moldura dos mais pedidos da semana */}
      <div style={{
        background: 'linear-gradient(120deg, #fff 60%, #f8bbd0 100%)',
        border: '2px solid #F8BBD0',
        borderRadius: 16,
        boxShadow: '0 2px 12px #f8bbd033',
        padding: 16,
        margin: '0 auto 20px auto',
        maxWidth: 600,
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#E75480', fontWeight: 700, fontSize: 26, marginBottom: 12 }}>Mais pedidos da semana</h2>
        <div style={{ marginBottom: 24, fontWeight: 700, fontSize: 20, color: '#E75480', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ background: '#E75480', color: '#fff', borderRadius: 8, padding: '6px 18px', fontSize: 18, letterSpacing: 1, animation: timer > 0 ? 'blink 1s infinite' : 'none' }}>
            {`Promoção acaba em: ${formatTimer(Math.max(timer, 0))}`}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {products
            .filter(p => (p.name === 'Paleta de Blush' && p.brand === 'Melu') || p.id === 'franbyfr-1' || p.id === 'brunatavares-2')
            .map(product => (
              <div key={product.id} style={{
                background: '#fff',
                borderRadius: 14,
                padding: 14,
                width: 180,
                textAlign: 'center',
                boxShadow: '0 2px 8px #f8bbd033',
                transition: 'transform 0.2s',
                cursor: 'pointer',
                marginBottom: 8,
                border: '3px solid #E75480',
                animation: 'borderBlink 1.2s infinite'
              }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: 90,
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 10,
                    marginBottom: 10
                  }}
                />
                <h3 style={{ color: '#E75480', fontSize: 18, marginBottom: 8 }}>{product.name}</h3>
                <p style={{ color: '#666', marginBottom: 16 }}>{product.brand}</p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8,
                  marginBottom: 16
                }}>
                  <span style={{ 
                    color: '#E75480', 
                    fontSize: 22, 
                    fontWeight: 700 
                  }}>
                    R$ {(product.price * 0.5).toFixed(2)}
                  </span>
                  <span style={{ 
                    color: '#999', 
                    textDecoration: 'line-through',
                    fontSize: 15
                  }}>
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    // Adicionar ao carrinho com desconto de 50%
                    addToCart({ ...product, price: product.price * 0.5 });
                  }}
                  style={{
                    background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 24,
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    fontSize: 16,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'transform 0.2s'
                  }}
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Modal de CEP */}
      {showCepModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{
            background: '#fff',
            padding: 20,
            borderRadius: 12,
            minWidth: 160,
            maxWidth: 270,
            width: '92vw',
            textAlign: 'center',
            boxShadow: '0 4px 24px #f8bbd033',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Ícone GPS animado em pé */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: 'spin 1.2s linear infinite' }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="#E75480" strokeWidth="2" fill="#fff"/>
                <circle cx="12" cy="12" r="4" stroke="#E75480" strokeWidth="2" fill="#fff"/>
                <circle cx="12" cy="12" r="2" fill="#E75480"/>
                <line x1="12" y1="2" x2="12" y2="6" stroke="#E75480" strokeWidth="2"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="#E75480" strokeWidth="2"/>
                <line x1="2" y1="12" x2="6" y2="12" stroke="#E75480" strokeWidth="2"/>
                <line x1="18" y1="12" x2="22" y2="12" stroke="#E75480" strokeWidth="2"/>
              </svg>
            </div>
            <h2 style={{ marginBottom: 12, fontSize: 16 }}>Encontre a loja mais próxima de você!</h2>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', width: 200, maxWidth: '90vw', marginLeft: 0 }}>
                <span style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#E75480',
                  fontSize: 16,
                  pointerEvents: 'none',
                  zIndex: 2
                }}>
                  <svg width="16" height="16" fill="#E75480" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Digite seu CEP"
                  value={cep}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
                    else v = v.slice(0, 8);
                    setCep(v);
                  }}
                  maxLength={9}
                  style={{
                    width: '100%',
                    maxWidth: 240,
                    minWidth: 180,
                    padding: '8px 8px 8px 32px',
                    borderRadius: 16,
                    border: '2px solid #F8BBD0',
                    outline: 'none',
                    fontSize: 14,
                    background: '#fff',
                    boxShadow: '0 2px 8px #f8bbd033',
                    color: '#E75480',
                    fontWeight: 600,
                    letterSpacing: 1,
                    transition: 'border 0.2s',
                    display: 'block',
                    marginLeft: 0
                  }}
                />
              </div>
              <button
                onClick={buscarCep}
                style={{
                  background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 16,
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  fontSize: 14,
                  boxShadow: '0 2px 8px #f8bbd033',
                  transition: 'background 0.2s, color 0.2s, transform 0.1s',
                  marginTop: 10,
                  cursor: 'pointer',
                  height: 36,
                  whiteSpace: 'nowrap',
                  width: 120,
                  alignSelf: 'center',
                }}
              >
                Verificar
              </button>
            </div>
            {mensagem && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 10,
                animation: mensagem.includes('distribuidora') ? 'fadeInScale 0.5s' : 'none',
              }}>
                {mensagem.includes('distribuidora') && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ marginBottom: 6, color: '#2ecc40', animation: 'pop 0.5s' }}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="12" fill="#2ecc40" opacity="0.15" />
                    <path d="M7 13l3 3 7-7" stroke="#2ecc40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
                <p style={{
                  marginTop: 0,
                  color: mensagem.includes('distribuidora') ? '#2ecc40' : '#E75480',
                  fontWeight: 'bold',
                  fontSize: 14,
                  textAlign: 'center',
                  transition: 'color 0.2s',
                }}>
                  {mensagem}
                </p>
                <style>{`
                  @keyframes pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    80% { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                  }
                  @keyframes fadeInScale {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      )}

      {showCart && <Cart onClose={() => setShowCart(false)} />}
      <button
        onClick={() => setShowCart(true)}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#E75480',
          color: '#fff',
          borderRadius: '50%',
          width: 48,
          height: 48,
          fontSize: 24,
          zIndex: 15,
          border: 'none',
          boxShadow: '0 2px 8px #f8bbd033',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Miniaturas dos produtos do carrinho */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', right: 54, top: 2, gap: 2 }}>
          {cart.slice(0, 3).map((item: { id: string; image: string; name: string }, idx: number) => (
            <img
              key={item.id + idx}
              src={item.image}
              alt={item.name}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #fff',
                boxShadow: '0 1px 4px #f8bbd033',
                background: '#fff',
              }}
            />
          ))}
          {cart.length > 3 && (
            <span style={{ fontSize: 10, color: '#fff', background: '#E75480', borderRadius: '50%', padding: '0 4px', marginLeft: 2, border: '1.5px solid #fff' }}>
              +{cart.length - 3}
            </span>
          )}
        </div>
        🛒
        {totalItens > 0 && (
          <span style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: '#fff',
            color: '#E75480',
            borderRadius: '50%',
            fontSize: 10,
            fontWeight: 'bold',
            minWidth: 13,
            height: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
            boxShadow: '0 1px 4px #f8bbd033',
          }}>{totalItens}</span>
        )}
      </button>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          background: '#E75480',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 8,
          boxShadow: '0 2px 8px #f8bbd033',
          zIndex: 100
        }}>
          {toast}
        </div>
      )}
      {/* Toasts de compra no canto esquerdo */}
      <div style={{ position: 'fixed', bottom: 30, left: 30, zIndex: 200 }}>
        {purchaseToasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: '#fff',
              color: '#E75480',
              border: '2px solid #F8BBD0',
              borderRadius: 16,
              boxShadow: '0 2px 16px #f8bbd033',
              padding: '8px 14px',
              marginBottom: 10,
              fontWeight: 'bold',
              fontSize: 13,
              minWidth: 120,
              maxWidth: 180,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              animation: 'fadeInToast 0.5s',
            }}
          >
            <svg width="16" height="16" fill="#E75480" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            {toast.message}
          </div>
        ))}
        <style>{`
          @keyframes fadeInToast {
            0% { opacity: 0; transform: translateY(30px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
      {/* Catálogo de Produtos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px',
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }} className="catalogo-desktop">
        {products.map(prod => (
          <div
            className="card"
            key={prod.id}
            style={{
              background: '#fff',
              border: '2.5px solid #F8BBD0',
              borderRadius: 22,
              boxShadow: '0 4px 18px #f8bbd033',
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.2s',
              position: 'relative',
              minHeight: 520,
              height: 520,
              justifyContent: 'flex-start',
              overflow: 'hidden',
              boxSizing: 'border-box',
              maxWidth: 340
            }}
          >
            {/* Carrossel de imagens */}
            {prod.images && prod.images.length > 0 ? (
              <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 16 }}>
                <img
                  src={prod.images[carouselIndexes[prod.id] || 0]}
                  alt={prod.name}
                  style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 18, boxShadow: '0 2px 12px #f8bbd033' }}
                />
                {prod.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIndexes(idx => ({
                        ...idx,
                        [prod.id]: ((idx[prod.id] || 0) - 1 + prod.images.length) % prod.images.length
                      }))}
                      style={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E75480',
                        zIndex: 2,
                        fontSize: 18,
                        padding: 0,
                        boxShadow: 'none',
                      }}
                      aria-label="Imagem anterior"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <button
                      onClick={() => setCarouselIndexes(idx => ({
                        ...idx,
                        [prod.id]: ((idx[prod.id] || 0) + 1) % prod.images.length
                      }))}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E75480',
                        zIndex: 2,
                        fontSize: 18,
                        padding: 0,
                        boxShadow: 'none',
                      }}
                      aria-label="Próxima imagem"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <img src={prod.image} alt={prod.name} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 18, marginBottom: 16, boxShadow: '0 2px 12px #f8bbd033' }} />
            )}
            <h3 style={{ color: '#E75480', fontWeight: 800, fontSize: 20, marginBottom: 6, textAlign: 'center', lineHeight: 1.15 }}>{prod.name}</h3>
            <p style={{ fontWeight: 'bold', color: '#888', marginBottom: 4, fontSize: 15, lineHeight: 1.1 }}>{prod.brand}</p>
            <p style={{ textAlign: 'center', color: '#444', fontSize: 14, marginBottom: 8, lineHeight: 1.15 }}>{prod.description}</p>
            {/* Seleção de cor, se houver */}
            {prod.colors && (
              <div
                className="menu-colors"
                style={{ position: 'relative', width: '100%', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
              >
                {prod.colors.length > 4 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      animateColorCarousel(prod.id, 'left', prod.colors.length);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E75480',
                      fontSize: 18,
                      padding: 0,
                      marginRight: 2,
                      zIndex: 2
                    }}
                    aria-label="Cor anterior"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                )}
                <div
                  className="colors-container"
                  style={{
                    display: 'flex',
                    transition: colorCarouselAnimating[prod.id] ? 'transform 0.3s cubic-bezier(.4,1.2,.6,1)' : 'none',
                    width: 4 * 28 + 3 * 8,
                    transform: colorCarouselAnimating[prod.id]
                      ? `translateX(${colorCarouselDirection[prod.id] === 'left' ? 28 + 8 : -(28 + 8)}px)`
                      : 'translateX(0)'
                  }}
                  onTouchStart={e => handleTouchStart(e, prod.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(prod.colors.length)}
                >
                  {Array.from({ length: Math.min(4, prod.colors.length) }).map((_, i) => {
                    const idx = (colorStartIndexes[prod.id] ?? 0) + i;
                    const color = prod.colors[(idx) % prod.colors.length];
                    return (
                      <button
                        key={`${color.name}-${i}`}
                        className={`menu-color-btn${selectedColors[prod.id] === color.name ? ' selected' : ''}`}
                        style={{
                          background: color.hex,
                          borderColor: selectedColors[prod.id] === color.name ? '#E75480' : '#fff',
                          display: 'inline-block'
                        }}
                        onClick={() => setSelectedColors({ ...selectedColors, [prod.id]: color.name })}
                        aria-label={color.name}
                        type="button"
                      />
                    );
                  })}
                </div>
                {prod.colors.length > 4 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      animateColorCarousel(prod.id, 'right', prod.colors.length);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E75480',
                      fontSize: 18,
                      padding: 0,
                      marginLeft: 2,
                      zIndex: 2
                    }}
                    aria-label="Próxima cor"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                )}
              </div>
            )}
            {/* Exibir nome da cor selecionada */}
            {selectedColors[prod.id] && (
              <span className="menu-color-label" style={{ fontSize: 10, color: '#E75480', fontWeight: 600, marginTop: 2, textAlign: 'center', display: 'block' }}>{selectedColors[prod.id]}</span>
            )}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '16px 0 12px' }}>
              <span style={{ textDecoration: 'line-through', color: '#888', fontSize: 15 }}>
                R$ {prod.priceOriginal.toFixed(2)}
              </span>
              <span style={{ color: '#E75480', fontWeight: 'bold', fontSize: 20 }}>
                R$ {prod.price.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => {
                if (prod.colors && !selectedColors[prod.id]) {
                  setToast('Selecione uma cor antes de adicionar ao carrinho!');
                  setTimeout(() => setToast(''), 2000);
                  return;
                }
                let image = prod.image;
                if (prod.colors && selectedColors[prod.id]) {
                  const cor = prod.colors.find(c => c.name === selectedColors[prod.id]);
                  if (cor && (cor as { image?: string }).image) image = (cor as { image?: string }).image as string;
                }
                addToCart(prod.colors ? { ...prod, selectedColor: selectedColors[prod.id], image } : prod);
                setToast(`${prod.name} adicionado ao carrinho!`);
                setTimeout(() => setToast(''), 2000);
              }}
              style={{
                background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 22,
                padding: '14px 0',
                fontWeight: 'bold',
                fontSize: 18,
                cursor: prod.colors && !selectedColors[prod.id] ? 'not-allowed' : 'pointer',
                width: '100%',
                marginTop: 'auto',
                transition: 'transform 0.2s',
                alignSelf: 'flex-end',
                opacity: prod.colors && !selectedColors[prod.id] ? 0.5 : 1
              }}
              disabled={prod.colors && !selectedColors[prod.id]}
            >
              Adicionar ao carrinho
            </button>
          </div>
        ))}
      </div>

      {/* Cardápio mobile */}
      <div className="menu-mobile" style={{ display: 'none' }}>
        {products.map(prod => (
          <div key={prod.id} className="menu-card">
            <img src={prod.image} alt={prod.name} className="menu-img" />
            <div className="menu-info">
              <h3>{prod.name}</h3>
              <p>{prod.brand}</p>
              {prod.colors && (
                <div
                  className="menu-colors"
                  style={{ position: 'relative', width: '100%', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                >
                  {prod.colors.length > 4 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        animateColorCarousel(prod.id, 'left', prod.colors.length);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E75480',
                        fontSize: 18,
                        padding: 0,
                        marginRight: 2,
                        zIndex: 2
                      }}
                      aria-label="Cor anterior"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                  )}
                  <div
                    className="colors-container"
                    style={{
                      display: 'flex',
                      transition: colorCarouselAnimating[prod.id] ? 'transform 0.3s cubic-bezier(.4,1.2,.6,1)' : 'none',
                      width: 4 * 28 + 3 * 8,
                      transform: colorCarouselAnimating[prod.id]
                        ? `translateX(${colorCarouselDirection[prod.id] === 'left' ? 28 + 8 : -(28 + 8)}px)`
                        : 'translateX(0)'
                    }}
                    onTouchStart={e => handleTouchStart(e, prod.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(prod.colors.length)}
                  >
                    {Array.from({ length: Math.min(4, prod.colors.length) }).map((_, i) => {
                      const idx = (colorStartIndexes[prod.id] ?? 0) + i;
                      const color = prod.colors[(idx) % prod.colors.length];
                      return (
                        <button
                          key={`${color.name}-${i}`}
                          className={`menu-color-btn${selectedColors[prod.id] === color.name ? ' selected' : ''}`}
                          style={{
                            background: color.hex,
                            borderColor: selectedColors[prod.id] === color.name ? '#E75480' : '#fff',
                            display: 'inline-block'
                          }}
                          onClick={() => setSelectedColors({ ...selectedColors, [prod.id]: color.name })}
                          aria-label={color.name}
                          type="button"
                        />
                      );
                    })}
                  </div>
                  {prod.colors.length > 4 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        animateColorCarousel(prod.id, 'right', prod.colors.length);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        width: 24,
                        height: 24,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E75480',
                        fontSize: 18,
                        padding: 0,
                        marginLeft: 2,
                        zIndex: 2
                      }}
                      aria-label="Próxima cor"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E75480" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  )}
                </div>
              )}
              {selectedColors[prod.id] && (
                <span className="menu-color-label" style={{ fontSize: 10, color: '#E75480', fontWeight: 600, marginTop: 2, textAlign: 'center', display: 'block' }}>{selectedColors[prod.id]}</span>
              )}
              <span className="menu-price">R$ {prod.price.toFixed(2)}</span>
              <button
                onClick={() => {
                  if (prod.colors && !selectedColors[prod.id]) {
                    setToast('Selecione uma cor antes de adicionar ao carrinho!');
                    setTimeout(() => setToast(''), 2000);
                    return;
                  }
                  let image = prod.image;
                  if (prod.colors && selectedColors[prod.id]) {
                    const cor = prod.colors.find(c => c.name === selectedColors[prod.id]);
                    if (cor && (cor as { image?: string }).image) image = (cor as { image?: string }).image as string;
                  }
                  addToCart(prod.colors ? { ...prod, selectedColor: selectedColors[prod.id], image } : prod);
                  setToast(`${prod.name} adicionado ao carrinho!`);
                  setTimeout(() => setToast(''), 2000);
                }}
                className="menu-btn"
                type="button"
                disabled={prod.colors && !selectedColors[prod.id]}
                style={{
                  opacity: prod.colors && !selectedColors[prod.id] ? 0.5 : 1,
                  cursor: prod.colors && !selectedColors[prod.id] ? 'not-allowed' : 'pointer'
                }}
              >Adicionar</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes borderBlink {
          0% { box-shadow: 0 0 0 0 #E75480, 0 4px 24px #f8bbd033; border-color: #E75480; }
          50% { box-shadow: 0 0 16px 4px #E75480, 0 4px 24px #f8bbd033; border-color: #F8BBD0; }
          100% { box-shadow: 0 0 0 0 #E75480, 0 4px 24px #f8bbd033; border-color: #E75480; }
        }

        .product-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 600px) {
          .catalogo-desktop {
            display: none !important;
          }
          .menu-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 16px;
            padding: 12px;
          }
          .menu-card {
            display: flex;
            align-items: center;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 2px 8px #f8bbd033;
            padding: 12px;
            gap: 16px;
          }
          .menu-img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 2px 8px #f8bbd033;
          }
          .menu-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .menu-price {
            color: #E75480;
            font-weight: bold;
            font-size: 18px;
            margin: 4px 0;
          }
          .menu-btn {
            background: linear-gradient(90deg, #E75480 60%, #F8BBD0 100%);
            color: #fff;
            border: none;
            border-radius: 24px;
            padding: 8px 16px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            margin-top: 4px;
          }
          .menu-colors {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 4px 0 2px 0;
          }
          .menu-color-btn {
            border: 2px solid #fff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            margin: 0 2px;
            cursor: pointer;
            outline: none;
            display: flex;
            alignItems: center;
            justifyContent: center;
            transition: border 0.2s, box-shadow 0.2s;
            box-shadow: 0 1px 4px #f8bbd033;
            padding: 0;
          }
          .menu-color-btn.selected {
            border: 2.5px solid #E75480;
            box-shadow: 0 0 0 2px #F8BBD0;
          }
          .menu-color-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 1.5px solid #fff;
            display: inline-block;
          }
          .menu-color-label {
            font-size: 13px;
            color: #E75480;
            font-weight: 600;
            margin-bottom: 2px;
            display: block;
          }
          .menu-colors::-webkit-scrollbar { display: none; }
        }

        @media (min-width: 601px) {
          .menu-colors {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 8px;
            margin: 10px 0 10px 0;
            justify-content: center;
            align-items: center;
            max-width: 270px;
            padding-bottom: 2px;
            position: relative;
            overflow: hidden;
          }
          .colors-container {
            display: flex;
            gap: 8px;
            transition: transform 0.3s ease-in-out;
            padding: 0 4px;
            width: 100%;
            justify-content: flex-start;
            transform: translateX(0);
          }
          .menu-color-btn {
            border: 2.5px solid #fff;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            min-width: 22px;
            min-height: 22px;
            max-width: 22px;
            max-height: 22px;
            margin: 0 3px;
            cursor: pointer;
            outline: none;
            display: inline-block;
            transition: border 0.2s, box-shadow 0.2s;
            box-shadow: 0 1px 4px #f8bbd033;
            padding: 0;
            background-clip: padding-box;
            flex-shrink: 0;
          }
          .menu-color-btn.selected {
            border: 3px solid #E75480;
            box-shadow: 0 0 0 2px #F8BBD0;
          }
          .menu-color-label {
            font-size: 16px;
            color: #E75480;
            font-weight: 700;
            margin-bottom: 4px;
            display: block;
            text-align: center;
          }
          .menu-colors button[aria-label="Cor anterior"],
          .menu-colors button[aria-label="Próxima cor"] {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: #fff;
            border: 2px solid #F8BBD0;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            alignItems: center;
            justifyContent: center;
            cursor: pointer;
            z-index: 2;
            box-shadow: 0 2px 8px #f8bbd033;
            transition: all 0.2s ease;
          }
          .menu-colors button[aria-label="Cor anterior"] {
            left: -4px;
          }
          .menu-colors button[aria-label="Próxima cor"] {
            right: -4px;
          }
          .menu-colors button[aria-label="Cor anterior"]:hover,
          .menu-colors button[aria-label="Próxima cor"]:hover {
            background: #F8BBD0;
            border-color: #E75480;
          }
        }
      `}</style>
    </div>
  );
}