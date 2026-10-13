import type { Metadata } from 'next'
import { AdminApp } from '@/components/admin/admin-app'

export const metadata: Metadata = {
  title: 'AvtoEmir — Панель администратора',
}

export default function AdminPage() {
  return <AdminApp />
}
