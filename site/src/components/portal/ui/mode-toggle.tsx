import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRef } from 'react'
import { PORTAL_THEME_OPTIONS, type PortalTheme } from '../../../constants/portal-theme'
import { useThemeSwitch } from '../../../hooks/use-theme-switch'
import { useThemeStore } from '../../../store/theme-store'

const isPortalTheme = (value: string): value is PortalTheme =>
  PORTAL_THEME_OPTIONS.some((option) => option.value === value)

/**
 * shadcn's mode toggle: the sun turns away and shrinks as the moon turns in, driven
 * by the `dark` class on <html> — so it animates the same whether the change came
 * from this menu, the header search or the OS (under System). The `dark:` variants
 * here are that built-in animation; the palette itself still needs none.
 *
 * Picking a theme runs the switch transition (hooks/use-theme-switch.ts): the new
 * palette spreads from this button across the screen.
 */
export function ModeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const switchTheme = useThemeSwitch()
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          data-mode-toggle
          variant="ghost"
          size="icon-lg"
          className="relative text-gray-500 hover:text-gray-700"
        >
          <Sun
            data-theme-icon
            className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all motion-reduce:transition-none dark:scale-0 dark:-rotate-90"
          />
          <Moon
            data-theme-icon
            className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all motion-reduce:transition-none dark:scale-100 dark:rotate-0"
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuLabel className="text-[11px] tracking-wider text-gray-500 uppercase">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isPortalTheme(value)) switchTheme(value, triggerRef.current)
          }}
        >
          {PORTAL_THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
