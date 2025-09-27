import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Sample data for demo purposes
const sampleData = {
  cases: [
    { id: 1, title: 'Criminal Defense - John Doe', client: 'John Doe', status: 'Active', created_at: '2024-09-15' },
    { id: 2, title: 'Civil Litigation - ABC Corp', client: 'ABC Corp', status: 'Active', created_at: '2024-09-14' },
    { id: 3, title: 'Family Law - Jane Smith', client: 'Jane Smith', status: 'New', created_at: '2024-09-13' },
    { id: 4, title: 'Corporate Law - XYZ Inc', client: 'XYZ Inc', status: 'Active', created_at: '2024-09-12' },
    { id: 5, title: 'Personal Injury - Mike Johnson', client: 'Mike Johnson', status: 'Active', created_at: '2024-09-11' }
  ],
  clients: [
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '555-0101' },
    { id: 2, name: 'ABC Corp', email: 'contact@abc.com', phone: '555-0102' },
    { id: 3, name: 'Jane Smith', email: 'jane@example.com', phone: '555-0103' },
    { id: 4, name: 'XYZ Inc', email: 'info@xyz.com', phone: '555-0104' },
    { id: 5, name: 'Mike Johnson', email: 'mike@example.com', phone: '555-0105' }
  ]
}

// Dashboard API
app.get('/api/dashboard', async (c) => {
  return c.json({
    success: true,
    data: {
      total_cases: 5,
      active_cases: 4,
      total_clients: 5,
      upcoming_deadlines: 3,
      upcoming_hearings: 2,
      total_billable_hours: 45.5,
      pending_invoices: 2,
      recent_cases: sampleData.cases,
      urgent_deadlines: [
        { id: 1, title: 'Court Filing Deadline', case_title: 'Criminal Defense - John Doe', due_date: '2024-09-30' },
        { id: 2, title: 'Discovery Response', case_title: 'Civil Litigation - ABC Corp', due_date: '2024-10-01' }
      ],
      upcoming_hearings_list: [
        { id: 1, hearing_type: 'Preliminary Hearing', case_title: 'Criminal Defense - John Doe', hearing_date: '2024-10-02', hearing_time: '09:00' },
        { id: 2, hearing_type: 'Deposition', case_title: 'Civil Litigation - ABC Corp', hearing_date: '2024-10-03', hearing_time: '14:00' }
      ]
    }
  })
})

// Cases API
app.get('/api/cases', async (c) => {
  return c.json({ success: true, data: sampleData.cases })
})

// Clients API  
app.get('/api/clients', async (c) => {
  return c.json({ success: true, data: sampleData.clients })
})

// Default route
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
        <!-- Sidebar -->
        <div id="sidebar" class="sidebar fixed top-0 left-0 h-full bg-blue-900 text-white shadow-lg">
            <div class="p-4">
                <h1 class="text-xl font-bold mb-8">
                    <i class="fas fa-balance-scale mr-2"></i>
                    Legal Management
                </h1>
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
                </nav>
            </div>
        </div>

        <!-- Mobile menu toggle -->
        <button id="mobile-menu-toggle" class="md:hidden fixed top-4 left-4 z-20 bg-blue-900 text-white p-2 rounded">
            <i class="fas fa-bars"></i>
        </button>

        <!-- Main Content -->
        <div class="main-content min-h-screen">
            <div class="p-6">
                <!-- Dashboard Section -->
                <div id="dashboard-section" class="section">
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
                        <p class="text-gray-600">Legal Case Management System Overview</p>
                    </div>

                    <!-- Stats Grid -->
                    <div id="stats-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <!-- Stats will be loaded here -->
                    </div>

                    <!-- Recent Activity -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-lg font-semibold mb-4">Recent Cases</h3>
                            <div id="recent-cases">
                                <!-- Recent cases will be loaded here -->
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-lg font-semibold mb-4">Urgent Deadlines</h3>
                            <div id="urgent-deadlines">
                                <!-- Urgent deadlines will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cases Section -->
                <div id="cases-section" class="section hidden">
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Cases</h2>
                        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add New Case
                        </button>
                    </div>
                    <div class="bg-white rounded-lg shadow">
                        <div id="cases-table" class="p-6">
                            <!-- Cases table will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Clients Section -->
                <div id="clients-section" class="section hidden">
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Clients</h2>
                        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Add New Client
                        </button>
                    </div>
                    <div class="bg-white rounded-lg shadow">
                        <div id="clients-table" class="p-6">
                            <!-- Clients table will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Mobile menu toggle
            document.getElementById('mobile-menu-toggle').addEventListener('click', function() {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.toggle('active');
            });

            // Navigation
            function showSection(section) {
                document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
                document.getElementById(section + '-section').classList.remove('hidden');
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('bg-blue-800'));
                event.target.closest('.nav-link').classList.add('bg-blue-800');

                // Load section data
                if (section === 'dashboard') loadDashboard();
                if (section === 'cases') loadCases();
                if (section === 'clients') loadClients();

                // Hide mobile menu
                document.getElementById('sidebar').classList.remove('active');
            }

            // Load dashboard data
            async function loadDashboard() {
                try {
                    const response = await axios.get('/api/dashboard');
                    const data = response.data.data;

                    // Update stats
                    document.getElementById('stats-grid').innerHTML = \`
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
                                    <p class="text-gray-600">Deadlines</p>
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
                    \`;

                    // Update recent cases
                    const recentCasesHtml = data.recent_cases.map(case_ => \`
                        <div class="border-b pb-3 mb-3 last:border-b-0">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-medium text-gray-800">\${case_.title}</h4>
                                    <p class="text-sm text-gray-600">Client: \${case_.client}</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">\${case_.status}</span>
                            </div>
                        </div>
                    \`).join('');
                    document.getElementById('recent-cases').innerHTML = recentCasesHtml;

                    // Update urgent deadlines
                    const deadlinesHtml = data.urgent_deadlines.map(deadline => \`
                        <div class="border-b pb-3 mb-3 last:border-b-0">
                            <h4 class="font-medium text-gray-800">\${deadline.title}</h4>
                            <p class="text-sm text-gray-600">\${deadline.case_title}</p>
                            <p class="text-sm text-red-600">Due: \${deadline.due_date}</p>
                        </div>
                    \`).join('');
                    document.getElementById('urgent-deadlines').innerHTML = deadlinesHtml;

                } catch (error) {
                    console.error('Error loading dashboard:', error);
                }
            }

            // Load cases
            async function loadCases() {
                try {
                    const response = await axios.get('/api/cases');
                    const cases = response.data.data;

                    const casesHtml = \`
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left p-3">Case Title</th>
                                    <th class="text-left p-3">Client</th>
                                    <th class="text-left p-3">Status</th>
                                    <th class="text-left p-3">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${cases.map(case_ => \`
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="p-3 font-medium">\${case_.title}</td>
                                        <td class="p-3">\${case_.client}</td>
                                        <td class="p-3"><span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">\${case_.status}</span></td>
                                        <td class="p-3">\${case_.created_at}</td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    \`;
                    document.getElementById('cases-table').innerHTML = casesHtml;
                } catch (error) {
                    console.error('Error loading cases:', error);
                }
            }

            // Load clients
            async function loadClients() {
                try {
                    const response = await axios.get('/api/clients');
                    const clients = response.data.data;

                    const clientsHtml = \`
                        <table class="w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left p-3">Name</th>
                                    <th class="text-left p-3">Email</th>
                                    <th class="text-left p-3">Phone</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${clients.map(client => \`
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="p-3 font-medium">\${client.name}</td>
                                        <td class="p-3">\${client.email}</td>
                                        <td class="p-3">\${client.phone}</td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                    \`;
                    document.getElementById('clients-table').innerHTML = clientsHtml;
                } catch (error) {
                    console.error('Error loading clients:', error);
                }
            }

            // Initialize dashboard on load
            document.addEventListener('DOMContentLoaded', function() {
                loadDashboard();
            });
        </script>
    </body>
    </html>
  `)
})

export default app