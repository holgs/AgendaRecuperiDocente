export type UserRole = 'admin' | 'docente' | 'viewer'

export interface User {
  id: string
  email: string
  role: UserRole
  name?: string
}

export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
}

// Role-based permissions configuration
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to all resources
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'teachers', action: 'create' },
    { resource: 'teachers', action: 'read' },
    { resource: 'teachers', action: 'update' },
    { resource: 'teachers', action: 'delete' },
    { resource: 'budgets', action: 'create' },
    { resource: 'budgets', action: 'read' },
    { resource: 'budgets', action: 'update' },
    { resource: 'budgets', action: 'delete' },
    { resource: 'activities', action: 'create' },
    { resource: 'activities', action: 'read' },
    { resource: 'activities', action: 'update' },
    { resource: 'activities', action: 'delete' },
    { resource: 'recovery-types', action: 'create' },
    { resource: 'recovery-types', action: 'read' },
    { resource: 'recovery-types', action: 'update' },
    { resource: 'recovery-types', action: 'delete' },
    { resource: 'reports', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
  docente: [
    // Limited access - own data only
    { resource: 'teachers', action: 'read' }, // Own profile only
    { resource: 'teachers', action: 'update' }, // Own profile only
    { resource: 'budgets', action: 'read' }, // Own budget only
    { resource: 'activities', action: 'create' }, // Own activities only
    { resource: 'activities', action: 'read' }, // Own activities only
    { resource: 'activities', action: 'update' }, // Own activities only (if pending)
    { resource: 'recovery-types', action: 'read' },
    { resource: 'reports', action: 'read' }, // Own reports only
  ],
  viewer: [
    // Read-only access to most resources
    { resource: 'teachers', action: 'read' },
    { resource: 'budgets', action: 'read' },
    { resource: 'activities', action: 'read' },
    { resource: 'recovery-types', action: 'read' },
    { resource: 'reports', action: 'read' },
  ],
}

export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: Permission['action']
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions.some(
    (permission) =>
      permission.resource === resource && permission.action === action
  )
}

export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  // Route to permission mapping
  const routePermissions: Record<string, { resource: string; action: Permission['action'] }> = {
    '/dashboard': { resource: 'activities', action: 'read' },
    '/teachers': { resource: 'teachers', action: 'read' },
    '/activities': { resource: 'activities', action: 'read' },
    '/recovery-types': { resource: 'recovery-types', action: 'read' },
    '/reports': { resource: 'reports', action: 'read' },
    '/users': { resource: 'users', action: 'read' },
    '/settings': { resource: 'settings', action: 'read' },
  }

  const permission = routePermissions[pathname]
  if (!permission) return false

  return hasPermission(userRole, permission.resource, permission.action)
}

export function getNavigationItems(userRole: UserRole) {
  const allItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'Home',
      requiredPermission: { resource: 'activities', action: 'read' as const },
    },
    {
      name: 'Docenti',
      href: '/teachers',
      icon: 'GraduationCap',
      requiredPermission: { resource: 'teachers', action: 'read' as const },
    },
    {
      name: 'Attività',
      href: '/activities',
      icon: 'ClipboardList',
      requiredPermission: { resource: 'activities', action: 'read' as const },
    },
    {
      name: 'Tipologie',
      href: '/recovery-types',
      icon: 'FileText',
      requiredPermission: { resource: 'recovery-types', action: 'read' as const },
    },
    {
      name: 'Report',
      href: '/reports',
      icon: 'BarChart3',
      requiredPermission: { resource: 'reports', action: 'read' as const },
    },
    {
      name: 'Utenti',
      href: '/users',
      icon: 'Users',
      requiredPermission: { resource: 'users', action: 'read' as const },
    },
    {
      name: 'Impostazioni',
      href: '/settings',
      icon: 'Settings',
      requiredPermission: { resource: 'settings', action: 'read' as const },
    },
  ]

  return allItems.filter((item) =>
    hasPermission(userRole, item.requiredPermission.resource, item.requiredPermission.action)
  )
}

export function getUserRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Amministratore',
    docente: 'Docente',
    viewer: 'Visualizzatore',
  }
  return labels[role] || role
}

export function getUserRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-800',
    docente: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}