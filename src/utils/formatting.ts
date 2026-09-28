// Format number as GHC currency
export function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toFixed(2)}`;
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for database storage
export function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get today's date string
export function getTodayString(): string {
  return formatDateForDB(new Date());
}

// Format date and time
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
