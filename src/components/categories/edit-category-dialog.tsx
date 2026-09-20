'use client';

import { Pencil } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { updateCategory } from '@/app/(app)/configuracion/categorias/actions';
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
import type { Category } from '@/lib/data/categories';
import { initialCategoryState } from '@/lib/validations/category';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </Button>
  );
}

export function EditCategoryDialog({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string>(category.color);
  const [icon, setIcon] = useState<string>(category.icon);
  const [isEssential, setIsEssential] = useState(category.is_essential);
  const [state, formAction] = useActionState(updateCategory, initialCategoryState);

  useEffect(() => {
    if (state.status !== 'success') return;
    toast.success(state.message ?? 'Categoría actualizada.');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el modal es una reacción legítima al resultado de la Server Action, no puede calcularse durante el render
    setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Editar ${category.name}`}
          className="ml-auto"
        >
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
          <DialogDescription>Cambia el nombre, el ícono o el color.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id" value={category.id} />
          <CategoryFormFields
            defaultName={category.name}
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
