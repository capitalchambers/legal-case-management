import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types'
import { generateCaseNumber } from './utils'
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  validateSession, 
  deleteSession, 
  requireAuth, 
  getCurrentUser, 
  logActivity,
  DEFAULT_USERS
} from './auth'
import { 
  generateInvoiceHTML, 
  generateCaseTimelineHTML, 
  generatePDFResponse, 
  SAMPLE_FIRM_INFO,
  type InvoiceData,
  type CaseTimelineData
} from './pdf-generator'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// =============================================================================
// AUTHENTICATION APIs
// =============================================================================

// Login endpoint
app.post('/api/auth/login', async (c) => {
  try {
    const { DB } = c.env
    const { username, password } = await c.req.json()

    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password required' }, 400)
    }

    // Find user
    const user = await DB.prepare(`
      SELECT * FROM users WHERE username = ? AND is_active = TRUE
    `).bind(username).first()

    if (!user) {
      await logActivity(c, null, 'login_failed', 'user', null, `Username: ${username}`)
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      await logActivity(c, user.id, 'login_failed', 'user', user.id, 'Invalid password')
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    // Create session
    const sessionToken = await createSession(
      c, 
      user.id, 
      c.req.header('User-Agent'), 
      c.req.header('CF-Connecting-IP')
    )

    // Update last login
    await DB.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE id = ?
    `).bind(user.id).run()

    // Log successful login
    await logActivity(c, user.id, 'login_success', 'user', user.id)

    return c.json({
      success: true,
      data: {
        session_token: sessionToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: 'Login failed' }, 500)
  }
})

// Logout endpoint
app.post('/api/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token')

    if (sessionToken) {
      const session = await validateSession(c, sessionToken)
      if (session) {
        await logActivity(c, session.user_id, 'logout', 'user', session.user_id)
        await deleteSession(c, sessionToken)
      }
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: 'Logout failed' }, 500)
  }
})

// Get current user info
app.get('/api/auth/me', requireAuth(), async (c) => {
  const user = getCurrentUser(c)
  return c.json({
    success: true,
    data: {
      id: user.user_id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  })
})

// Initialize default users (for setup)
app.post('/api/auth/init-users', async (c) => {
  try {
    const { DB } = c.env

    for (const userData of DEFAULT_USERS) {
      const hashedPassword = await hashPassword(userData.password)
      
      await DB.prepare(`
        INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        userData.username,
        `${userData.username}@legalfirm.com`,
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.role
      ).run()
    }

    return c.json({ success: true, message: 'Default users initialized' })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to initialize users' }, 500)
  }
})

// =============================================================================
// PDF GENERATION APIs
// =============================================================================

// Generate invoice PDF
app.get('/api/reports/invoice/:caseId', requireAuth(['billing_management', 'case_management']), async (c) => {
  try {
    const { DB } = c.env
    const caseId = parseInt(c.req.param('caseId'))
    const user = getCurrentUser(c)

    // Get case and client info
    const caseInfo = await DB.prepare(`
      SELECT c.*, cl.name as client_name, cl.email as client_email
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id 
      WHERE c.id = ?
    `).bind(caseId).first()

    if (!caseInfo) {
      return c.json({ success: false, error: 'Case not found' }, 404)
    }

    // Get time entries
    const timeEntries = await DB.prepare(`
      SELECT te.*, o.name as lawyer_name
      FROM time_entries te
      JOIN officers o ON te.officer_id = o.id
      WHERE te.case_id = ? AND te.billable = TRUE AND te.billed = FALSE
      ORDER BY te.date_logged DESC
    `).bind(caseId).all()

    // Get expenses
    const expenses = await DB.prepare(`
      SELECT * FROM expenses 
      WHERE case_id = ? AND billed = FALSE
      ORDER BY expense_date DESC
    `).bind(caseId).all()

    // Calculate totals
    const timeTotal = timeEntries.results.reduce((sum, entry) => sum + (entry.hours * entry.hourly_rate), 0)
    const expenseTotal = expenses.results.reduce((sum, expense) => sum + expense.amount, 0)
    const subtotal = timeTotal + expenseTotal
    const taxRate = 0.08 // 8% tax
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    const invoiceData: InvoiceData = {
      id: caseId,
      invoice_number: `INV-${caseInfo.case_number}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      case_title: caseInfo.title,
      client_name: caseInfo.client_name,
      billing_period: `${new Date(new Date().getTime() - 30*24*60*60*1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
      time_entries: timeEntries.results.map(entry => ({
        date: entry.date_logged,
        description: entry.description,
        hours: entry.hours,
        rate: entry.hourly_rate,
        amount: entry.hours * entry.hourly_rate,
        lawyer_name: entry.lawyer_name
      })),
      expenses: expenses.results.map(expense => ({
        date: expense.expense_date,
        description: expense.description,
        amount: expense.amount
      })),
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      due_date: new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString(), // 30 days from now
      firm_info: SAMPLE_FIRM_INFO
    }

    // Log activity
    await logActivity(c, user.user_id, 'generate_invoice', 'case', caseId)

    const html = generateInvoiceHTML(invoiceData)
    return generatePDFResponse(html, `invoice-${invoiceData.invoice_number}`)

  } catch (error) {
    console.error('Invoice generation error:', error)
    return c.json({ success: false, error: 'Failed to generate invoice' }, 500)
  }
})

// Generate case timeline PDF
app.get('/api/reports/timeline/:caseId', requireAuth(['case_management', 'case_view']), async (c) => {
  try {
    const { DB } = c.env
    const caseId = parseInt(c.req.param('caseId'))
    const user = getCurrentUser(c)

    // Get case info
    const caseInfo = await DB.prepare(`
      SELECT c.*, cl.name as client_name, o.name as primary_officer_name, s.name as status_name
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id 
      JOIN officers o ON c.primary_officer_id = o.id
      JOIN case_statuses s ON c.status_id = s.id
      WHERE c.id = ?
    `).bind(caseId).first()

    if (!caseInfo) {
      return c.json({ success: false, error: 'Case not found' }, 404)
    }

    // Get timeline events (case notes as timeline)
    const timelineEvents = await DB.prepare(`
      SELECT cn.*, o.name as created_by_name
      FROM case_notes cn
      JOIN officers o ON cn.created_by = o.id
      WHERE cn.case_id = ?
      ORDER BY cn.created_at ASC
    `).bind(caseId).all()

    // Get deadlines
    const deadlines = await DB.prepare(`
      SELECT * FROM case_deadlines 
      WHERE case_id = ?
      ORDER BY due_date ASC
    `).bind(caseId).all()

    // Get time entries
    const timeEntries = await DB.prepare(`
      SELECT te.*, o.name as lawyer_name
      FROM time_entries te
      JOIN officers o ON te.officer_id = o.id
      WHERE te.case_id = ?
      ORDER BY te.date_logged DESC
    `).bind(caseId).all()

    // Calculate total billable hours
    const totalBillableHours = timeEntries.results
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.hours, 0)

    const timelineData: CaseTimelineData = {
      case_info: {
        case_number: caseInfo.case_number,
        title: caseInfo.title,
        client_name: caseInfo.client_name,
        primary_officer: caseInfo.primary_officer_name,
        case_type: caseInfo.case_type,
        status: caseInfo.status_name,
        filing_date: caseInfo.filing_date,
        court_name: caseInfo.court_name || 'N/A'
      },
      timeline_events: timelineEvents.results.map(event => ({
        date: event.created_at.split(' ')[0],
        time: event.created_at.split(' ')[1],
        type: 'Note',
        title: event.note_type || 'Case Note',
        description: event.content,
        created_by: event.created_by_name
      })),
      deadlines: deadlines.results.map(deadline => ({
        due_date: deadline.due_date,
        title: deadline.title,
        description: deadline.description,
        priority: deadline.priority,
        status: deadline.completed ? 'Completed' : 'Pending'
      })),
      time_entries: timeEntries.results.map(entry => ({
        date: entry.date_logged,
        lawyer: entry.lawyer_name,
        description: entry.description,
        hours: entry.hours,
        billable: entry.billable
      })),
      total_billable_hours: totalBillableHours
    }

    // Log activity
    await logActivity(c, user.user_id, 'generate_timeline', 'case', caseId)

    const html = generateCaseTimelineHTML(timelineData)
    return generatePDFResponse(html, `timeline-${caseInfo.case_number}`)

  } catch (error) {
    console.error('Timeline generation error:', error)
    return c.json({ success: false, error: 'Failed to generate timeline' }, 500)
  }
})

// =============================================================================
// DASHBOARD API (Protected)
// =============================================================================

app.get('/api/dashboard', requireAuth(), async (c) => {
  try {
    const { DB } = c.env
    const user = getCurrentUser(c)

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

    // Log dashboard access
    await logActivity(c, user.user_id, 'view_dashboard', 'dashboard')

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
        user_info: {
          name: `${user.first_name} ${user.last_name}`,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return c.json({ success: false, error: 'Failed to fetch dashboard data' }, 500)
  }
})

// =============================================================================
// CASES API (Protected)
// =============================================================================

// Cases API
app.get('/api/cases', requireAuth(['case_management', 'case_view']), async (c) => {
  try {
    const { DB } = c.env
    const result = await DB.prepare(`
      SELECT c.*, cl.name as client_name, o.name as primary_officer_name, s.name as status_name, s.color as status_color
      FROM cases c 
      JOIN clients cl ON c.client_id = cl.id
      JOIN officers o ON c.primary_officer_id = o.id
      JOIN case_statuses s ON c.status_id = s.id
      ORDER BY c.created_at DESC
    `).all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch cases' }, 500)
  }
})

// Clients API
app.get('/api/clients', requireAuth(['client_management', 'case_view']), async (c) => {
  try {
    const { DB } = c.env
    const result = await DB.prepare('SELECT * FROM clients WHERE active = TRUE ORDER BY name').all()
    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch clients' }, 500)
  }
})

// Default route with complete frontend
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
        <style>
            .login-form { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .sidebar { width: 250px; }
            .main-content { margin-left: 250px; }
            @media (max-width: 768px) {
                .sidebar { width: 100%; position: absolute; z-index: 10; transform: translateX(-100%); }
                .sidebar.active { transform: translateX(0); }
                .main-content { margin-left: 0; }
            }
        </style>
    </head>
    <body class="bg-gray-100">
        <!-- Login Screen -->
        <div id="login-screen" class="login-form min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
                <div class="text-center mb-8">
                    <i class="fas fa-balance-scale text-4xl text-blue-600 mb-4"></i>
                    <h1 class="text-2xl font-bold text-gray-800">Legal Case Management</h1>
                    <p class="text-gray-600 mt-2">Sign in to your account</p>
                </div>
                
                <form id="login-form" class="space-y-4">
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">Username</label>
                        <input type="text" id="username" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input type="password" id="password" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i>Sign In
                    </button>
                </form>
                
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800 font-semibold">Demo Accounts:</p>
                    <p class="text-xs text-blue-700 mt-1">Admin: admin / admin123</p>
                    <p class="text-xs text-blue-700">Lawyer: sarah.johnson / lawyer123</p>
                    <p class="text-xs text-blue-700">Paralegal: david.kim / paralegal123</p>
                </div>
                
                <div id="login-error" class="hidden mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
            </div>
        </div>

        <!-- Main App (hidden initially) -->
        <div id="main-app" class="hidden">
            <!-- Sidebar -->
            <div id="sidebar" class="sidebar fixed top-0 left-0 h-full bg-blue-900 text-white shadow-lg">
                <div class="p-4">
                    <div class="flex items-center justify-between mb-6">
                        <h1 class="text-xl font-bold">
                            <i class="fas fa-balance-scale mr-2"></i>
                            Legal Management
                        </h1>
                        <button id="logout-btn" class="text-gray-300 hover:text-white">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                    
                    <div id="user-info" class="mb-6 p-3 bg-blue-800 rounded">
                        <p class="text-sm font-semibold" id="user-name">Loading...</p>
                        <p class="text-xs text-gray-300" id="user-role">Loading...</p>
                    </div>
                    
                    <nav>
                        <a href="#" onclick="showSection('dashboard')" class="nav-link flex items-center p-3 rounded hover:bg-blue-800 mb-2">
                            <i class="fas fa-tachometer-alt mr-3"></i> Dashboard
                        </a>
                        <a href="#" onclick="showSection('cases')" class="nav-link flex items-center p-3 rounded hover:bg-blue-800 mb-2">
                            <i class="fas fa-briefcase mr-3"></i> Cases
                        </a>
                        <a href="#" onclick="showSection('clients')" class="nav-link flex items-center p-3 rounded hover:bg-blue-800 mb-2">
                            <i class="fas fa-users mr-3"></i> Clients
                        </a>
                        <a href="#" onclick="showSection('reports')" class="nav-link flex items-center p-3 rounded hover:bg-blue-800 mb-2">
                            <i class="fas fa-file-pdf mr-3"></i> Reports
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Main Content -->
            <div class="main-content min-h-screen">
                <div class="p-6">
                    <!-- Dashboard Section -->
                    <div id="dashboard-section" class="section">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
                            <p class="text-gray-600">Legal Case Management System Overview</p>
                        </div>
                        <div id="dashboard-content">Loading...</div>
                    </div>

                    <!-- Cases Section -->
                    <div id="cases-section" class="section hidden">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Cases</h2>
                            <p class="text-gray-600">Manage all legal cases</p>
                        </div>
                        <div class="bg-white rounded-lg shadow">
                            <div id="cases-content" class="p-6">Loading cases...</div>
                        </div>
                    </div>

                    <!-- Clients Section -->
                    <div id="clients-section" class="section hidden">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Clients</h2>
                            <p class="text-gray-600">Manage client information</p>
                        </div>
                        <div class="bg-white rounded-lg shadow">
                            <div id="clients-content" class="p-6">Loading clients...</div>
                        </div>
                    </div>

                    <!-- Reports Section -->
                    <div id="reports-section" class="section hidden">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">Reports & PDFs</h2>
                            <p class="text-gray-600">Generate invoices and case timelines</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold mb-4">
                                    <i class="fas fa-file-invoice-dollar text-blue-600 mr-2"></i>
                                    Generate Invoice
                                </h3>
                                <p class="text-gray-600 mb-4">Create professional invoices for case billing</p>
                                <select id="case-select-invoice" class="w-full p-2 border rounded mb-4">
                                    <option value="">Select a case...</option>
                                </select>
                                <button onclick="generateInvoice()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                    <i class="fas fa-download mr-2"></i>Generate Invoice PDF
                                </button>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <h3 class="text-lg font-semibold mb-4">
                                    <i class="fas fa-timeline text-green-600 mr-2"></i>
                                    Case Timeline
                                </h3>
                                <p class="text-gray-600 mb-4">Generate comprehensive case timeline reports</p>
                                <select id="case-select-timeline" class="w-full p-2 border rounded mb-4">
                                    <option value="">Select a case...</option>
                                </select>
                                <button onclick="generateTimeline()" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                    <i class="fas fa-download mr-2"></i>Generate Timeline PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            let sessionToken = localStorage.getItem('session_token')
            let currentUser = null

            // Set up axios defaults
            if (sessionToken) {
                axios.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
            }

            // Login functionality
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault()
                
                const username = document.getElementById('username').value
                const password = document.getElementById('password').value
                
                try {
                    const response = await axios.post('/api/auth/login', { username, password })
                    
                    if (response.data.success) {
                        sessionToken = response.data.data.session_token
                        currentUser = response.data.data.user
                        
                        localStorage.setItem('session_token', sessionToken)
                        axios.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
                        
                        showMainApp()
                    } else {
                        showError(response.data.error)
                    }
                } catch (error) {
                    showError('Login failed. Please check your credentials.')
                }
            })

            // Logout functionality
            document.getElementById('logout-btn').addEventListener('click', async () => {
                try {
                    await axios.post('/api/auth/logout')
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    localStorage.removeItem('session_token')
                    delete axios.defaults.headers.common['Authorization']
                    sessionToken = null
                    currentUser = null
                    showLoginScreen()
                }
            })

            function showError(message) {
                const errorDiv = document.getElementById('login-error')
                errorDiv.textContent = message
                errorDiv.classList.remove('hidden')
            }

            function showLoginScreen() {
                document.getElementById('login-screen').classList.remove('hidden')
                document.getElementById('main-app').classList.add('hidden')
            }

            function showMainApp() {
                document.getElementById('login-screen').classList.add('hidden')
                document.getElementById('main-app').classList.remove('hidden')
                
                // Update user info
                if (currentUser) {
                    document.getElementById('user-name').textContent = currentUser.first_name + ' ' + currentUser.last_name
                    document.getElementById('user-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
                }
                
                // Load dashboard and cases
                loadDashboard()
                loadCasesForReports()
            }

            // Navigation
            function showSection(section) {
                document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))
                document.getElementById(section + '-section').classList.remove('hidden')
                
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('bg-blue-800'))
                event.target.closest('.nav-link').classList.add('bg-blue-800')
                
                if (section === 'dashboard') loadDashboard()
                if (section === 'cases') loadCases()
                if (section === 'clients') loadClients()
            }

            // Load dashboard
            async function loadDashboard() {
                try {
                    const response = await axios.get('/api/dashboard')
                    if (response.data.success) {
                        const data = response.data.data
                        document.getElementById('dashboard-content').innerHTML = \`
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div class="bg-white rounded-lg shadow p-6">
                                    <div class="flex items-center">
                                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                                            <i class="fas fa-briefcase text-xl"></i>
                                        </div>
                                        <div class="ml-4">
                                            <h4 class="text-2xl font-bold text-gray-800">\${data.total_cases}</h4>
                                            <p class="text-gray-600">Total Cases</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg shadow p-6">
                                    <div class="flex items-center">
                                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                                            <i class="fas fa-users text-xl"></i>
                                        </div>
                                        <div class="ml-4">
                                            <h4 class="text-2xl font-bold text-gray-800">\${data.total_clients}</h4>
                                            <p class="text-gray-600">Active Clients</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg shadow p-6">
                                    <div class="flex items-center">
                                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                                            <i class="fas fa-calendar text-xl"></i>
                                        </div>
                                        <div class="ml-4">
                                            <h4 class="text-2xl font-bold text-gray-800">\${data.upcoming_deadlines}</h4>
                                            <p class="text-gray-600">Upcoming Deadlines</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg shadow p-6">
                                    <div class="flex items-center">
                                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                                            <i class="fas fa-clock text-xl"></i>
                                        </div>
                                        <div class="ml-4">
                                            <h4 class="text-2xl font-bold text-gray-800">\${data.total_billable_hours}</h4>
                                            <p class="text-gray-600">Billable Hours</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div class="bg-white rounded-lg shadow p-6">
                                    <h3 class="text-lg font-semibold mb-4">Recent Cases</h3>
                                    <div class="space-y-3">
                                        \${data.recent_cases.map(case_ => \`
                                            <div class="border-b pb-3 last:border-b-0">
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <h4 class="font-medium text-gray-800">\${case_.title}</h4>
                                                        <p class="text-sm text-gray-600">Client: \${case_.client_name}</p>
                                                        <p class="text-sm text-gray-600">Officer: \${case_.primary_officer_name}</p>
                                                    </div>
                                                    <span class="px-2 py-1 text-xs rounded-full" style="background-color: \${case_.status_color}20; color: \${case_.status_color}">\${case_.status_name}</span>
                                                </div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                                
                                <div class="bg-white rounded-lg shadow p-6">
                                    <h3 class="text-lg font-semibold mb-4">Urgent Deadlines</h3>
                                    <div class="space-y-3">
                                        \${data.urgent_deadlines.map(deadline => \`
                                            <div class="border-b pb-3 last:border-b-0">
                                                <h4 class="font-medium text-gray-800">\${deadline.title}</h4>
                                                <p class="text-sm text-gray-600">\${deadline.case_title}</p>
                                                <p class="text-sm text-red-600">Due: \${deadline.due_date}</p>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-6 text-center">
                                <p class="text-gray-600">Welcome back, \${data.user_info.name}!</p>
                            </div>
                        \`
                    }
                } catch (error) {
                    console.error('Dashboard error:', error)
                    document.getElementById('dashboard-content').innerHTML = '<p class="text-red-600">Error loading dashboard data</p>'
                }
            }

            // Load cases
            async function loadCases() {
                try {
                    const response = await axios.get('/api/cases')
                    if (response.data.success) {
                        const cases = response.data.data
                        document.getElementById('cases-content').innerHTML = \`
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b">
                                        <th class="text-left p-3">Case Number</th>
                                        <th class="text-left p-3">Title</th>
                                        <th class="text-left p-3">Client</th>
                                        <th class="text-left p-3">Type</th>
                                        <th class="text-left p-3">Status</th>
                                        <th class="text-left p-3">Officer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${cases.map(case_ => \`
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="p-3 font-medium">\${case_.case_number}</td>
                                            <td class="p-3">\${case_.title}</td>
                                            <td class="p-3">\${case_.client_name}</td>
                                            <td class="p-3">\${case_.case_type}</td>
                                            <td class="p-3"><span class="px-2 py-1 text-xs rounded-full" style="background-color: \${case_.status_color}20; color: \${case_.status_color}">\${case_.status_name}</span></td>
                                            <td class="p-3">\${case_.primary_officer_name}</td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`
                    }
                } catch (error) {
                    console.error('Cases error:', error)
                    document.getElementById('cases-content').innerHTML = '<p class="text-red-600">Error loading cases</p>'
                }
            }

            // Load clients
            async function loadClients() {
                try {
                    const response = await axios.get('/api/clients')
                    if (response.data.success) {
                        const clients = response.data.data
                        document.getElementById('clients-content').innerHTML = \`
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b">
                                        <th class="text-left p-3">Name</th>
                                        <th class="text-left p-3">Email</th>
                                        <th class="text-left p-3">Phone</th>
                                        <th class="text-left p-3">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${clients.map(client => \`
                                        <tr class="border-b hover:bg-gray-50">
                                            <td class="p-3 font-medium">\${client.name}</td>
                                            <td class="p-3">\${client.email || 'N/A'}</td>
                                            <td class="p-3">\${client.phone || 'N/A'}</td>
                                            <td class="p-3">\${client.client_type || 'Individual'}</td>
                                        </tr>
                                    \`).join('')}
                                </tbody>
                            </table>
                        \`
                    }
                } catch (error) {
                    console.error('Clients error:', error)
                    document.getElementById('clients-content').innerHTML = '<p class="text-red-600">Error loading clients</p>'
                }
            }

            // Load cases for reports
            async function loadCasesForReports() {
                try {
                    const response = await axios.get('/api/cases')
                    if (response.data.success) {
                        const cases = response.data.data
                        const options = cases.map(case_ => \`
                            <option value="\${case_.id}">\${case_.case_number}: \${case_.title}</option>
                        \`).join('')
                        
                        document.getElementById('case-select-invoice').innerHTML = '<option value="">Select a case...</option>' + options
                        document.getElementById('case-select-timeline').innerHTML = '<option value="">Select a case...</option>' + options
                    }
                } catch (error) {
                    console.error('Cases loading error:', error)
                }
            }

            // Generate invoice
            async function generateInvoice() {
                const caseId = document.getElementById('case-select-invoice').value
                if (!caseId) {
                    alert('Please select a case')
                    return
                }
                
                try {
                    const response = await axios.get(\`/api/reports/invoice/\${caseId}\`, {
                        responseType: 'blob'
                    })
                    
                    // Open in new window for PDF conversion
                    const blob = new Blob([response.data], { type: 'text/html' })
                    const url = window.URL.createObjectURL(blob)
                    const newWindow = window.open(url, '_blank')
                    
                    // Add print instructions
                    setTimeout(() => {
                        if (newWindow) {
                            newWindow.document.title = 'Invoice - Print to PDF (Ctrl+P)'
                        }
                    }, 1000)
                    
                } catch (error) {
                    alert('Failed to generate invoice: ' + (error.response?.data?.error || error.message))
                    console.error(error)
                }
            }

            // Generate timeline
            async function generateTimeline() {
                const caseId = document.getElementById('case-select-timeline').value
                if (!caseId) {
                    alert('Please select a case')
                    return
                }
                
                try {
                    const response = await axios.get(\`/api/reports/timeline/\${caseId}\`, {
                        responseType: 'blob'
                    })
                    
                    // Open in new window for PDF conversion
                    const blob = new Blob([response.data], { type: 'text/html' })
                    const url = window.URL.createObjectURL(blob)
                    const newWindow = window.open(url, '_blank')
                    
                    // Add print instructions
                    setTimeout(() => {
                        if (newWindow) {
                            newWindow.document.title = 'Case Timeline - Print to PDF (Ctrl+P)'
                        }
                    }, 1000)
                    
                } catch (error) {
                    alert('Failed to generate timeline: ' + (error.response?.data?.error || error.message))
                    console.error(error)
                }
            }

            // Initialize app
            if (sessionToken) {
                // Validate existing session
                axios.get('/api/auth/me').then(response => {
                    if (response.data.success) {
                        currentUser = response.data.data
                        showMainApp()
                    } else {
                        showLoginScreen()
                    }
                }).catch(() => {
                    showLoginScreen()
                })
            } else {
                showLoginScreen()
            }

            // Initialize default users on first load
            axios.post('/api/auth/init-users').catch(() => {
                // Ignore errors - users might already exist
            })
        </script>
    </body>
    </html>
  `)
})

export default app