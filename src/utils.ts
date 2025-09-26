// Utility functions for Legal Case Management System

/**
 * Generate a unique case number based on case type and current date
 */
export function generateCaseNumber(caseType: string): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const day = String(new Date().getDate()).padStart(2, '0')
  
  // Create case type prefix
  const typePrefix = getCaseTypePrefix(caseType)
  
  // Generate random number for uniqueness
  const randomSuffix = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  
  return `${year}-${typePrefix}-${month}${day}-${randomSuffix}`
}

/**
 * Get case type prefix for case number generation
 */
function getCaseTypePrefix(caseType: string): string {
  const prefixes: { [key: string]: string } = {
    'Civil Litigation': 'CV',
    'Criminal Defense': 'CR',
    'Corporate Law': 'CO',
    'Family Law': 'FA',
    'Personal Injury': 'PI',
    'Real Estate': 'RE',
    'Employment Law': 'EM',
    'Intellectual Property': 'IP',
    'Immigration': 'IM',
    'Tax Law': 'TX',
    'Bankruptcy': 'BK',
    'Estate Planning': 'ES'
  }
  
  return prefixes[caseType] || 'GN' // General case type
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get priority color class for Tailwind CSS
 */
export function getPriorityColor(priority: string): string {
  const colors: { [key: string]: string } = {
    'Low': 'text-green-600 bg-green-100',
    'Medium': 'text-yellow-600 bg-yellow-100',
    'High': 'text-red-600 bg-red-100',
    'Critical': 'text-red-800 bg-red-200',
    'Urgent': 'text-red-900 bg-red-300'
  }
  
  return colors[priority] || 'text-gray-600 bg-gray-100'
}

/**
 * Get status color class for Tailwind CSS
 */
export function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    'New': 'text-blue-600 bg-blue-100',
    'Active': 'text-green-600 bg-green-100',
    'On Hold': 'text-yellow-600 bg-yellow-100',
    'Settled': 'text-purple-600 bg-purple-100',
    'Won': 'text-green-700 bg-green-200',
    'Lost': 'text-red-600 bg-red-100',
    'Closed': 'text-gray-600 bg-gray-100'
  }
  
  return colors[status] || 'text-gray-600 bg-gray-100'
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(dueDateString: string): number {
  const dueDate = new Date(dueDateString)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if deadline is overdue
 */
export function isOverdue(dueDateString: string): boolean {
  return getDaysUntilDeadline(dueDateString) < 0
}

/**
 * Check if deadline is urgent (within 3 days)
 */
export function isUrgent(dueDateString: string): boolean {
  const days = getDaysUntilDeadline(dueDateString)
  return days >= 0 && days <= 3
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
  return phoneRegex.test(phone)
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

/**
 * Convert time string to minutes
 */
export function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Calculate billable amount
 */
export function calculateBillableAmount(hours: number, rate: number): number {
  return parseFloat((hours * rate).toFixed(2))
}