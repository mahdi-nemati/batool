export const InstallmentStatus = {
  UPCOMING: "UPCOMING",
  DUE: "DUE",
  OVERDUE: "OVERDUE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus];

export interface InstallmentDto {
  id: string;
  name: string;
  description: string | null;
  amountToman: number;
  totalCount: number;
  paidCount: number;
  remainingCount: number;
  dueDayOfMonth: number;
  startDate: string;
  status: InstallmentStatus;
  /** The unpaid occurrence that is "current" (1-based), or null when complete. */
  nextOccurrenceNo: number | null;
  /** Resolved scheduled due date for the next unpaid occurrence (null when complete). */
  nextDueDate: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPaymentDto {
  id: string;
  occurrenceNo: number;
  amountToman: number;
  dueDate: string;
  paidAt: string;
  financialTransactionId: string;
  description: string | null;
}

export interface InstallmentDetailDto {
  installment: InstallmentDto;
  payments: InstallmentPaymentDto[];
}
