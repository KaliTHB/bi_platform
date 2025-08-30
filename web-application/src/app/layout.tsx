'use client';
import { useEffect } from 'react';
import { ChartPluginService } from '../plugins/charts/services/ChartPluginService';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize chart plugins on app startup
    const chartService = ChartPluginService.getInstance();
    chartService.initialize();
  }, []);

  return (
    <html lang="en">
      <body>
        {/* Your existing layout content */}
        {children}
      </body>
    </html>
  );
}