'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Car, ShoppingCart, Settings } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/listings', label: 'Listings', icon: Car },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#faf9f6] text-[#1c1917] font-semibold'
                : 'text-[#78716c] hover:bg-[#faf9f6] hover:text-[#1c1917]'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
