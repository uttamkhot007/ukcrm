import { Sun, Moon, Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, ThemeBrand, ThemeMood } from '@/hooks/useTheme';

const brandOptions: { value: ThemeBrand; label: string; color: string }[] = [
  { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
  { value: 'blue', label: 'Sapphire', color: 'bg-blue-500' },
  { value: 'purple', label: 'Amethyst', color: 'bg-purple-500' },
  { value: 'orange', label: 'Amber', color: 'bg-orange-500' },
];

const moodOptions: { value: ThemeMood; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Standard theme' },
  { value: 'ocean', label: 'Ocean', description: 'Deep blue tones' },
  { value: 'forest', label: 'Forest', description: 'Natural greens' },
  { value: 'sunset', label: 'Sunset', description: 'Warm gradients' },
  { value: 'midnight', label: 'Midnight', description: 'Ultra dark' },
  { value: 'cyber', label: 'Cyber', description: 'Neon dashboard' },
];

export function ThemeSwitcher() {
  const { theme, toggleMode, setBrand, setMood } = useTheme();

  return (
    <div className="flex items-center gap-1">
      {/* Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="h-9 w-9"
        title={theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme.mode === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Brand Color Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Choose brand color">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Brand Color</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme.brand} onValueChange={(v) => setBrand(v as ThemeBrand)}>
            {brandOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="gap-2">
                <span className={`h-3 w-3 rounded-full ${option.color}`} />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mood Theme Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Choose mood theme">
            <Sparkles className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Mood Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme.mood} onValueChange={(v) => setMood(v as ThemeMood)}>
            {moodOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="flex-col items-start">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
