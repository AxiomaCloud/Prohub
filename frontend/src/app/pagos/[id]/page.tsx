'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  ArrowLeft,
  Download,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Receipt,
  FileCheck,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PaymentItem {
  id: string
  amount: number
  document: {
    id: string
    number: string
    type: string
    amount: number
    taxAmount: number
    totalAmount: number
    date: string
    fileUrl?: string
    fileName?: string
  }
}

interface Retention {
  type: string
  nombre?: string
  number: string
  amount: number
  porcentaje?: number
  fileUrl?: string
  createdAt: string
}

interface PaymentDetail {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  issueDate: string
  scheduledDate?: string
  paidAt?: string
  receiptUrl?: string
  issuedByTenant: {
    id: string
    name: string
    legalName?: string
    taxId?: string
    address?: string
    phone?: string
    email?: string
  }
  receivedByTenant: {
    id: string
    name: string
    legalName?: string
    taxId?: string
  }
  items: PaymentItem[]
  retentions: Retention[]
  invoiceCount: number
  retentionCount: number
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

const retentionTypeLabels: Record<string, string> = {
  IIBB: 'Ret. IIBB',
  GANANCIAS: 'Ret. Ganancias',
  IVA: 'Ret. IVA',
  SUSS: 'Ret. SUSS',
  OTHER: 'Otra Retención',
}

export default function PaymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setPayment(data.payment)
        }
      } catch (error) {
        console.error('Error fetching payment:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPayment()
    }
  }, [params.id])

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const handleDownloadAll = async () => {
    if (!payment) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${payment.id}/download-all`,
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
        a.download = `pago-${payment.number}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading:', error)
    }
  }

  const openDocument = (url?: string) => {
    if (url) {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}${url}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              Pago no encontrado
            </h3>
            <p className="text-gray-500 mt-2">
              El pago que buscas no existe o no tienes acceso.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/pagos')}
            >
              Volver a Pagos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate totals
  const totalFacturas = payment.items.reduce(
    (sum, item) => sum + item.document.totalAmount,
    0
  )
  const totalRetenciones = payment.retentions.reduce(
    (sum, ret) => sum + ret.amount,
    0
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/pagos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pago {payment.number}</h1>
            <p className="text-gray-500">
              {format(new Date(payment.issueDate), "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${statusColors[payment.status]} text-sm px-3 py-1`}>
            {statusLabels[payment.status]}
          </Badge>
          <Button onClick={handleDownloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Todo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto Total</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Facturas Incluidas</p>
                <p className="text-xl font-bold">{payment.invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Retenciones</p>
                <p className="text-xl font-bold">{payment.retentionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Pago</p>
                <p className="text-xl font-bold">
                  {payment.paidAt
                    ? format(new Date(payment.paidAt), 'dd/MM/yyyy')
                    : payment.scheduledDate
                    ? format(new Date(payment.scheduledDate), 'dd/MM/yyyy')
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList>
              <TabsTrigger value="invoices">
                Facturas ({payment.invoiceCount})
              </TabsTrigger>
              <TabsTrigger value="retentions">
                Retenciones ({payment.retentionCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payment.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">
                              No hay facturas asociadas
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        payment.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {item.document.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.document.number}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(item.document.date),
                                'dd/MM/yyyy'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.document.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.document.taxAmount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.document.totalAmount)}
                            </TableCell>
                            <TableCell>
                              {item.document.fileUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    openDocument(item.document.fileUrl)
                                  }
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {payment.items.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Total Facturas
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(totalFacturas)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retentions">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-center">Porcentaje</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payment.retentions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">
                              No hay retenciones asociadas
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        payment.retentions.map((ret, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="secondary">
                                {retentionTypeLabels[ret.type] || ret.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {ret.nombre || retentionTypeLabels[ret.type] || ret.type}
                              </span>
                              {ret.number && ret.number !== `RET-${index + 1}` && (
                                <span className="text-gray-500 text-sm ml-2">
                                  ({ret.number})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {ret.porcentaje != null ? (
                                <span className="text-gray-600">
                                  {(ret.porcentaje * 100).toFixed(1)}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              -{formatCurrency(ret.amount)}
                            </TableCell>
                            <TableCell>
                              {ret.fileUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDocument(ret.fileUrl)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {payment.retentions.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Total Retenciones
                          </p>
                          <p className="text-lg font-bold text-red-600">
                            -{formatCurrency(totalRetenciones)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Payment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Facturas</span>
                  <span className="font-medium">
                    {formatCurrency(totalFacturas)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Retenciones</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(totalRetenciones)}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold">Neto a Pagar</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Issuer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Emisor del Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Razón Social</p>
                <p className="font-medium">
                  {payment.issuedByTenant.legalName ||
                    payment.issuedByTenant.name}
                </p>
              </div>
              {payment.issuedByTenant.taxId && (
                <div>
                  <p className="text-sm text-gray-500">CUIT</p>
                  <p className="font-medium">{payment.issuedByTenant.taxId}</p>
                </div>
              )}
              {payment.issuedByTenant.address && (
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="font-medium">
                    {payment.issuedByTenant.address}
                  </p>
                </div>
              )}
              {payment.issuedByTenant.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{payment.issuedByTenant.email}</p>
                </div>
              )}
              {payment.issuedByTenant.phone && (
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{payment.issuedByTenant.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt */}
          {payment.receiptUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Recibo de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openDocument(payment.receiptUrl)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ver Recibo
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-px h-full bg-gray-200"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pago emitido</p>
                    <p className="text-xs text-gray-500">
                      {format(
                        new Date(payment.issueDate),
                        "d MMM yyyy 'a las' HH:mm",
                        { locale: es }
                      )}
                    </p>
                  </div>
                </div>

                {payment.scheduledDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="w-px h-full bg-gray-200"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Programado para</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.scheduledDate), 'd MMM yyyy', {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {payment.paidAt && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pago efectuado</p>
                      <p className="text-xs text-gray-500">
                        {format(
                          new Date(payment.paidAt),
                          "d MMM yyyy 'a las' HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
