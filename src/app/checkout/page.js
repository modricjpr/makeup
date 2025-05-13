'use client';
import React, { useState, useEffect } from 'react';
import { useCart } from '../../../context/CartContext';

// Adicionar Montserrat via Google Fonts
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@700&display=swap';
  link.rel = 'stylesheet';
  if (!document.head.querySelector('link[href*="Playfair+Display"]')) {
    document.head.appendChild(link);
  }
}

function maskPhone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
    .substring(0, 15); // Limita a 15 caracteres: (99) 99999-9999
}

function maskCEP(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    .substring(0, 14);
}

function isValidCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

export default function Checkout() {
  const { cart, userInfo, setUserInfo, shippingInfo, updateShippingInfo } = useCart();
  const [mensagem, setMensagem] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix-blackcat'); // Apenas Blackcat
  const [pixData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pixBlackcatData, setPixBlackcatData] = useState(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalComFrete = total + (shippingInfo.freteGratis ? 0 : shippingInfo.valorFrete);

  useEffect(() => {
    let timer;
    if (pixData?.expiresAt) {
      const expiresAt = new Date(pixData.expiresAt).getTime();
      
      timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiresAt - now;
        
        if (distance <= 0) {
          clearInterval(timer);
          setTimeLeft('Expirado');
          return;
        }
        
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pixData]);

  function handleChange(e) {
    let value = e.target.value;
    if (e.target.name === 'telefone') {
      value = maskPhone(value);
    } else if (e.target.name === 'cep') {
      value = maskCEP(value);
    } else if (e.target.name === 'cpf') {
      value = maskCPF(value);
    }
    setUserInfo({ ...userInfo, [e.target.name]: value });
  }

  async function calcularFrete(cep) {
    try {
      // Frete sempre grátis via Jadlog
      updateShippingInfo({
        ...shippingInfo,
        cep: maskCEP(cep),
        freteGratis: true,
        valorFrete: 0,
        prazoEntrega: '1-2 dias úteis',
        transportadora: 'Jadlog'
      });
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      setMensagem('Erro ao calcular frete. Tente novamente.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validar todos os campos obrigatórios
    const camposObrigatorios = {
      nome: 'Nome completo',
      rua: 'Rua',
      numero: 'Número',
      bairro: 'Bairro',
      cidade: 'Cidade',
      estado: 'Estado',
      cep: 'CEP',
      telefone: 'Telefone'
    };

    const camposFaltantes = Object.entries(camposObrigatorios)
      .filter(([campo]) => !userInfo[campo])
      .map(([_, label]) => label);

    if (camposFaltantes.length > 0) {
      setMensagem(`Por favor, preencha os seguintes campos: ${camposFaltantes.join(', ')}`);
      return;
    }

    // Validar se o CEP foi calculado
    if (!shippingInfo.cep) {
      setMensagem('Por favor, calcule o frete antes de finalizar o pedido');
      return;
    }

    // Validar formato do CEP
    if (!/^\d{5}-\d{3}$/.test(userInfo.cep)) {
      setMensagem('CEP inválido. Use o formato xxxxx-xxx');
      return;
    }

    // Validar formato do telefone
    if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(userInfo.telefone)) {
      setMensagem('Telefone inválido. Use o formato (DDD) XXXXX-XXXX');
      return;
    }

    // Validar formato do CPF
    if (!isValidCPF(userInfo.cpf)) {
      setMensagem('CPF inválido. Use o formato XXX.XXX.XXX-XX e digite um CPF válido.');
      return;
    }

    setLoading(true);
    setMensagem('');

    try {
      // Sempre usar Blackcat
      const res = await fetch('/api/blackcat/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(totalComFrete * 100),
          description: 'Pedido Empório da Make',
          name: userInfo.nome,
          cpf: userInfo.cpf,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: Math.round(item.price * 100),
            code: item.id
          })),
          email: userInfo.email
        })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Erro ao gerar PIX';
        if (typeof data.error === 'string') {
          msg = data.error;
        } else if (typeof data.error === 'object') {
          msg = JSON.stringify(data.error, null, 2);
        }
        throw new Error(msg);
      }
      setPixBlackcatData(data);
      setSuccess(true);
    } catch (error) {
      setMensagem('Erro ao processar pedido. Tente novamente.');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: `url('/wallpaper-make.jpg') center/cover no-repeat, linear-gradient(120deg, #f8bbd0 60%, #fff 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{
        maxWidth: 700,
        width: '100%',
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 24,
        boxShadow: '0 6px 24px #e7548033, 0 0 0 2px #f8bbd0',
        padding: 20,
        position: 'relative',
        border: '1.5px solid #E75480',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img
            src="/logo-emporio-make.png"
            alt="Empório da Make"
            style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 24, boxShadow: '0 4px 24px #f8bbd033', background: '#fff' }}
          />
        </div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <span style={{ color: '#E75480', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 32, letterSpacing: 1, textAlign: 'center' }}>Checkout</span>
        </div>

        {success && pixBlackcatData ? (
          <div style={{
            background: '#fff',
            padding: 24,
            borderRadius: 16,
            boxShadow: '0 2px 12px #f8bbd033',
            textAlign: 'center',
            margin: '0 auto',
            maxWidth: 400
          }}>
            <h3 style={{ color: '#E75480', fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
              Pagamento via PIX (Blackcat)
            </h3>
            <div style={{ marginBottom: 24 }}>
              {pixBlackcatData.qrCodeImageUrl && (
                <img
                  src={pixBlackcatData.qrCodeImageUrl}
                  alt="QR Code PIX"
                  style={{ width: 200, height: 200, margin: '0 auto 16px', padding: 16, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #f8bbd033' }}
                />
              )}
              <div style={{ background: '#f8bbd033', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                <p style={{ color: '#E75480', fontWeight: 600, marginBottom: 8 }}>Chave PIX Copia e Cola:</p>
                <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #F8BBD0', wordBreak: 'break-all', fontSize: 14, color: '#666' }}>
                  {pixBlackcatData.qrCodeText || pixBlackcatData.copiaecola || '---'}
                </div>
              </div>
              <div style={{ color: '#666', fontSize: 15, marginBottom: 24 }}>
                <p>Valor a pagar: <strong style={{ color: '#E75480' }}>R$ {(totalComFrete).toFixed(2)}</strong></p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixBlackcatData.qrCodeText || pixBlackcatData.copiaecola || '');
                  setMensagem('Chave PIX copiada!');
                }}
                style={{
                  background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 24,
                  padding: '12px 24px',
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                  marginBottom: 16
                }}
              >
                Copiar Chave PIX
              </button>
              <p style={{ color: '#666', fontSize: 14 }}>
                Após o pagamento, seu pedido será processado automaticamente.
              </p>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 10px' }}>
              <h3 style={{ color: '#E75480', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Endereço de Entrega</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ color: '#E75480', fontWeight: 700, marginBottom: 2, fontSize: 14 }}>Nome completo:</label>
                <input
                  type="text"
                  name="nome"
                  value={userInfo.nome || ''}
                  onChange={handleChange}
                  style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, marginBottom: 0, outline: 'none', color: '#222', fontWeight: 600, background: '#f9fafb', boxShadow: '0 1px 4px #f8bbd033', transition: 'border 0.2s', fontFamily: 'Montserrat, sans-serif' }}
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Rua:</label>
                  <input type="text" name="rua" value={userInfo.rua || ''} onChange={handleChange} placeholder="Rua" style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Número:</label>
                  <input type="text" name="numero" value={userInfo.numero || ''} onChange={handleChange} placeholder="Nº" style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Bairro:</label>
                <input type="text" name="bairro" value={userInfo.bairro || ''} onChange={handleChange} placeholder="Bairro" style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Cidade:</label>
                  <input type="text" name="cidade" value={userInfo.cidade || ''} onChange={handleChange} placeholder="Cidade" style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Estado:</label>
                  <select name="estado" value={userInfo.estado || ''} onChange={handleChange} style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif', color: userInfo.estado ? '#222' : '#888' }}>
                    <option value="">Selecione o estado</option>
                    <option value="AC">Acre (AC)</option>
                    <option value="AL">Alagoas (AL)</option>
                    <option value="AP">Amapá (AP)</option>
                    <option value="AM">Amazonas (AM)</option>
                    <option value="BA">Bahia (BA)</option>
                    <option value="CE">Ceará (CE)</option>
                    <option value="DF">Distrito Federal (DF)</option>
                    <option value="ES">Espírito Santo (ES)</option>
                    <option value="GO">Goiás (GO)</option>
                    <option value="MA">Maranhão (MA)</option>
                    <option value="MT">Mato Grosso (MT)</option>
                    <option value="MS">Mato Grosso do Sul (MS)</option>
                    <option value="MG">Minas Gerais (MG)</option>
                    <option value="PA">Pará (PA)</option>
                    <option value="PB">Paraíba (PB)</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="PE">Pernambuco (PE)</option>
                    <option value="PI">Piauí (PI)</option>
                    <option value="RJ">Rio de Janeiro (RJ)</option>
                    <option value="RN">Rio Grande do Norte (RN)</option>
                    <option value="RS">Rio Grande do Sul (RS)</option>
                    <option value="RO">Rondônia (RO)</option>
                    <option value="RR">Roraima (RR)</option>
                    <option value="SC">Santa Catarina (SC)</option>
                    <option value="SP">São Paulo (SP)</option>
                    <option value="SE">Sergipe (SE)</option>
                    <option value="TO">Tocantins (TO)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>CEP:</label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%' }}>
                  <input
                    type="text"
                    name="cep"
                    value={userInfo.cep || ''}
                    onChange={handleChange}
                    placeholder="CEP"
                    style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, background: '#f9fafb', fontFamily: 'Montserrat, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => calcularFrete(userInfo.cep)}
                    style={{
                      background: 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontWeight: 'bold',
                      fontSize: 14,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  >
                    Calcular Frete
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>Telefone:</label>
                <input
                  type="text"
                  name="telefone"
                  value={userInfo.telefone || ''}
                  onChange={handleChange}
                  style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, marginBottom: 0, outline: 'none', color: '#222', fontWeight: 600, background: '#f9fafb', boxShadow: '0 1px 4px #f8bbd033', transition: 'border 0.2s', fontFamily: 'Montserrat, sans-serif' }}
                  placeholder="(DDD) XXXXX-XXXX"
                  maxLength={15}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>CPF:</label>
                <input
                  type="text"
                  name="cpf"
                  value={userInfo.cpf || ''}
                  onChange={handleChange}
                  style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, marginBottom: 0, outline: 'none', color: '#222', fontWeight: 600, background: '#f9fafb', boxShadow: '0 1px 4px #f8bbd033', transition: 'border 0.2s', fontFamily: 'Montserrat, sans-serif' }}
                  placeholder="XXX.XXX.XXX-XX"
                  maxLength={14}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label style={{ color: '#E75480', fontWeight: 700, fontSize: 14 }}>E-mail:</label>
                <input
                  type="email"
                  name="email"
                  value={userInfo.email || ''}
                  onChange={handleChange}
                  style={{ width: '90%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E75480', fontSize: 14, marginBottom: 0, outline: 'none', color: '#222', fontWeight: 600, background: '#f9fafb', boxShadow: '0 1px 4px #f8bbd033', transition: 'border 0.2s', fontFamily: 'Montserrat, sans-serif' }}
                  placeholder="Digite seu e-mail"
                  maxLength={60}
                  autoComplete="email"
                />
              </div>

              {shippingInfo.cep && (
                <div style={{
                  background: '#f8bbd033',
                  padding: 16,
                  borderRadius: 12,
                  border: '1.5px solid #F8BBD0',
                  marginTop: 8
                }}>
                  <h4 style={{ color: '#E75480', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Informações de Entrega</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E75480', fontWeight: 600 }}>
                    <svg width="24" height="24" fill="#E75480" viewBox="0 0 24 24">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    </svg>
                    <span>Frete Grátis! 🎉</span>
                  </div>
                  <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
                    <div>Prazo de entrega: {shippingInfo.prazoEntrega}</div>
                    <div>Transportadora: {shippingInfo.transportadora}</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <h4 style={{ color: '#E75480', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Forma de Pagamento</h4>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: `2px solid ${paymentMethod === 'pix-blackcat' ? '#E75480' : '#F8BBD0'}`,
                    background: paymentMethod === 'pix-blackcat' ? '#f8bbd033' : '#fff',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="pix-blackcat"
                      checked={paymentMethod === 'pix-blackcat'}
                      onChange={() => setPaymentMethod('pix-blackcat')}
                      style={{ display: 'none' }}
                    />
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="48" rx="24" fill="#00B686"/>
                      <path d="M24 14c-2.2 0-4.3.9-5.9 2.4l-5.7 5.6c-1.3 1.3-1.3 3.4 0 4.7l5.7 5.6c1.6 1.5 3.7 2.4 5.9 2.4s4.3-.9 5.9-2.4l5.7-5.6c1.3-1.3 1.3-3.4 0-4.7l-5.7-5.6C28.3 14.9 26.2 14 24 14z" fill="#fff"/>
                    </svg>
                    <span style={{ color: '#00B686', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>PIX</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? '#ccc' : 'linear-gradient(90deg, #E75480 60%, #F8BBD0 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 24,
                  padding: '14px 0',
                  fontWeight: 'bold',
                  fontSize: 18,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px #f8bbd033',
                }}
              >
                {loading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Processando...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
                      <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zm0-2c3.87 0 7-3.13 7-7s-3.13-7-7-7-7 3.13-7 7 3.13 7 7 7zm-1-3h2v2h-2zm0-8h2v6h-2z" />
                    </svg>
                    Finalizar Pedido
                  </>
                )}
              </button>

              {mensagem && (
                <p style={{ color: '#E75480', marginTop: 6, fontWeight: 700, fontSize: 15, textAlign: 'center' }}>
                  {mensagem}
                </p>
              )}
            </form>

            <div style={{ padding: '0 12px' }}>
              <h3 style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 22, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Montserrat, sans-serif' }}>
                <svg width="22" height="22" fill="#E75480" viewBox="0 0 24 24">
                  <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zm0-2c3.87 0 7-3.13 7-7s-3.13-7-7-7-7 3.13-7 7 3.13 7 7 7zm-1-3h2v2h-2zm0-8h2v6h-2z" />
                </svg>
                Resumo do Carrinho
              </h3>

              {cart.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center' }}>Seu carrinho está vazio.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
                  <thead>
                    <tr style={{ background: '#f8bbd0', color: '#E75480', fontWeight: 700 }}>
                      <th style={{ padding: 8, borderRadius: 8, fontSize: 15, textAlign: 'left' }}>Produto</th>
                      <th style={{ padding: 8, fontSize: 15, textAlign: 'center' }}>Qtd</th>
                      <th style={{ padding: 8, fontSize: 15, textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id} style={{ background: '#fff', borderBottom: '1px solid #f8bbd0' }}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                          <img src={item.image} alt={item.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', border: '1.5px solid #F8BBD0', background: '#fff', boxShadow: '0 1px 4px #f8bbd033' }} />
                          <div>
                            <div style={{ color: '#E75480', fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                            <div style={{ color: '#888', fontSize: 12 }}>{item.brand}</div>
                            {item.selectedColor && (
                              <div style={{ color: '#E75480', fontSize: 12, fontWeight: 600 }}>
                                Cor: {item.selectedColor}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#1a1a1a', fontWeight: 700, fontSize: 15 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', color: '#1a1a1a', fontWeight: 700, fontSize: 15 }}>R$ {(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <svg width="28" height="28" fill="#E75480" viewBox="0 0 24 24">
                  <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9zm0-2c3.87 0 7-3.13 7-7s-3.13-7-7-7-7 3.13-7 7 3.13 7 7 7zm-1-3h2v2h-2zm0-8h2v6h-2z" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#666', fontSize: 15 }}>Subtotal:</span>
                    <span style={{ color: '#666', fontSize: 15 }}>R$ {total.toFixed(2)}</span>
                  </div>
                  {shippingInfo.cep && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#666', fontSize: 15 }}>Frete:</span>
                      <span style={{ color: '#666', fontSize: 15 }}>
                        {shippingInfo.freteGratis ? 'Grátis' : `R$ ${shippingInfo.valorFrete.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ color: '#E75480', fontWeight: 900, fontSize: 22 }}>Total:</span>
                    <span style={{ color: '#E75480', fontWeight: 900, fontSize: 22 }}>R$ {totalComFrete.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}