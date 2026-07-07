import { useCallback, useRef, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { REQUEST_ACCESS_MESSAGE_COLLAPSED_ROWS } from '../../../constants/request-access'

interface MessageBodyFieldProps {
  registration: UseFormRegisterReturn
  error?: string
}

export function MessageBodyField({ registration, error }: MessageBodyFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [expanded, setExpanded] = useState(false)

  const resizeToContent = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const expand = useCallback(() => {
    setExpanded(true)
    requestAnimationFrame(resizeToContent)
  }, [resizeToContent])

  const collapse = useCallback(() => {
    const el = textareaRef.current
    if (el) el.style.height = ''
    setExpanded(false)
  }, [])

  const { ref, onChange, onBlur, ...rest } = registration

  return (
    <div>
      <label htmlFor="body" className="mb-1 block text-xs font-medium text-gray-700">
        Message
      </label>
      <textarea
        id="body"
        rows={REQUEST_ACCESS_MESSAGE_COLLAPSED_ROWS}
        className={[
          'w-full resize-none rounded-md border border-gray-300 px-2.5 py-1.5 font-mono text-[11px] leading-snug transition-[height] duration-200 ease-out focus:ring-1 focus:ring-[var(--cares-primary)] focus:outline-none',
          expanded ? 'overflow-hidden' : 'overflow-y-auto',
        ].join(' ')}
        ref={(element) => {
          ref(element)
          textareaRef.current = element
        }}
        onFocus={expand}
        onClick={expand}
        onBlur={(event) => {
          onBlur(event)
          collapse()
        }}
        onChange={(event) => {
          onChange(event)
          if (expanded) requestAnimationFrame(resizeToContent)
        }}
        {...rest}
      />
      {error && <p className="mt-0.5 text-[10px] text-red-600">{error}</p>}
    </div>
  )
}
