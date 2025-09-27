// PDF Generation utilities for legal case management
// Using HTML to PDF conversion for Cloudflare Workers

export interface InvoiceData {
  id: number
  invoice_number: string
  case_title: string
  client_name: string
  billing_period: string
  time_entries: Array<{
    date: string
    description: string
    hours: number
    rate: number
    amount: number
    lawyer_name: string
  }>
  expenses: Array<{
    date: string
    description: string
    amount: number
  }>
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  due_date: string
  firm_info: {
    name: string
    address: string
    phone: string
    email: string
  }
}

export interface CaseTimelineData {
  case_info: {
    case_number: string
    title: string
    client_name: string
    primary_officer: string
    case_type: string
    status: string
    filing_date: string
    court_name: string
  }
  timeline_events: Array<{
    date: string
    time?: string
    type: string
    title: string
    description: string
    created_by: string
  }>
  deadlines: Array<{
    due_date: string
    title: string
    description: string
    priority: string
    status: string
  }>
  time_entries: Array<{
    date: string
    lawyer: string
    description: string
    hours: number
    billable: boolean
  }>
  total_billable_hours: number
}

// Generate HTML for invoice PDF
export function generateInvoiceHTML(data: InvoiceData): string {
  const timeEntriesHTML = data.time_entries.map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.description}</td>
      <td>${entry.lawyer_name}</td>
      <td style="text-align: right;">${entry.hours}</td>
      <td style="text-align: right;">$${entry.rate.toFixed(2)}</td>
      <td style="text-align: right;">$${entry.amount.toFixed(2)}</td>
    </tr>
  `).join('')

  const expensesHTML = data.expenses.map(expense => `
    <tr>
      <td>${expense.date}</td>
      <td colspan="4">${expense.description}</td>
      <td style="text-align: right;">$${expense.amount.toFixed(2)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${data.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .firm-info { float: left; }
        .invoice-info { float: right; text-align: right; }
        .clear { clear: both; }
        .client-info { margin: 30px 0; }
        .invoice-details { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: bold; }
        .totals { float: right; width: 300px; margin-top: 20px; }
        .totals table { margin: 0; }
        .total-row { font-weight: bold; background: #f3f4f6; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="firm-info">
          <h1>${data.firm_info.name}</h1>
          <p>${data.firm_info.address}</p>
          <p>Phone: ${data.firm_info.phone}</p>
          <p>Email: ${data.firm_info.email}</p>
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <p><strong>Invoice #:</strong> ${data.invoice_number}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${data.due_date}</p>
        </div>
        <div class="clear"></div>
      </div>

      <div class="client-info">
        <h3>Bill To:</h3>
        <p><strong>${data.client_name}</strong></p>
        <p>Re: ${data.case_title}</p>
      </div>

      <div class="invoice-details">
        <p><strong>Billing Period:</strong> ${data.billing_period}</p>
        <p><strong>Case:</strong> ${data.case_title}</p>
      </div>

      <h3>Time Entries</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Attorney</th>
            <th style="text-align: right;">Hours</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${timeEntriesHTML}
        </tbody>
      </table>

      ${data.expenses.length > 0 ? `
        <h3>Expenses</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th colspan="4">Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expensesHTML}
          </tbody>
        </table>
      ` : ''}

      <div class="totals">
        <table>
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td style="text-align: right;">$${data.subtotal.toFixed(2)}</td>
          </tr>
          ${data.tax_rate > 0 ? `
            <tr>
              <td>Tax (${(data.tax_rate * 100).toFixed(1)}%):</td>
              <td style="text-align: right;">$${data.tax_amount.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Total:</strong></td>
            <td style="text-align: right;"><strong>$${data.total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="clear"></div>

      <div class="footer">
        <p>Thank you for your business. Please remit payment by the due date.</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `
}

// Generate HTML for case timeline PDF
export function generateCaseTimelineHTML(data: CaseTimelineData): string {
  const timelineHTML = data.timeline_events.map(event => `
    <tr>
      <td>${event.date}${event.time ? ` ${event.time}` : ''}</td>
      <td>${event.type}</td>
      <td>${event.title}</td>
      <td>${event.description}</td>
      <td>${event.created_by}</td>
    </tr>
  `).join('')

  const deadlinesHTML = data.deadlines.map(deadline => `
    <tr>
      <td>${deadline.due_date}</td>
      <td>${deadline.title}</td>
      <td>${deadline.description}</td>
      <td>
        <span class="priority-${deadline.priority.toLowerCase()}">${deadline.priority}</span>
      </td>
      <td>
        <span class="status-${deadline.status.toLowerCase()}">${deadline.status}</span>
      </td>
    </tr>
  `).join('')

  const timeEntriesHTML = data.time_entries.map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.lawyer}</td>
      <td>${entry.description}</td>
      <td style="text-align: right;">${entry.hours}</td>
      <td style="text-align: center;">${entry.billable ? 'Yes' : 'No'}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Case Timeline - ${data.case_info.case_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.4; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .case-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .case-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        th { background: #f3f4f6; font-weight: bold; }
        .priority-high { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .priority-medium { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .priority-low { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .status-completed { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .status-pending { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .summary-box { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        @media print {
          body { margin: 0; font-size: 12px; }
          .case-info-grid { display: block; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Case Timeline Report</h1>
        <h2>${data.case_info.case_number}: ${data.case_info.title}</h2>
      </div>

      <div class="case-info">
        <div class="case-info-grid">
          <div>
            <p><strong>Client:</strong> ${data.case_info.client_name}</p>
            <p><strong>Case Type:</strong> ${data.case_info.case_type}</p>
            <p><strong>Filing Date:</strong> ${data.case_info.filing_date}</p>
          </div>
          <div>
            <p><strong>Primary Attorney:</strong> ${data.case_info.primary_officer}</p>
            <p><strong>Status:</strong> ${data.case_info.status}</p>
            <p><strong>Court:</strong> ${data.case_info.court_name || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div class="summary-box">
        <p><strong>Total Billable Hours:</strong> ${data.total_billable_hours} hours</p>
        <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>Case Timeline</h2>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Type</th>
              <th>Title</th>
              <th>Description</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            ${timelineHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Deadlines & Milestones</h2>
        <table>
          <thead>
            <tr>
              <th>Due Date</th>
              <th>Title</th>
              <th>Description</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${deadlinesHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Time Entries</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Attorney</th>
              <th>Description</th>
              <th style="text-align: right;">Hours</th>
              <th style="text-align: center;">Billable</th>
            </tr>
          </thead>
          <tbody>
            ${timeEntriesHTML}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>Case Timeline Report - ${data.case_info.case_number}</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `
}

// Convert HTML to PDF (mock implementation for Cloudflare Workers)
// In production, you would use a service like Puppeteer or a PDF API
export function generatePDFResponse(html: string, filename: string): Response {
  // For now, return HTML that can be printed as PDF by browser
  // In production deployment, integrate with PDF generation service
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="${filename}.html"`,
      'X-PDF-Ready': 'true' // Custom header to indicate this is ready for PDF conversion
    }
  })
}

// Sample firm information
export const SAMPLE_FIRM_INFO = {
  name: 'Capital Chambers Legal',
  address: '123 Legal Street, Suite 500\nLaw City, LC 12345',
  phone: '(555) 123-4567',
  email: 'billing@capitalchambers.com'
}