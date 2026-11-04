import type { ReactNode } from 'react'

/* Geometry and colours adapted from devices.css's MacBook Pro
 * (https://github.com/picturepan2/devices.css, MIT License, Copyright (c) 2017 Yan Zhu),
 * which is fixed at 740px wide. `u` turns its pixel values into shares of this frame's
 * own width, so the laptop scales without a transform and the video's controls keep
 * their normal size. */
const u = (designPx: number) => `calc(100cqw * ${designPx} / 740)`

const FOOT_OFFSET = 300
const FOOT_COLOUR = '#272727'
const PANEL_COLOUR = '#0d0d0d'

function Foot({ side }: { side: -1 | 1 }) {
  return (
    <span
      className="absolute left-1/2"
      style={{
        bottom: u(-2),
        height: u(2),
        width: u(40),
        marginLeft: u(side * FOOT_OFFSET - 20),
        background: FOOT_COLOUR,
        borderRadius: `0 0 ${u(3)} ${u(3)}`,
      }}
    />
  )
}

/** A front-on MacBook Pro: black panel with notch and chin around a 16:10 screen that
 *  holds `children`, on a wider aluminium base with a thumb cut-out and rubber feet. */
export function LandingMacbookFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative [container-type:inline-size]">
      <div
        className="relative mx-auto"
        style={{
          width: u(618),
          height: u(418),
          padding: `${u(9)} ${u(9)} ${u(23)}`,
          borderRadius: u(20),
          background: PANEL_COLOUR,
          boxShadow: `inset 0 0 0 ${u(1.5)} #c8cacc`,
        }}
      >
        <div
          className="relative aspect-[16/10] w-full overflow-hidden bg-black"
          style={{
            border: `${u(2)} solid #121212`,
            borderRadius: `${u(10)} ${u(10)} 0 0`,
          }}
        >
          {children}
        </div>

        {/* Notch, with the small inward curves where it meets the top of the screen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center"
          style={{
            top: u(11),
            width: u(64),
            height: u(12),
            background: PANEL_COLOUR,
            borderRadius: `0 0 ${u(4)} ${u(4)}`,
          }}
        >
          <span
            className="absolute top-0"
            style={{
              left: u(-4),
              width: u(4),
              height: u(4),
              background: `radial-gradient(circle at bottom left, transparent 75%, ${PANEL_COLOUR} 75%)`,
            }}
          />
          <span
            className="absolute top-0"
            style={{
              right: u(-4),
              width: u(4),
              height: u(4),
              background: `radial-gradient(circle at bottom right, transparent 75%, ${PANEL_COLOUR} 75%)`,
            }}
          />
          <span className="rounded-full bg-[#1d2733]" style={{ width: u(3), height: u(3) }} />
        </div>

        {/* Chin below the screen. */}
        <div
          aria-hidden
          className="absolute"
          style={{
            bottom: u(2),
            left: u(2),
            width: u(614),
            height: u(24),
            background: `linear-gradient(to bottom, ${FOOT_COLOUR}, ${PANEL_COLOUR})`,
            borderRadius: `0 0 ${u(20)} ${u(20)}`,
          }}
        />
      </div>

      <div
        aria-hidden
        className="relative z-10"
        style={{
          height: u(24),
          marginTop: u(-10),
          background: 'linear-gradient(to bottom, #f4f5f6, #d9dbdd 40%, #b7babd)',
          border: 'solid #9da1a5',
          borderWidth: `${u(1)} ${u(2)} 0`,
          borderRadius: `${u(2)} ${u(2)} ${u(12)} ${u(12)}`,
          boxShadow: `inset 0 ${u(-2)} ${u(8)} 0 #6b7074`,
        }}
      >
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: u(120),
            height: u(10),
            background: '#e2e3e4',
            borderRadius: `0 0 ${u(10)} ${u(10)}`,
            boxShadow: `inset 0 0 ${u(4)} ${u(2)} #b9bcbe`,
          }}
        />
        <Foot side={-1} />
        <Foot side={1} />
      </div>
    </div>
  )
}
