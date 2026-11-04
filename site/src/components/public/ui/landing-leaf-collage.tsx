import { useId } from 'react'
import {
  LANDING_COLLAGE_PHOTOS,
  LANDING_MOTION,
  type LandingCollageSlot,
} from '../../../constants/landing-bulletin'

/* Outlines traced from the collage reference, in its own pixel coordinates; the
 * view box crops to the collage. The two bottom photos run past the lower edge so
 * they end in a straight cut, as they do in the reference. Each box is the photo's
 * slice-fit area around its path. */
const VIEW_BOX = '95 60 810 560'

const SLOTS: Record<
  LandingCollageSlot,
  { path: string; box: { x: number; y: number; width: number; height: number } }
> = {
  feature: {
    path: 'M357 93 C375 91 387 102 400 110 C413 118 423 129 433 143 C443 157 452 176 460 193 C468 210 477 226 483 243 C489 260 495 275 497 293 C499 311 498 336 497 350 C496 364 495 370 490 380 C485 390 476 399 467 407 C458 415 444 421 433 430 C422 439 410 451 400 463 C390 475 381 492 370 500 C359 508 345 512 333 513 C321 514 314 507 300 503 C286 499 270 497 250 490 C230 483 197 468 180 460 C163 452 159 448 150 440 C141 432 134 424 127 413 C120 402 112 387 110 373 C108 359 108 343 112 330 C116 317 125 307 133 293 C141 279 150 260 160 245 C170 230 178 219 190 205 C202 191 218 174 235 160 C252 146 270 131 290 120 C310 109 339 95 357 93 Z',
    box: { x: 110, y: 93, width: 387, height: 420 },
  },
  top: {
    path: 'M527 267 C514 266 501 258 490 250 C479 242 470 232 462 220 C454 208 447 192 443 177 C439 162 436 144 438 130 C440 116 443 102 453 93 C463 84 484 77 500 73 C516 69 533 69 550 70 C567 71 583 73 600 77 C617 81 637 86 650 93 C663 100 674 110 680 120 C686 130 688 143 688 155 C688 167 685 183 680 193 C675 203 670 210 660 217 C650 224 632 231 617 237 C602 243 582 248 567 253 C552 258 540 268 527 267 Z',
    box: { x: 438, y: 70, width: 250, height: 197 },
  },
  middle: {
    path: 'M497 300 C501 288 503 283 517 275 C531 267 561 260 583 253 C605 246 628 239 650 233 C672 227 695 220 717 219 C739 218 766 222 783 227 C800 232 807 239 817 247 C827 255 837 266 843 277 C849 288 853 299 854 310 C855 321 854 332 850 343 C846 354 841 364 833 373 C825 382 814 391 800 397 C786 403 767 408 750 410 C733 412 716 411 700 410 C684 409 672 404 655 402 C638 400 619 399 600 398 C581 397 556 398 540 398 C524 398 512 403 505 395 C498 387 496 366 495 350 C494 334 493 312 497 300 Z',
    box: { x: 495, y: 219, width: 359, height: 191 },
  },
  bottom: {
    path: 'M396 632 C386 600 379 567 378 550 C377 533 380 523 384 510 C388 497 392 483 400 470 C408 457 421 444 433 433 C445 422 457 414 470 407 C483 400 497 396 510 392 C523 388 535 387 550 386 C565 385 584 385 600 387 C616 389 633 391 643 397 C653 403 658 412 660 423 C662 434 656 449 652 463 C648 477 641 491 635 505 C629 519 624 527 618 545 C612 563 604 600 600 632 Z',
    box: { x: 378, y: 386, width: 282, height: 246 },
  },
  corner: {
    path: 'M623 632 C624 600 626 556 627 540 C630 520 634 507 640 493 C646 479 652 466 660 455 C668 444 676 434 685 428 C694 422 703 420 717 418 C731 416 750 414 767 416 C784 418 803 424 817 430 C831 436 842 443 850 453 C858 463 864 477 867 490 C870 503 867 517 865 530 C863 543 859 556 855 570 C851 584 844 610 838 632 Z',
    box: { x: 623, y: 416, width: 244, height: 216 },
  },
}

/* SVG children scale and fade about their own bounds, not the canvas origin. */
const OWN_ORIGIN = '[transform-box:fill-box] origin-center'

/** Photos pop in one after another, after the hero copy has started. */
const CELL_ENTER = `${OWN_ORIGIN} motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:fill-mode-both motion-safe:duration-700`
const HERO_LEAD_STEPS = 3

const enterDelay = (order: number) => ({
  animationDelay: `${(HERO_LEAD_STEPS + order) * LANDING_MOTION.heroStepMs}ms`,
})

export function LandingLeafCollage() {
  const idPrefix = useId()
  const clipId = (slot: LandingCollageSlot) => `${idPrefix}-${slot}`

  return (
    <svg viewBox={VIEW_BOX} className="block h-auto w-full">
      <defs>
        {LANDING_COLLAGE_PHOTOS.map(({ slot }) => (
          <clipPath key={slot} id={clipId(slot)}>
            <path d={SLOTS[slot].path} />
          </clipPath>
        ))}
      </defs>

      {LANDING_COLLAGE_PHOTOS.map((photo, index) => {
        const { path, box } = SLOTS[photo.slot]
        return (
          <g key={photo.slot} className={`${CELL_ENTER} group`} style={enterDelay(index)}>
            <title>{photo.alt}</title>
            {/* Soft halo outside the frame, then the crisp white frame over the photo. */}
            <path d={path} fill="none" stroke="white" strokeOpacity={0.3} strokeWidth={12} />
            <g clipPath={`url(#${clipId(photo.slot)})`}>
              <image
                href={photo.src}
                {...box}
                preserveAspectRatio="xMidYMid slice"
                className={`${OWN_ORIGIN} transition-transform duration-700 ease-out group-hover:scale-110`}
              />
              <path
                d={path}
                className="fill-[var(--cares-primary)] opacity-15 transition-opacity duration-500 group-hover:opacity-0"
              />
            </g>
            <path
              d={path}
              fill="none"
              strokeWidth={5}
              strokeLinejoin="round"
              className="stroke-emerald-50/90"
            />
          </g>
        )
      })}
    </svg>
  )
}
