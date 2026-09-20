'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { createCategory } from '@/app/(app)/configuracion/categorias/actions';
import { CategoryFormFields } from '@/components/categories/category-form-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CATEGORY_COLOR_PRESETS, initialCategoryState } from '@/lib/validations/category';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creando…' : 'Crear categoría'}
    </Button>
  );
}

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string>(CATEGORY_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>('shapes');
  const [isEssential, setIsEssential] = useState(false);
  const [state, formAction] = useActionState(createCategory, initialCategoryState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Categoría creada.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nueva categoría</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>Elige un nombre, un ícono y un color.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <CategoryFormFields
            icon={icon}
            onIconChange={setIcon}
            color={color}
            onColorChange={setColor}
            isEssential={isEssential}
            onEssentialChange={setIsEssential}
          />

          {state.status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
