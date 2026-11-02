import type {
  OrderStatus,
  OrderType,
  PaymentStatus,
  RenewalPlanStatus,
} from '@/domains/contracts/backend-enums'
import type { MoneyAmount } from '@/domains/catalog/models'

export interface OrderSummaryViewModel {
  id: string
  orderCode: string
  orderType: OrderType
  status: OrderStatus
  itemTitle: string
  amountVnd: MoneyAmount
  createdAt: string
  paymentStatus: PaymentStatus
}

export interface RenewalPlanViewModel {
  id: string
  title: string
  durationMonths: number
  priceVnd: MoneyAmount
  status: RenewalPlanStatus
}

export type CouponValidationViewModel =
  | { kind: 'valid'; code: string; discountAmountVnd: MoneyAmount; message: string }
  | { kind: 'invalid'; code: string; message: string; status?: number }
