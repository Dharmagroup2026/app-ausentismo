import React from 'react';

export const metadata = {
  title: 'Control de Ausentismo',
  description: 'Dashboard de gestión de ausentismo laboral',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
