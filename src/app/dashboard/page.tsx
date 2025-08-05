import { Metadata } from 'next'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const metadata: Metadata = {
  title: 'Tableau de bord - InvoiceComply',
  description: 'Gérez vos factures électroniques en conformité avec la réglementation française',
}

// Force dynamic rendering to prevent build-time authentication issues
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return <DashboardContent />
}