import { ArrowLeftRight, LayoutDashboard, PiggyBank, Receipt, Settings } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { href: '/gastos-fijos', label: 'Gastos Fijos', icon: Receipt },
  { href: '/presupuestos', label: 'Presupuestos', icon: PiggyBank },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];
