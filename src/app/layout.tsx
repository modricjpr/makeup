import '../../styles/globals.css';
import { CartProvider } from '../../context/CartContext';
import React from 'react';

export const metadata = {
  title: 'Empório da Make',
  description: 'Distribuidora de maquiagem',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}