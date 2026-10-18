import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sentinel — Institutional Resource Intelligence",
  description: "University resource management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Premium font — Inter for UI, JetBrains Mono for numbers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      bg:      '#0A0908',
                      surface: '#141210',
                      elevated:'#1A1714',
                      amber:   '#D97706',
                      amberBr: '#F59E0B',
                    },
                    fontFamily: {
                      sans: ['Inter', 'system-ui', 'sans-serif'],
                      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
                    },
                    animation: {
                      'shimmer': 'shimmer 2s linear infinite',
                      'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                      'glow': 'glow 2s ease-in-out infinite alternate',
                    },
                    keyframes: {
                      shimmer: {
                        '0%':   { backgroundPosition: '-200% 0' },
                        '100%': { backgroundPosition:  '200% 0' },
                      },
                      glow: {
                        '0%':   { boxShadow: '0 0 4px #D9770644' },
                        '100%': { boxShadow: '0 0 16px #D9770688' },
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
        <style>{`
          * { box-sizing: border-box; }

          /* Scrollbar */
          ::-webkit-scrollbar       { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: #0A0908; }
          ::-webkit-scrollbar-thumb { background: #2A2520; border-radius: 99px; }
          ::-webkit-scrollbar-thumb:hover { background: #D97706; }

          /* Selection */
          ::selection { background: #D9770644; color: #F5EFE4; }

          /* Glassmorphism utility */
          .glass {
            background: rgba(20,18,16,0.7);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.06);
          }

          /* Glow card utility */
          .glow-card {
            transition: box-shadow 0.3s ease, transform 0.3s ease;
          }
          .glow-card:hover {
            box-shadow: 0 0 0 1px rgba(217,119,6,0.3), 0 8px 32px rgba(217,119,6,0.12);
            transform: translateY(-2px);
          }

          /* Shimmer button */
          .btn-shimmer {
            position: relative;
            overflow: hidden;
          }
          .btn-shimmer::after {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 60%; height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,0.15),
              transparent
            );
            transition: left 0.4s ease;
          }
          .btn-shimmer:hover::after { left: 140%; }

          /* Amber input focus ring */
          .input-amber:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(217,119,6,0.4);
          }

          /* Active sidebar item glow */
          .nav-active {
            background: rgba(217,119,6,0.1);
            border-left: 2px solid #D97706;
            box-shadow: inset 4px 0 12px rgba(217,119,6,0.08);
          }

          /* Smooth page transitions */
          .tab-enter {
            animation: tabEnter 0.2s ease forwards;
          }
          @keyframes tabEnter {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* Table row hover */
          .tr-hover {
            transition: background 0.15s ease;
          }
          .tr-hover:hover {
            background: rgba(217,119,6,0.04);
          }

          /* Status badge pulse for PENDING */
          .badge-pending {
            animation: pulse-badge 2s ease infinite;
          }
          @keyframes pulse-badge {
            0%,100% { opacity: 1; }
            50%      { opacity: 0.6; }
          }

          /* Number count-up feel */
          .num-display {
            font-family: 'JetBrains Mono', monospace;
            font-variant-numeric: tabular-nums;
          }

          /* Gradient border card */
          .grad-border {
            position: relative;
            border-radius: 12px;
          }
          .grad-border::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 12px;
            padding: 1px;
            background: linear-gradient(
              135deg,
              rgba(217,119,6,0.4) 0%,
              rgba(217,119,6,0.05) 50%,
              rgba(217,119,6,0.15) 100%
            );
            -webkit-mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }
        `}</style>
      </head>
      <body
        style={{
          background: "#0A0908",
          color: "#F5EFE4",
          fontFamily: "'Inter', system-ui, sans-serif",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
      >
        {children}
        {/* Sonner premium toasts */}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#1A1714",
              border: "1px solid #2A2520",
              color: "#F5EFE4",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}