import type { CSSProperties } from 'react'
import { EVALUATION_FONT_META, EVALUATION_FONT_SIZE_META } from '../constants/evaluation'
import type { EvaluationTypography } from '../types/evaluation'

/** Inline styles for a title and its helper text under one typography setting. */
export function typographyStyles(typography: EvaluationTypography): {
  title: CSSProperties
  body: CSSProperties
} {
  const family = EVALUATION_FONT_META[typography.fontFamily].stack
  const size = EVALUATION_FONT_SIZE_META[typography.fontSize]
  return {
    title: { fontFamily: family, fontSize: size.titlePx },
    body: { fontFamily: family, fontSize: size.bodyPx },
  }
}
