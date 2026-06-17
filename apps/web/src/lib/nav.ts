/**
 * Shared navigation config — single source consumed by the sidebar, the ⌘K
 * command palette, and breadcrumbs so they never drift.
 */
import {
  Building2,
  LayoutDashboard,
  Package,
  ClipboardList,
  Inbox,
  Calendar,
  CalendarClock,
  Warehouse,
  BarChart3,
  FileUp,
  Sparkles,
  Users,
  Webhook,
  Bell,
  KeyRound,
  ScrollText,
  Clock,
  Shield,
  DollarSign,
  FileText,
  Plus,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** Optional key for a live count badge resolved by the sidebar. */
  badge?: 'overdueWorkOrders' | 'pendingRequests'
}

export const primaryNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/dashboard/assets', icon: Package },
  { name: 'Work Orders', href: '/dashboard/work-orders', icon: ClipboardList, badge: 'overdueWorkOrders' },
  { name: 'Work Requests', href: '/dashboard/work-requests', icon: Inbox, badge: 'pendingRequests' },
  { name: 'Dispatch', href: '/dashboard/dispatch', icon: Users },
  { name: 'PM Plans', href: '/dashboard/pm', icon: Calendar },
  { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarClock },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Data Import', href: '/dashboard/imports', icon: FileUp },
  { name: 'AI Assistant', href: '/dashboard/ai', icon: Sparkles },
]

export const settingsSubNav: NavItem[] = [
  { name: 'Organization', href: '/dashboard/settings', icon: Building2 },
  { name: 'Members', href: '/dashboard/settings/members', icon: Users },
  { name: 'Teams', href: '/dashboard/settings/teams', icon: Users },
  { name: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Webhook },
  { name: 'API Keys', href: '/dashboard/settings/api-keys', icon: KeyRound },
  { name: 'Audit Log', href: '/dashboard/settings/audit-log', icon: ScrollText },
  { name: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
  { name: 'Scheduled Reports', href: '/dashboard/settings/scheduled-reports', icon: CalendarClock },
]

export const reportSubNav: NavItem[] = [
  { name: 'Downtime', href: '/dashboard/reports/downtime', icon: Clock },
  { name: 'Warranties', href: '/dashboard/reports/warranties', icon: Shield },
  { name: 'Budgets', href: '/dashboard/reports/budgets', icon: DollarSign },
  { name: 'Contracts', href: '/dashboard/inventory/contracts', icon: FileText },
]

export interface QuickCreateItem {
  name: string
  href: string
  icon: LucideIcon
  keywords?: string
}

export const quickCreate: QuickCreateItem[] = [
  { name: 'New Work Order', href: '/dashboard/work-orders/new', icon: ClipboardList, keywords: 'wo create job task' },
  { name: 'New Asset', href: '/dashboard/assets/new', icon: Package, keywords: 'equipment machine create' },
  { name: 'New PM Plan', href: '/dashboard/pm/new', icon: Calendar, keywords: 'preventive maintenance schedule' },
  { name: 'New Part', href: '/dashboard/inventory/parts/new', icon: Warehouse, keywords: 'inventory spare stock' },
  { name: 'New Purchase Order', href: '/dashboard/inventory/purchase-orders/new', icon: FileText, keywords: 'po procurement buy' },
]

export { Plus }

/**
 * Best-effort human label for a path segment, used by breadcrumbs. Known
 * top-level destinations resolve to their nav label; otherwise the segment is
 * title-cased. Dynamic id segments are handled by the breadcrumb component.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'work-orders': 'Work Orders',
  'work-requests': 'Work Requests',
  dispatch: 'Dispatch',
  pm: 'PM Plans',
  assets: 'Assets',
  inventory: 'Inventory',
  reports: 'Reports',
  imports: 'Data Import',
  ai: 'AI Assistant',
  calendar: 'Calendar',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  'purchase-orders': 'Purchase Orders',
  'scheduled-reports': 'Scheduled Reports',
  parts: 'Parts',
  contracts: 'Contracts',
  storerooms: 'Storerooms',
  suppliers: 'Suppliers',
  transactions: 'Transactions',
  templates: 'Templates',
  'api-keys': 'API Keys',
  'audit-log': 'Audit Log',
  notifications: 'Notifications',
}

export function labelForSegment(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
