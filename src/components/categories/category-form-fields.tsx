'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CATEGORY_ICONS, getCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { CATEGORY_COLOR_PRESETS } from '@/lib/validations/category';

interface CategoryFormFieldsProps {
  defaultName?: string;
  icon: string;
  onIconChange: (icon: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  isEssential: boolean;
  onEssentialChange: (isEssential: boolean) => void;
}

export function CategoryFormFields({
  defaultName,
  icon,
  onIconChange,
  color,
  onColorChange,
  isEssential,
  onEssentialChange,
}: CategoryFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" maxLength={40} defaultValue={defaultName} required />
      </div>

      <div className="space-y-2">
        <Label>Tipo de gasto</Label>
        <input type="hidden" name="isEssential" value={isEssential ? 'true' : 'false'} />
        <div className="bg-secondary inline-flex rounded-full p-1">
          <button
            type="button"
            onClick={() => onEssentialChange(false)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              !isEssential ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
            )}
          >
            Discrecional
          </button>
          <button
            type="button"
            onClick={() => onEssentialChange(true)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isEssential ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground',
            )}
          >
            Esencial
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          Lo esencial (vivienda, salud…) no cuenta como dinero disponible para ocio en las
          Recomendaciones del dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Ícono</Label>
        <input type="hidden" name="icon" value={icon} />
        <div className="grid grid-cols-8 gap-3">
          {Object.keys(CATEGORY_ICONS).map((key) => {
            const IconOption = getCategoryIcon(key);
            const isSelected = icon === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onIconChange(key)}
                aria-label={key}
                aria-pressed={isSelected}
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl border transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-secondary/60',
                )}
              >
                <IconOption size={16} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-3">
          {CATEGORY_COLOR_PRESETS.map((preset) => {
            const isSelected = color === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onColorChange(preset)}
                aria-label={preset}
                aria-pressed={isSelected}
                className={cn(
                  'size-8 rounded-full border-2 transition-transform',
                  isSelected ? 'border-foreground scale-110' : 'border-transparent',
                )}
                style={{ backgroundColor: preset }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
