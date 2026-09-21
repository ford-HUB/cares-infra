import type { EvaluationForm, EvaluationTypography } from '../../../types/evaluation'
import { TypographyControls } from './typography-controls'
import { typographyStyles } from '../../../utils/evaluation-typography'

interface FormHeaderCardProps {
  form: EvaluationForm
  active: boolean
  onActivate: () => void
  onChange: (patch: Partial<Pick<EvaluationForm, 'title' | 'description'>>) => void
  onTypographyChange: (patch: Partial<EvaluationTypography>) => void
}

/** The form's title block — the purple-topped card in Forms, here in the CARES accent. */
export function FormHeaderCard({
  form,
  active,
  onActivate,
  onChange,
  onTypographyChange,
}: FormHeaderCardProps) {
  const styles = typographyStyles(form.headerTypography)

  return (
    <div
      role="group"
      aria-label="Form header"
      onClick={onActivate}
      onFocusCapture={onActivate}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
        active ? 'border-[var(--cares-primary)]' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="h-2.5 bg-[var(--cares-primary)]" />
      <div className="px-5 py-4">
        <input
          aria-label="Form title"
          value={form.title}
          placeholder="Untitled form"
          onChange={(event) => onChange({ title: event.target.value })}
          style={styles.title}
          className="w-full border-b border-transparent bg-transparent py-1 font-semibold text-gray-900 placeholder:text-gray-400 hover:border-gray-200 focus:border-[var(--cares-primary)] focus:outline-none"
        />
        <textarea
          aria-label="Form description"
          value={form.description}
          placeholder="Form description"
          rows={2}
          onChange={(event) => onChange({ description: event.target.value })}
          style={styles.body}
          className="mt-1 w-full resize-none border-b border-transparent bg-transparent py-1 text-gray-600 placeholder:text-gray-400 hover:border-gray-200 focus:border-[var(--cares-primary)] focus:outline-none"
        />

        {active && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <span className="text-[11px] tracking-wider text-gray-500 uppercase">
              Header text
            </span>
            <TypographyControls
              label="Form header"
              value={form.headerTypography}
              onChange={onTypographyChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
