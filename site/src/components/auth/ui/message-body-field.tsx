import { useCallback, useRef, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { MessageSquareText } from 'lucide-react'

import { REQUEST_ACCESS_MESSAGE_COLLAPSED_ROWS } from '../../../constants/request-access'
import { RequestFieldLabel } from './request-field-label'

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
      <RequestFieldLabel icon={MessageSquareText} htmlFor="body">
        Message
      </RequestFieldLabel>
      <textarea
        id="body"
        rows={REQUEST_ACCESS_MESSAGE_COLLAPSED_ROWS}
        className={[
          'w-full resize-none rounded-lg border border-emerald-900/15 bg-white px-3 py-2 font-mono text-[11px] leading-snug shadow-sm transition-[height] duration-200 ease-out focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 focus:outline-none',
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
