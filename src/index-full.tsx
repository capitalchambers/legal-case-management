import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types'
import { generateCaseNumber } from './utils'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// =============================================================================
// DASHBOARD API
// =============================================================================

app.get('/api/dashboard', async (c) => {
  try {
    const { DB } = c.env

    // Get dashboard statistics
    const [
      totalCases,
      activeCases,
      totalClients,
      upcomingDeadlines,
      upcomingHearings,
      billableHours,
      pendingInvoices
    ] = await Promise.all([
      DB.prepare('SELECT COUNT(*) as count FROM cases').first(),
      DB.prepare('SELECT COUNT(*) as count FROM cases c JOIN case_statuses s ON c.status_id = s.id WHERE s.name IN (?, ?)').bind('New', 'Active').first(),
      DB.prepare('SELECT COUNT(*) as count FROM clients WHERE active = TRUE').first(),
      DB.prepare('SELECT COUNT(*) as count FROM case_deadlines WHERE due_date >= date("now") AND due_date <= date("now", "+7 days") AND completed = FALSE').first(),
      DB.prepare('SELECT COUNT(*) as count FROM hearings WHERE hearing_date >= date("now") AND hearing_date <= date("now", "+7 days") AND status = "Scheduled"').first(),
      DB.prepare('SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE billable = TRUE AND billed = FALSE').first(),
      DB.prepare('SELECT COUNT(*) as count FROM invoices WHERE status IN (?, ?)').bind('Sent', 'Overdue').first()
    ])

    // Get recent cases
    const recentCases = await DB.prepare(`
      SELECT c.*, cl.name as client_name, o.name as primary_officer_name, s.name as status_name, s.color as status_color
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id
      JOIN officers o ON c.primary_officer_id = o.id
      JOIN case_statuses s ON c.status_id = s.id
      ORDER BY c.created_at DESC LIMIT 5
    `).all()

    // Get urgent deadlines
    const urgentDeadlines = await DB.prepare(`
      SELECT cd.*, c.title as case_title, c.case_number, o.name as created_by_name
      FROM case_deadlines cd
      JOIN cases c ON cd.case_id = c.id
      JOIN officers o ON cd.created_by = o.id
      WHERE cd.due_date <= date("now", "+3 days") AND cd.completed = FALSE
      ORDER BY cd.due_date ASC LIMIT 5
    `).all()

    // Get upcoming hearings
    const upcomingHearingsList = await DB.prepare(`
      SELECT h.*, c.title as case_title, c.case_number
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
      WHERE h.hearing_date >= date("now") AND h.hearing_date <= date("now", "+7 days")
      AND h.status = "Scheduled"
      ORDER BY h.hearing_date ASC, h.hearing_time ASC LIMIT 5
    `).all()

    return c.json({
      success: true,
      data: {
        total_cases: totalCases?.count || 0,
        active_cases: activeCases?.count || 0,
        total_clients: totalClients?.count || 0,
        upcoming_deadlines: upcomingDeadlines?.count || 0,
        upcoming_hearings: upcomingHearings?.count || 0,
        total_billable_hours: billableHours?.total || 0,
        pending_invoices: pendingInvoices?.count || 0,
        recent_cases: recentCases.results || [],
        urgent_deadlines: urgentDeadlines.results || [],
        upcoming_hearings_list: upcomingHearingsList.results || []
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return c.json({ success: false, error: 'Failed to fetch dashboard data' }, 500)
  }
})

// =============================================================================
// OFFICERS API
// =============================================================================

app.get('/api/officers', async (c) => {
  try {
    const { DB } = c.env
    const result = await DB.prepare('SELECT * FROM officers WHERE active = TRUE ORDER BY name').all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch officers' }, 500)
  }
})

app.get('/api/officers/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    const result = await DB.prepare('SELECT * FROM officers WHERE id = ?').bind(id).first()
    
    if (!result) {
      return c.json({ success: false, error: 'Officer not found' }, 404)
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch officer' }, 500)
  }
})

app.post('/api/officers', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO officers (name, email, phone, position, specialization, hourly_rate) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      body.name, body.email, body.phone, body.position, 
      body.specialization, body.hourly_rate
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create officer' }, 500)
  }
})

// =============================================================================
// CLIENTS API
// =============================================================================

app.get('/api/clients', async (c) => {
  try {
    const { DB } = c.env
    const result = await DB.prepare('SELECT * FROM clients WHERE active = TRUE ORDER BY name').all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch clients' }, 500)
  }
})

app.get('/api/clients/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    const result = await DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()
    
    if (!result) {
      return c.json({ success: false, error: 'Client not found' }, 404)
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch client' }, 500)
  }
})

app.post('/api/clients', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO clients (name, email, phone, address, company, client_type, contact_person, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name, body.email, body.phone, body.address, 
      body.company, body.client_type, body.contact_person, body.notes
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create client' }, 500)
  }
})

app.put('/api/clients/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      UPDATE clients 
      SET name = ?, email = ?, phone = ?, address = ?, company = ?, 
          client_type = ?, contact_person = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.name, body.email, body.phone, body.address, body.company,
      body.client_type, body.contact_person, body.notes, id
    ).run()
    
    if (result.changes === 0) {
      return c.json({ success: false, error: 'Client not found' }, 404)
    }
    
    return c.json({ success: true, message: 'Client updated successfully' })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update client' }, 500)
  }
})

// =============================================================================
// CASE STATUSES API
// =============================================================================

app.get('/api/case-statuses', async (c) => {
  try {
    const { DB } = c.env
    const result = await DB.prepare('SELECT * FROM case_statuses ORDER BY name').all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch case statuses' }, 500)
  }
})

// =============================================================================
// CASES API
// =============================================================================

app.get('/api/cases', async (c) => {
  try {
    const { DB } = c.env
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = (page - 1) * limit
    
    // Get total count
    const countResult = await DB.prepare('SELECT COUNT(*) as total FROM cases').first()
    const total = countResult?.total || 0
    
    // Get cases with joined data
    const result = await DB.prepare(`
      SELECT c.*, cl.name as client_name, o.name as primary_officer_name, 
             s.name as status_name, s.color as status_color
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id
      JOIN officers o ON c.primary_officer_id = o.id
      JOIN case_statuses s ON c.status_id = s.id
      ORDER BY c.created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
    
    return c.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch cases' }, 500)
  }
})

app.get('/api/cases/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    
    const result = await DB.prepare(`
      SELECT c.*, cl.name as client_name, o.name as primary_officer_name, 
             s.name as status_name, s.color as status_color
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id
      JOIN officers o ON c.primary_officer_id = o.id
      JOIN case_statuses s ON c.status_id = s.id
      WHERE c.id = ?
    `).bind(id).first()
    
    if (!result) {
      return c.json({ success: false, error: 'Case not found' }, 404)
    }
    
    return c.json({ success: true, data: result })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch case' }, 500)
  }
})

app.post('/api/cases', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    // Generate unique case number
    const caseNumber = generateCaseNumber(body.case_type)
    
    // Get "New" status ID
    const newStatus = await DB.prepare('SELECT id FROM case_statuses WHERE name = "New"').first()
    const statusId = newStatus?.id || 1
    
    const result = await DB.prepare(`
      INSERT INTO cases (
        case_number, title, description, client_id, primary_officer_id, status_id,
        case_type, priority, court_name, judge_name, opposing_party, opposing_counsel,
        case_value, filing_date, statute_of_limitations, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      caseNumber, body.title, body.description, body.client_id, body.primary_officer_id,
      statusId, body.case_type, body.priority, body.court_name, body.judge_name,
      body.opposing_party, body.opposing_counsel, body.case_value, body.filing_date,
      body.statute_of_limitations, body.summary
    ).run()
    
    return c.json({ 
      success: true, 
      data: { id: result.meta.last_row_id, case_number: caseNumber } 
    })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create case' }, 500)
  }
})

app.put('/api/cases/:id', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      UPDATE cases 
      SET title = ?, description = ?, client_id = ?, primary_officer_id = ?, status_id = ?,
          case_type = ?, priority = ?, court_name = ?, judge_name = ?, opposing_party = ?,
          opposing_counsel = ?, case_value = ?, filing_date = ?, statute_of_limitations = ?,
          summary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      body.title, body.description, body.client_id, body.primary_officer_id, body.status_id,
      body.case_type, body.priority, body.court_name, body.judge_name, body.opposing_party,
      body.opposing_counsel, body.case_value, body.filing_date, body.statute_of_limitations,
      body.summary, id
    ).run()
    
    if (result.changes === 0) {
      return c.json({ success: false, error: 'Case not found' }, 404)
    }
    
    return c.json({ success: true, message: 'Case updated successfully' })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update case' }, 500)
  }
})

// =============================================================================
// DEADLINES API
// =============================================================================

app.get('/api/deadlines', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    
    let query = `
      SELECT cd.*, c.title as case_title, c.case_number, o.name as created_by_name
      FROM case_deadlines cd
      JOIN cases c ON cd.case_id = c.id
      JOIN officers o ON cd.created_by = o.id
    `
    let params = []
    
    if (caseId) {
      query += ' WHERE cd.case_id = ?'
      params.push(caseId)
    }
    
    query += ' ORDER BY cd.due_date ASC, cd.priority DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch deadlines' }, 500)
  }
})

app.post('/api/deadlines', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO case_deadlines (
        case_id, title, description, due_date, due_time, priority, type,
        reminder_days, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.title, body.description, body.due_date, body.due_time,
      body.priority, body.type, body.reminder_days, body.notes, body.created_by
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create deadline' }, 500)
  }
})

app.put('/api/deadlines/:id/complete', async (c) => {
  try {
    const { DB } = c.env
    const id = c.req.param('id')
    
    const result = await DB.prepare(`
      UPDATE case_deadlines 
      SET completed = TRUE, completed_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(id).run()
    
    if (result.changes === 0) {
      return c.json({ success: false, error: 'Deadline not found' }, 404)
    }
    
    return c.json({ success: true, message: 'Deadline marked as completed' })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to complete deadline' }, 500)
  }
})

// =============================================================================
// HEARINGS API
// =============================================================================

app.get('/api/hearings', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    
    let query = `
      SELECT h.*, c.title as case_title, c.case_number
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
    `
    let params = []
    
    if (caseId) {
      query += ' WHERE h.case_id = ?'
      params.push(caseId)
    }
    
    query += ' ORDER BY h.hearing_date ASC, h.hearing_time ASC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch hearings' }, 500)
  }
})

app.post('/api/hearings', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const attending_officers = body.attending_officers ? JSON.stringify(body.attending_officers) : null
    
    const result = await DB.prepare(`
      INSERT INTO hearings (
        case_id, title, hearing_type, court_name, courtroom, judge_name,
        hearing_date, hearing_time, duration_minutes, location, notes,
        preparation_notes, attending_officers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.title, body.hearing_type, body.court_name, body.courtroom,
      body.judge_name, body.hearing_date, body.hearing_time, body.duration_minutes,
      body.location, body.notes, body.preparation_notes, attending_officers
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create hearing' }, 500)
  }
})

// =============================================================================
// TIME ENTRIES API
// =============================================================================

app.get('/api/time-entries', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    const officerId = c.req.query('officer_id')
    
    let query = `
      SELECT te.*, c.title as case_title, c.case_number, o.name as officer_name,
             (te.hours * te.rate) as amount
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      JOIN officers o ON te.officer_id = o.id
      WHERE 1=1
    `
    let params = []
    
    if (caseId) {
      query += ' AND te.case_id = ?'
      params.push(caseId)
    }
    
    if (officerId) {
      query += ' AND te.officer_id = ?'
      params.push(officerId)
    }
    
    query += ' ORDER BY te.entry_date DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch time entries' }, 500)
  }
})

app.post('/api/time-entries', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO time_entries (
        case_id, officer_id, entry_date, start_time, end_time, hours, rate,
        description, billable, task_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.officer_id, body.entry_date, body.start_time, body.end_time,
      body.hours, body.rate, body.description, body.billable, body.task_type
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create time entry' }, 500)
  }
})

// =============================================================================
// EXPENSES API
// =============================================================================

app.get('/api/expenses', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    
    let query = `
      SELECT e.*, c.title as case_title, c.case_number, o.name as officer_name
      FROM expenses e
      JOIN cases c ON e.case_id = c.id
      LEFT JOIN officers o ON e.officer_id = o.id
    `
    let params = []
    
    if (caseId) {
      query += ' WHERE e.case_id = ?'
      params.push(caseId)
    }
    
    query += ' ORDER BY e.expense_date DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch expenses' }, 500)
  }
})

app.post('/api/expenses', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO expenses (
        case_id, officer_id, expense_date, amount, description, category,
        receipt_number, billable, reimbursable, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.officer_id, body.expense_date, body.amount, body.description,
      body.category, body.receipt_number, body.billable, body.reimbursable, body.notes
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create expense' }, 500)
  }
})

// =============================================================================
// RETAINERS API
// =============================================================================

app.get('/api/retainers', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    
    let query = `
      SELECT r.*, c.title as case_title, c.case_number, cl.name as client_name
      FROM retainers r
      JOIN cases c ON r.case_id = c.id
      JOIN clients cl ON r.client_id = cl.id
    `
    let params = []
    
    if (caseId) {
      query += ' WHERE r.case_id = ?'
      params.push(caseId)
    }
    
    query += ' ORDER BY r.received_date DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch retainers' }, 500)
  }
})

app.post('/api/retainers', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO retainers (
        case_id, client_id, amount, received_date, payment_method,
        reference_number, notes, trust_account
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.client_id, body.amount, body.received_date, body.payment_method,
      body.reference_number, body.notes, body.trust_account
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create retainer' }, 500)
  }
})

// =============================================================================
// CASE NOTES API
// =============================================================================

app.get('/api/case-notes', async (c) => {
  try {
    const { DB } = c.env
    const caseId = c.req.query('case_id')
    
    let query = `
      SELECT cn.*, c.title as case_title, c.case_number, o.name as author_name
      FROM case_notes cn
      JOIN cases c ON cn.case_id = c.id
      JOIN officers o ON cn.author_id = o.id
    `
    let params = []
    
    if (caseId) {
      query += ' WHERE cn.case_id = ?'
      params.push(caseId)
    }
    
    query += ' ORDER BY cn.created_at DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch case notes' }, 500)
  }
})

app.post('/api/case-notes', async (c) => {
  try {
    const { DB } = c.env
    const body = await c.req.json()
    
    const result = await DB.prepare(`
      INSERT INTO case_notes (
        case_id, title, content, note_type, priority, confidential, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.case_id, body.title, body.content, body.note_type,
      body.priority, body.confidential, body.author_id
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create case note' }, 500)
  }
})

// =============================================================================
// MAIN APP ROUTE
// =============================================================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Legal Case Management System</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div id="app" class="min-h-screen">
            <!-- Loading state -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Loading Legal Case Management System...</p>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app