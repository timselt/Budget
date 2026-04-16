export type CollectionRiskLevel = 'Low' | 'Medium' | 'High'
export type ImportPeriodStatus = 'Processing' | 'Completed' | 'Failed'
export type InvoiceCollectionStatus = 'Overdue' | 'Pending' | 'Paid'

export interface ConsolidatedDashboard {
  totalReceivable: number
  totalOverdue: number
  totalPending: number
  overdueRatio: number
  segments: SegmentSummary[]
  topOverdueCustomers: TopOverdueCustomer[]
  riskDistribution: RiskDistribution
}

export interface SegmentSummary {
  segmentId: number
  segmentName: string
  totalReceivable: number
  overdue: number
  pending: number
  overdueRatio: number
  customerCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
}

export interface SegmentDashboard {
  summary: SegmentSummary
  customers: CustomerCollectionRow[]
  topOverdue: TopOverdueCustomer[]
  topPending: TopOverdueCustomer[]
  concentration: Concentration
}

export interface CustomerCollectionRow {
  rank: number
  customerId: number
  customerName: string
  accountNo: string | null
  totalReceivable: number
  overdue: number
  pending: number
  overdueRatio: number
  sharePercent: number
  riskLevel: CollectionRiskLevel
  avgDelayDays: number
}

export interface TopOverdueCustomer {
  customerId: number
  customerName: string
  amount: number
  sharePercent: number
}

export interface RiskDistribution {
  highCount: number
  mediumCount: number
  lowCount: number
  highAmount: number
  mediumAmount: number
  lowAmount: number
}

export interface Concentration {
  top5Share: number
  top10Share: number
}

export interface CustomerInvoiceDetail {
  invoiceNo: string
  transactionDate: string
  dueDate: string
  daysDiff: number
  amount: number
  note: string | null
  status: InvoiceCollectionStatus
}

export interface ImportPeriod {
  id: number
  segmentId: number
  segmentName: string
  importDate: string
  fileName: string
  periodLabel: string | null
  totalAmount: number
  overdueAmount: number
  pendingAmount: number
  status: ImportPeriodStatus
}

export interface ImportResult {
  periodId: number
  customersProcessed: number
  invoicesProcessed: number
  totalAmount: number
  warnings: string[]
}
