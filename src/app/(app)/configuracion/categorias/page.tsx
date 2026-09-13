import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import { EditCategoryDialog } from '@/components/categories/edit-category-dialog';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategories, type Category } from '@/lib/data/categories';

function CategoryRow({ category, editable }: { category: Category; editable: boolean }) {
  const Icon = getCategoryIcon(category.icon);

  return (
    <li className="border-border flex items-center gap-3 rounded-md border px-3 py-2">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- Icon viene de un mapa fijo (CATEGORY_ICONS), es una referencia estable, no un componente nuevo por render */}
        <Icon size={16} />
      </span>
      <span className="text-sm font-medium">{category.name}</span>
      {editable && <EditCategoryDialog category={category} />}
    </li>
  );
}

export default async function CategoriasPage() {
  const categories = await getCategories();
  const globalCategories = categories.filter((c) => c.user_id === null);
  const customCategories = categories.filter((c) => c.user_id !== null);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Las categorías predefinidas no se pueden editar ni borrar. Puedes crear las tuyas
            propias.
          </p>
        </div>
        <CreateCategoryDialog />
      </div>

      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Predefinidas</h2>
        <ul className="space-y-1">
          {globalCategories.map((category) => (
            <CategoryRow key={category.id} category={category} editable={false} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Tus categorías</h2>
        {customCategories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no has creado ninguna categoría propia.
          </p>
        ) : (
          <ul className="space-y-1">
            {customCategories.map((category) => (
              <CategoryRow key={category.id} category={category} editable />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
