'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import {
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Payment {
  id: string
  number: string
  amount: number
  currency: string
  status: 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'PAID' | 'CANCELLED'
  issueDate: string
  scheduledDate?: string
  paidAt?: string
  issuedByTenant: {
    id: string
    name: string
    legalName?: string
  }
  invoiceCount: number
  retentionCount: number
}

interface PaymentStats {
  totalReceived12m: number
  totalReceivedThisMonth: number
  monthlyVariation: number
  pendingAmount: number
  pendingCount: number
  scheduledAmount: number
  scheduledCount: number
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  SCHEDULED: 'Programado',
  PROCESSING: 'Procesando',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
}

export default function PagosPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tenantId') || ''
    : ''

  const fetchPayments = useCallback(async () => {
    if (!tenantId) return

    try {
      const params = new URLSearchParams({
        tenantId,
        page: page.toString(),
        limit: '20',
      })

      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }, [tenantId, page, search, statusFilter, dateFrom, dateTo])

  const fetchStats = useCallback(async () => {
    if (!tenantId) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/stats/${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [tenantId])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchPayments(), fetchStats()])
      setLoading(false)
    }
    loadData()
  }, [fetchPayments, fetchStats])

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const handleDownloadAll = async (paymentId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/download-all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pago-${paymentId}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Pagos Recibidos</h1>
          <p className="text-text-secondary mt-1">
            Gestiona los pagos y comprobantes de tus facturas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recibido (12 meses)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalReceived12m || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalReceivedThisMonth || 0)}
            </div>
            {stats?.monthlyVariation !== 0 && (
              <p
                className={`text-xs ${
                  (stats?.monthlyVariation || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(stats?.monthlyVariation || 0) >= 0 ? '+' : ''}
                {stats?.monthlyVariation}% vs mes anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendiente de Cobro
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats?.pendingAmount || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.pendingCount || 0} facturas aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos Programados
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats?.scheduledAmount || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.scheduledCount || 0} pagos próximos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex items-center gap-3">
          {/* Search - takes remaining space */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número de pago..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Status Filter - fixed width */}
          <div className="w-[250px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="PAID">Pagado</option>
              <option value="SCHEDULED">Programado</option>
              <option value="PROCESSING">Procesando</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          {/* Date From - fixed width */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Desde:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>

          {/* Date To - fixed width */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">Hasta:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Pago</TableHead>
                <TableHead>Emisor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Facturas</TableHead>
                <TableHead className="text-center">Retenciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No hay pagos registrados</p>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payment.issuedByTenant.name}
                        </p>
                        {payment.issuedByTenant.legalName && (
                          <p className="text-sm text-gray-500">
                            {payment.issuedByTenant.legalName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.issueDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                      {payment.paidAt && (
                        <p className="text-xs text-gray-500">
                          Pagado:{' '}
                          {format(new Date(payment.paidAt), 'dd/MM/yyyy', {
                            locale: es,
                          })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{payment.invoiceCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{payment.retentionCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[payment.status]}>
                        {statusLabels[payment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/pagos/${payment.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAll(payment.id)}
                          title="Descargar comprobantes"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(page - 1) * 20 + 1} -{' '}
            {Math.min(page * 20, total)} de {total} pagos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
