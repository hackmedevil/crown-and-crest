import React from 'react'

export default function FullPageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-white ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white/95 animate-pulse" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Logo - simple crown SVG */}
        <div className="opacity-30">
          <svg width="120" height="120" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M6 46L12 18L22 34L32 12L42 34L52 18L58 46H6Z" fill="currentColor" />
            <rect x="6" y="46" width="52" height="8" rx="2" fill="currentColor" />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-display text-gray-800 opacity-40">Crown & Crest</h1>
          <div className="mt-3 w-40 h-3 bg-neutral-200 rounded opacity-60" />
        </div>
      </div>

      {/* Using Tailwind font stack; avoid styled-jsx so component can be used in Server Components */}
        .font-display { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
      `}</style>
    </div>
  )
}
