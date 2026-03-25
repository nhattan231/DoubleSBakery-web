/**
 * Format số tiền VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format ngày giờ
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Map trạng thái đơn hàng
 */
export const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'gold' },
  confirmed: { label: 'Đã xác nhận', color: 'blue' },
  processing: { label: 'Đang xử lý', color: 'processing' },
  completed: { label: 'Hoàn thành', color: 'green' },
  cancelled: { label: 'Đã huỷ', color: 'red' },
};

export const poStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: 'Nháp', color: 'default' },
  confirmed: { label: 'Đã xác nhận', color: 'blue' },
  received: { label: 'Đã nhận', color: 'green' },
  cancelled: { label: 'Đã huỷ', color: 'red' },
};
