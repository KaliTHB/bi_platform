// web-application/src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic meta tags */}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#1976d2" />
        <meta 
          name="description" 
          content="BI Platform - Transform your data into actionable insights with our enterprise-grade business intelligence platform" 
        />
        <meta name="keywords" content="business intelligence, analytics, dashboard, data visualization, reporting" />
        <meta name="author" content="BI Platform Team" />
        
        {/* Favicon and manifest */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple specific */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BI Platform" />
        
        {/* Microsoft specific */}
        <meta name="msapplication-TileColor" content="#1976d2" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
        
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google Fonts - Inter (moved from _app.tsx) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        
        {/* Preload critical fonts */}
        <link 
          rel="preload" 
          href="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        
        {/* DNS prefetch for API domain */}
        <link rel="dns-prefetch" href="//localhost:3001" />
        
        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />
        
        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content="BI Platform" />
        <meta property="og:description" content="Enterprise Business Intelligence Platform" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icons/icon-512x512.png" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="BI Platform" />
        <meta name="twitter:description" content="Enterprise Business Intelligence Platform" />
        <meta name="twitter:image" content="/icons/icon-512x512.png" />
      </Head>
      <body>
        {/* Dark mode script - prevents flash of unstyled content */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (theme === 'dark' || (!theme && systemDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {
                  // Silently fail if localStorage is not available
                }
              })();
            `,
          }}
        />
        
        {/* No JavaScript fallback */}
        <noscript>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            flexDirection: 'column',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <h1 style={{ color: '#1976d2', marginBottom: '1rem' }}>BI Platform</h1>
            <p style={{ color: '#666', fontSize: '1.1rem', maxWidth: '500px' }}>
              JavaScript is required to run this application. 
              Please enable JavaScript in your browser settings and reload the page.
            </p>
          </div>
        </noscript>
        
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}