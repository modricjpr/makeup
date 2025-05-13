import { NextResponse } from 'next/server';

const publicKey = 'pk_8Bf-frhOdiTL99SJJ4IR4tYMVdq8V6McqRobDDyzD3yMoB4I';
const secretKey = 'sk_2wV_LUFjnpcqhfmC1FDWxG5uM1ak_i9ucGYawpZctYkMmmwK';
const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');

export async function POST(request) {
  try {
    const { amount, description, name, cpf, email, items } = await request.json();

    const payload = {
      amount, // valor em centavos
      paymentMethod: 'pix',
      pix: { expiresInDays: 1 },
      customer: {
        name,
        email,
        document: {
          type: 'cpf',
          number: (cpf || '').replace(/\D/g, '')
        }
      },
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice, // snake_case
        sku: item.code // sku ao invés de code
      })),
      description
    };

    // Log do payload enviado
    console.log('Payload enviado para Blackcat:', payload);

    const response = await fetch('https://api.blackcatpagamentos.com/v1/transactions', {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Log da resposta recebida
    console.log('Resposta da Blackcat:', data);

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao processar PIX Blackcat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 