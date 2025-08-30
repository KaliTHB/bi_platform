'use client';

import { useEffect } from 'react';
import { ChartPluginService } from '../plugins/charts/services/ChartPluginService';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize chart plugins on app start
    ChartPluginService.initialize().catch(console.error);
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}