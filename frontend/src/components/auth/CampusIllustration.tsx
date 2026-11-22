import type { ReactNode } from 'react'

// Original artwork, coloured from the design tokens.

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-3 0h6v15h-6z" className="fill-ink" />
      <path d="M0-58 17-30H9L24-6Q0 5-24-6L-9-30h-8z" className="fill-forest" />
      <path d="M0-58-17-30h8L-24-6q12 6 24 6z" className="fill-leaf" opacity=".35" />
    </g>
  )
}

function Sticker({ x, y, rotate, fill, children }: { x: number; y: number; rotate: number; fill: string; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <g className="sticker">
        <circle r="49" className="fill-surface" />
        <circle r="42" className={fill} />
        {children}
      </g>
    </g>
  )
}

export function CampusIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 410" className={className} aria-hidden="true" focusable="false">
      {/* ground */}
      <path d="M64 245c-8-62 70-119 171-130 119-13 271 24 301 98 32 78-54 159-216 168-139 8-247-58-256-136z" className="fill-forest" opacity=".3" />
      <path d="M64 231c-8-62 70-119 171-130 119-13 271 24 301 98 32 78-54 159-216 168-139 8-247-58-256-136z" className="fill-leaf" />
      <path d="M382 246c26-21 87-19 101 8 12 25-24 48-64 45-38-3-60-31-37-53z" className="fill-sky" />
      <path d="M415 269q12-7 24 0t24 0" className="stroke-surface" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* trail */}
      <path d="M163 317C267 353 365 327 331 278S188 243 222 207s70-11 91-38" className="stroke-butter" strokeWidth="25" strokeLinecap="round" fill="none" />
      <path d="M163 317C267 353 365 327 331 278S188 243 222 207s70-11 91-38" className="stroke-coral" strokeWidth="3" strokeDasharray="1 11" strokeLinecap="round" fill="none" />

      {/* campus building */}
      <g transform="translate(249 70)">
        <path d="M0 30h130v75H0z" className="fill-paper" />
        <path d="M130 30l25 12v55l-25 8z" className="fill-line" />
        <path d="M-8 20h138l31 15v10l-31-13H-8z" className="fill-coral" />
        <path d="M12 44h22v17H12zM42 44h22v17H42zM72 44h22v17H72zM102 44h18v17h-18zM12 72h22v17H12zM102 72h18v17h-18z" className="fill-sky" />
        <path d="M51 105V78q15-18 30 0v27z" className="fill-ink" />
      </g>

      <Pine x={215} y={151} />
      <Pine x={183} y={170} scale={0.75} />
      <Pine x={443} y={180} />
      <Pine x={478} y={205} scale={0.72} />
      <Pine x={124} y={247} scale={0.9} />
      <Pine x={151} y={268} scale={0.6} />
      <Pine x={384} y={343} scale={0.8} />

      {/* hidden gift */}
      <g transform="translate(266 271)">
        <path d="M-22-15h44v37q-22 7-44 0z" className="fill-sun" />
        <path d="M-27-24h54v14h-54z" className="fill-sun stroke-ink" strokeWidth="2" />
        <path d="M-5-24H5v49H-5z" className="fill-coral" />
        <path d="M0-25c-25 1-25-22-10-20 8 1 10 20 10 20s2-19 10-20c15-2 15 21-10 20z" className="fill-coral" />
        <path d="m-43-38 9 7m77-7-9 7M0-62v-10" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* stickers: campus cat, tea, compass, leaf */}
      <Sticker x={100} y={101} rotate={-9} fill="fill-lilac">
        <path d="M-25 8-23-27-9-17q9-3 18 0l14-10 2 35c0 28-50 28-50 0z" className="fill-ink" />
        <path d="M-14-3q4-6 8 0M6-3q4-6 8 0" className="stroke-sun" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M-3 7h6L0 11z" className="fill-blush" />
        <path d="M-31 5l14 4m-14 7 14-3M31 5 17 9m14 7-14-3" className="stroke-surface" strokeWidth="1.5" strokeLinecap="round" />
      </Sticker>
      <Sticker x={519} y={92} rotate={8} fill="fill-blush">
        <path d="M-16-25h32c2 14-6 17-6 23s7 11 4 21h-28c-3-10 4-15 4-21s-8-9-6-23z" className="fill-surface" />
        <path d="M-12-16h24c0 8-6 10-6 14s6 11 4 17h-20c-2-6 4-13 4-17s-6-6-6-14z" className="fill-coral" />
        <ellipse cy="22" rx="27" ry="6" className="fill-surface stroke-ink" strokeWidth="3" />
        <path d="M-6-30q-5-4 0-8m12 8q-5-4 0-8" className="stroke-ink" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </Sticker>
      <Sticker x={529} y={335} rotate={10} fill="fill-butter">
        <circle r="27" className="fill-surface stroke-ink" strokeWidth="5" />
        <path d="M14-16 6 6-6-6z" className="fill-coral" />
        <path d="M-14 16-6-6 6 6z" className="fill-forest" />
      </Sticker>
      <Sticker x={77} y={342} rotate={-6} fill="fill-sky">
        <path d="M-17 23C-34-6-9-29 25-26 29 7 10 31-17 23z" className="fill-forest" />
        <path d="M-25 30Q-9 4 14-15M-7 6l-2-16m10 8 17 1" className="stroke-mint" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </Sticker>
    </svg>
  )
}
