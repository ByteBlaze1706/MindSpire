// src/app/layout.tsx
import React from 'react';
import '../styles/globals.css';

export const metadata = {
  title: 'MindSpire - Digital Wellness Platform',
  description: 'Empowering Minds, Enabling Change.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
