// Legal Case Management System - Frontend Application

class LegalCaseApp {
    constructor() {
        this.currentView = 'dashboard'
        this.currentPage = 1
        this.pageLimit = 10
        this.officers = []
        this.clients = []
        this.caseStatuses = []
        this.cases = []
        
        this.init()
    }
    
    async init() {
        await this.loadInitialData()
        this.setupEventListeners()
        this.showView('dashboard')
    }
    
    async loadInitialData() {
        try {
            // Load reference data
            const [officersRes, clientsRes, statusesRes] = await Promise.all([
                axios.get('/api/officers'),
                axios.get('/api/clients'),
                axios.get('/api/case-statuses')
            ])
            
            this.officers = officersRes.data.data
            this.clients = clientsRes.data.data
            this.caseStatuses = statusesRes.data.data
        } catch (error) {
            console.error('Failed to load initial data:', error)
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-nav]')) {
                e.preventDefault()
                const view = e.target.getAttribute('data-nav')
                this.showView(view)
            }
            
            // Action buttons
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action')
                const id = e.target.getAttribute('data-id')
                this.handleAction(action, id, e.target)
            }
        })
        
        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('form[data-form]')) {
                e.preventDefault()
                const formType = e.target.getAttribute('data-form')
                this.handleFormSubmit(formType, e.target)
            }
        })
    }
    
    async showView(view) {
        this.currentView = view
        
        // Update navigation
        document.querySelectorAll('[data-nav]').forEach(nav => {
            nav.classList.remove('bg-blue-100', 'text-blue-900')
            nav.classList.add('text-gray-600', 'hover:text-gray-900')
        })
        
        const activeNav = document.querySelector(`[data-nav="${view}"]`)
        if (activeNav) {
            activeNav.classList.add('bg-blue-100', 'text-blue-900')
            activeNav.classList.remove('text-gray-600', 'hover:text-gray-900')
        }
        
        // Load view content
        let content = ''
        
        switch (view) {
            case 'dashboard':
                content = await this.renderDashboard()
                break
            case 'cases':
                content = await this.renderCases()
                break
            case 'clients':
                content = await this.renderClients()
                break
            case 'deadlines':
                content = await this.renderDeadlines()
                break
            case 'hearings':
                content = await this.renderHearings()
                break
            case 'time-tracking':
                content = await this.renderTimeTracking()
                break
            case 'financial':
                content = await this.renderFinancial()
                break
            case 'reports':
                content = await this.renderReports()
                break
            default:
                content = '<div class="text-center py-12"><h2 class="text-2xl text-gray-500">Page not found</h2></div>'
        }
        
        document.getElementById('app').innerHTML = this.renderLayout(content)
    }
    
    renderLayout(content) {
        return `
            <div class="min-h-screen bg-gray-50">
                <!-- Navigation -->
                <nav class="bg-white shadow-sm border-b">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center h-16">
                            <div class="flex items-center">
                                <i class="fas fa-gavel text-blue-600 text-2xl mr-3"></i>
                                <h1 class="text-xl font-semibold text-gray-900">Legal Case Management</h1>
                            </div>
                            <div class="flex space-x-1">
                                <a href="#" data-nav="dashboard" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-chart-line mr-1"></i> Dashboard
                                </a>
                                <a href="#" data-nav="cases" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-briefcase mr-1"></i> Cases
                                </a>
                                <a href="#" data-nav="clients" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-users mr-1"></i> Clients
                                </a>
                                <a href="#" data-nav="deadlines" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-calendar-exclamation mr-1"></i> Deadlines
                                </a>
                                <a href="#" data-nav="hearings" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-calendar-check mr-1"></i> Hearings
                                </a>
                                <a href="#" data-nav="time-tracking" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-clock mr-1"></i> Time
                                </a>
                                <a href="#" data-nav="financial" class="px-3 py-2 rounded-md text-sm font-medium">
                                    <i class="fas fa-dollar-sign mr-1"></i> Financial
                                </a>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <!-- Main Content -->
                <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    ${content}
                </main>
            </div>
        `
    }
    
    async renderDashboard() {
        try {
            const response = await axios.get('/api/dashboard')
            const data = response.data.data
            
            return `
                <div class="space-y-6">
                    <h2 class="text-2xl font-bold text-gray-900">Dashboard</h2>
                    
                    <!-- Statistics Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Total Cases</p>
                                    <p class="text-3xl font-bold text-gray-900">${data.total_cases}</p>
                                </div>
                                <div class="bg-blue-100 p-3 rounded-full">
                                    <i class="fas fa-briefcase text-blue-600"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Active Cases</p>
                                    <p class="text-3xl font-bold text-green-600">${data.active_cases}</p>
                                </div>
                                <div class="bg-green-100 p-3 rounded-full">
                                    <i class="fas fa-play text-green-600"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Total Clients</p>
                                    <p class="text-3xl font-bold text-purple-600">${data.total_clients}</p>
                                </div>
                                <div class="bg-purple-100 p-3 rounded-full">
                                    <i class="fas fa-users text-purple-600"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
                                    <p class="text-3xl font-bold text-red-600">${data.upcoming_deadlines}</p>
                                </div>
                                <div class="bg-red-100 p-3 rounded-full">
                                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Recent Cases -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Cases</h3>
                            </div>
                            <div class="divide-y">
                                ${data.recent_cases.map(c => `
                                    <div class="px-6 py-4">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium text-gray-900">${c.title}</p>
                                                <p class="text-sm text-gray-500">${c.case_number} • ${c.client_name}</p>
                                            </div>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background-color: ${c.status_color}20; color: ${c.status_color}">
                                                ${c.status_name}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Urgent Deadlines -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b">
                                <h3 class="text-lg font-semibold text-gray-900">Urgent Deadlines</h3>
                            </div>
                            <div class="divide-y">
                                ${data.urgent_deadlines.map(d => `
                                    <div class="px-6 py-4">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium text-gray-900">${d.title}</p>
                                                <p class="text-sm text-gray-500">${d.case_number} • Due: ${this.formatDate(d.due_date)}</p>
                                            </div>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getPriorityClass(d.priority)}">
                                                ${d.priority}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Dashboard error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load dashboard data</p></div>'
        }
    }
    
    async renderCases() {
        try {
            const response = await axios.get(`/api/cases?page=${this.currentPage}&limit=${this.pageLimit}`)
            const { data, pagination } = response.data
            
            return `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Cases</h2>
                        <button data-action="new-case" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>New Case
                        </button>
                    </div>
                    
                    <!-- Cases Table -->
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Officer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${data.map(c => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div class="text-sm font-medium text-gray-900">${c.title}</div>
                                                <div class="text-sm text-gray-500">${c.case_number}</div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.client_name}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.primary_officer_name}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background-color: ${c.status_color}20; color: ${c.status_color}">
                                                ${c.status_name}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${c.case_type}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getPriorityClass(c.priority)}">
                                                ${c.priority}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button data-action="view-case" data-id="${c.id}" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                                            <button data-action="edit-case" data-id="${c.id}" class="text-green-600 hover:text-green-900">Edit</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        ${this.renderPagination(pagination)}
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Cases error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load cases</p></div>'
        }
    }
    
    async renderClients() {
        try {
            const response = await axios.get('/api/clients')
            const clients = response.data.data
            
            return `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Clients</h2>
                        <button data-action="new-client" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>New Client
                        </button>
                    </div>
                    
                    <!-- Clients Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${clients.map(client => `
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center justify-between mb-4">
                                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span class="text-blue-600 font-semibold">${this.getInitials(client.name)}</span>
                                    </div>
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.client_type === 'Corporation' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
                                        ${client.client_type}
                                    </span>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">${client.name}</h3>
                                ${client.company ? `<p class="text-sm text-gray-600 mb-2">${client.company}</p>` : ''}
                                ${client.email ? `<p class="text-sm text-gray-600 mb-1"><i class="fas fa-envelope mr-1"></i>${client.email}</p>` : ''}
                                ${client.phone ? `<p class="text-sm text-gray-600 mb-4"><i class="fas fa-phone mr-1"></i>${client.phone}</p>` : ''}
                                <div class="flex space-x-2">
                                    <button data-action="view-client" data-id="${client.id}" class="text-blue-600 hover:text-blue-900 text-sm">View Details</button>
                                    <button data-action="edit-client" data-id="${client.id}" class="text-green-600 hover:text-green-900 text-sm">Edit</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Clients error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load clients</p></div>'
        }
    }
    
    async renderDeadlines() {
        try {
            const response = await axios.get('/api/deadlines')
            const deadlines = response.data.data
            
            return `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Case Deadlines</h2>
                        <button data-action="new-deadline" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>New Deadline
                        </button>
                    </div>
                    
                    <!-- Deadlines List -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="divide-y divide-gray-200">
                            ${deadlines.map(deadline => {
                                const daysUntil = this.getDaysUntilDeadline(deadline.due_date)
                                const isOverdue = daysUntil < 0
                                const isUrgent = daysUntil >= 0 && daysUntil <= 3
                                
                                return `
                                    <div class="px-6 py-4 ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''}">
                                        <div class="flex items-center justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center space-x-3">
                                                    <input type="checkbox" ${deadline.completed ? 'checked' : ''} 
                                                           data-action="toggle-deadline" data-id="${deadline.id}"
                                                           class="h-4 w-4 text-blue-600 rounded">
                                                    <div class="flex-1">
                                                        <h4 class="text-sm font-medium text-gray-900 ${deadline.completed ? 'line-through text-gray-500' : ''}">${deadline.title}</h4>
                                                        <div class="text-sm text-gray-600">
                                                            <span>${deadline.case_number}</span>
                                                            <span class="mx-2">•</span>
                                                            <span>Due: ${this.formatDate(deadline.due_date)}</span>
                                                            ${deadline.due_time ? `<span class="mx-1">at ${deadline.due_time}</span>` : ''}
                                                        </div>
                                                        ${deadline.description ? `<p class="text-sm text-gray-600 mt-1">${deadline.description}</p>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="flex items-center space-x-3">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getPriorityClass(deadline.priority)}">
                                                    ${deadline.priority}
                                                </span>
                                                ${isOverdue ? 
                                                    '<span class="text-red-600 text-xs font-medium">OVERDUE</span>' :
                                                    isUrgent ?
                                                    '<span class="text-yellow-600 text-xs font-medium">URGENT</span>' :
                                                    `<span class="text-gray-500 text-xs">${daysUntil} days</span>`
                                                }
                                                <button data-action="edit-deadline" data-id="${deadline.id}" class="text-gray-400 hover:text-gray-600">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `
                            }).join('')}
                        </div>
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Deadlines error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load deadlines</p></div>'
        }
    }
    
    async renderHearings() {
        try {
            const response = await axios.get('/api/hearings')
            const hearings = response.data.data
            
            return `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Court Hearings</h2>
                        <button data-action="new-hearing" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>New Hearing
                        </button>
                    </div>
                    
                    <!-- Hearings Calendar View -->
                    <div class="bg-white rounded-lg shadow">
                        <div class="px-6 py-4 border-b">
                            <h3 class="text-lg font-semibold text-gray-900">Upcoming Hearings</h3>
                        </div>
                        <div class="divide-y divide-gray-200">
                            ${hearings.map(hearing => `
                                <div class="px-6 py-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1">
                                            <div class="flex items-start space-x-3">
                                                <div class="flex-shrink-0 w-12 text-center">
                                                    <div class="text-lg font-semibold text-gray-900">${new Date(hearing.hearing_date).getDate()}</div>
                                                    <div class="text-xs text-gray-500 uppercase">${new Date(hearing.hearing_date).toLocaleString('default', { month: 'short' })}</div>
                                                </div>
                                                <div class="flex-1">
                                                    <h4 class="text-sm font-medium text-gray-900">${hearing.title}</h4>
                                                    <div class="text-sm text-gray-600">
                                                        <span>${hearing.case_number}</span>
                                                        <span class="mx-2">•</span>
                                                        <span>${hearing.hearing_type}</span>
                                                    </div>
                                                    <div class="text-sm text-gray-600 mt-1">
                                                        <i class="fas fa-clock mr-1"></i>
                                                        ${hearing.hearing_time || 'Time TBD'}
                                                        <span class="mx-2">•</span>
                                                        <i class="fas fa-map-marker-alt mr-1"></i>
                                                        ${hearing.court_name}${hearing.courtroom ? `, ${hearing.courtroom}` : ''}
                                                    </div>
                                                    ${hearing.judge_name ? `<div class="text-sm text-gray-600">Judge: ${hearing.judge_name}</div>` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="flex items-center space-x-3">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusClass(hearing.status)}">
                                                ${hearing.status}
                                            </span>
                                            <button data-action="edit-hearing" data-id="${hearing.id}" class="text-gray-400 hover:text-gray-600">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Hearings error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load hearings</p></div>'
        }
    }
    
    async renderTimeTracking() {
        try {
            const response = await axios.get('/api/time-entries')
            const timeEntries = response.data.data
            
            return `
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Time Tracking</h2>
                        <button data-action="new-time-entry" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>Log Time
                        </button>
                    </div>
                    
                    <!-- Time Entries Table -->
                    <div class="bg-white rounded-lg shadow overflow-hidden">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Officer</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${timeEntries.map(entry => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatDate(entry.entry_date)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-900">${entry.case_number}</div>
                                            <div class="text-sm text-gray-500">${this.truncate(entry.case_title, 30)}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.officer_name}</td>
                                        <td class="px-6 py-4">
                                            <div class="text-sm text-gray-900">${entry.task_type}</div>
                                            <div class="text-sm text-gray-500">${this.truncate(entry.description, 50)}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.hours}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${entry.rate}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">$${(entry.hours * entry.rate).toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.billable ? (entry.billed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800') : 'bg-gray-100 text-gray-800'}">
                                                ${entry.billed ? 'Billed' : entry.billable ? 'Billable' : 'Non-billable'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Time tracking error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load time entries</p></div>'
        }
    }
    
    async renderFinancial() {
        try {
            const [retainersRes, expensesRes] = await Promise.all([
                axios.get('/api/retainers'),
                axios.get('/api/expenses')
            ])
            
            const retainers = retainersRes.data.data
            const expenses = expensesRes.data.data
            
            return `
                <div class="space-y-6">
                    <h2 class="text-2xl font-bold text-gray-900">Financial Management</h2>
                    
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Total Retainers</p>
                                    <p class="text-2xl font-bold text-green-600">$${retainers.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</p>
                                </div>
                                <div class="bg-green-100 p-3 rounded-full">
                                    <i class="fas fa-piggy-bank text-green-600"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Total Expenses</p>
                                    <p class="text-2xl font-bold text-red-600">$${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
                                </div>
                                <div class="bg-red-100 p-3 rounded-full">
                                    <i class="fas fa-receipt text-red-600"></i>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow p-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">Pending Invoices</p>
                                    <p class="text-2xl font-bold text-orange-600">$0</p>
                                </div>
                                <div class="bg-orange-100 p-3 rounded-full">
                                    <i class="fas fa-file-invoice-dollar text-orange-600"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Recent Retainers -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b flex justify-between items-center">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Retainers</h3>
                                <button data-action="new-retainer" class="text-blue-600 hover:text-blue-900 text-sm">
                                    <i class="fas fa-plus mr-1"></i>Add Retainer
                                </button>
                            </div>
                            <div class="divide-y divide-gray-200">
                                ${retainers.slice(0, 5).map(retainer => `
                                    <div class="px-6 py-4">
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <p class="font-medium text-gray-900">${retainer.client_name}</p>
                                                <p class="text-sm text-gray-500">${retainer.case_number} • ${this.formatDate(retainer.received_date)}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="font-medium text-green-600">$${retainer.amount.toLocaleString()}</p>
                                                <p class="text-sm text-gray-500">${retainer.payment_method}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Recent Expenses -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b flex justify-between items-center">
                                <h3 class="text-lg font-semibold text-gray-900">Recent Expenses</h3>
                                <button data-action="new-expense" class="text-blue-600 hover:text-blue-900 text-sm">
                                    <i class="fas fa-plus mr-1"></i>Add Expense
                                </button>
                            </div>
                            <div class="divide-y divide-gray-200">
                                ${expenses.slice(0, 5).map(expense => `
                                    <div class="px-6 py-4">
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <p class="font-medium text-gray-900">${expense.description}</p>
                                                <p class="text-sm text-gray-500">${expense.case_number} • ${expense.category}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="font-medium text-red-600">$${expense.amount.toLocaleString()}</p>
                                                <p class="text-sm text-gray-500">${this.formatDate(expense.expense_date)}</p>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `
        } catch (error) {
            console.error('Financial error:', error)
            return '<div class="text-center py-12"><p class="text-red-500">Failed to load financial data</p></div>'
        }
    }
    
    renderPagination(pagination) {
        if (pagination.pages <= 1) return ''
        
        const prevDisabled = pagination.page <= 1
        const nextDisabled = pagination.page >= pagination.pages
        
        return `
            <div class="bg-gray-50 px-6 py-3 border-t flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} results
                </div>
                <div class="flex space-x-2">
                    <button ${prevDisabled ? 'disabled' : ''} data-action="prev-page" 
                            class="px-3 py-1 border rounded text-sm ${prevDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}">
                        Previous
                    </button>
                    <button ${nextDisabled ? 'disabled' : ''} data-action="next-page" 
                            class="px-3 py-1 border rounded text-sm ${nextDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}">
                        Next
                    </button>
                </div>
            </div>
        `
    }
    
    async handleAction(action, id, element) {
        switch (action) {
            case 'new-case':
                this.showCaseForm()
                break
            case 'new-client':
                this.showClientForm()
                break
            case 'new-deadline':
                this.showDeadlineForm()
                break
            case 'new-hearing':
                this.showHearingForm()
                break
            case 'new-time-entry':
                this.showTimeEntryForm()
                break
            case 'toggle-deadline':
                await this.toggleDeadline(id, element.checked)
                break
            case 'prev-page':
                if (this.currentPage > 1) {
                    this.currentPage--
                    this.showView(this.currentView)
                }
                break
            case 'next-page':
                this.currentPage++
                this.showView(this.currentView)
                break
        }
    }
    
    async handleFormSubmit(formType, form) {
        const formData = new FormData(form)
        const data = Object.fromEntries(formData)
        
        try {
            let response
            switch (formType) {
                case 'case':
                    response = await axios.post('/api/cases', data)
                    break
                case 'client':
                    response = await axios.post('/api/clients', data)
                    break
                case 'deadline':
                    response = await axios.post('/api/deadlines', data)
                    break
                case 'hearing':
                    response = await axios.post('/api/hearings', data)
                    break
                case 'time-entry':
                    response = await axios.post('/api/time-entries', data)
                    break
            }
            
            if (response.data.success) {
                this.closeModal()
                this.showView(this.currentView) // Refresh current view
                this.showNotification('Success!', `${formType} created successfully`, 'success')
            }
        } catch (error) {
            console.error(`Form submission error:`, error)
            this.showNotification('Error', `Failed to create ${formType}`, 'error')
        }
    }
    
    async toggleDeadline(id, completed) {
        try {
            if (completed) {
                await axios.put(`/api/deadlines/${id}/complete`)
                this.showNotification('Success', 'Deadline marked as completed', 'success')
            }
        } catch (error) {
            console.error('Toggle deadline error:', error)
            this.showNotification('Error', 'Failed to update deadline', 'error')
        }
    }
    
    showCaseForm() {
        const modal = this.createModal('New Case', `
            <form data-form="case" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                        <select name="case_type" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Type</option>
                            <option value="Civil Litigation">Civil Litigation</option>
                            <option value="Criminal Defense">Criminal Defense</option>
                            <option value="Corporate Law">Corporate Law</option>
                            <option value="Family Law">Family Law</option>
                            <option value="Personal Injury">Personal Injury</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Employment Law">Employment Law</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
                        <select name="client_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Client</option>
                            ${this.clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Primary Officer</label>
                        <select name="primary_officer_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Officer</option>
                            ${this.officers.map(officer => `<option value="${officer.id}">${officer.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Case Value</label>
                        <input type="number" name="case_value" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Case</button>
                </div>
            </form>
        `)
        
        document.body.appendChild(modal)
    }
    
    showClientForm() {
        const modal = this.createModal('New Client', `
            <form data-form="client" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
                        <select name="client_type" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Individual">Individual</option>
                            <option value="Corporation">Corporation</option>
                            <option value="Non-Profit">Non-Profit</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" name="phone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" name="company" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea name="address" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Client</button>
                </div>
            </form>
        `)
        
        document.body.appendChild(modal)
    }
    
    showDeadlineForm() {
        const modal = this.createModal('New Deadline', `
            <form data-form="deadline" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Case</label>
                    <select name="case_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Case</option>
                        ${this.cases.map(c => `<option value="${c.id}">${c.case_number} - ${c.title}</option>`).join('')}
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input type="date" name="due_date" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
                        <input type="time" name="due_time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <input type="hidden" name="created_by" value="1">
                <input type="hidden" name="type" value="General">
                <input type="hidden" name="reminder_days" value="7">
                
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Deadline</button>
                </div>
            </form>
        `)
        
        document.body.appendChild(modal)
    }
    
    showHearingForm() {
        const modal = this.createModal('New Hearing', `
            <form data-form="hearing" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Case</label>
                    <select name="case_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Case</option>
                        ${this.cases.map(c => `<option value="${c.id}">${c.case_number} - ${c.title}</option>`).join('')}
                    </select>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Hearing Type</label>
                        <select name="hearing_type" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Type</option>
                            <option value="Arraignment">Arraignment</option>
                            <option value="Preliminary">Preliminary</option>
                            <option value="Motion">Motion</option>
                            <option value="Trial">Trial</option>
                            <option value="Settlement Conference">Settlement Conference</option>
                            <option value="Case Management">Case Management</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Hearing Date</label>
                        <input type="date" name="hearing_date" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                        <input type="time" name="hearing_time" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                        <input type="number" name="duration_minutes" value="60" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
                        <input type="text" name="court_name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
                        <input type="text" name="judge_name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create Hearing</button>
                </div>
            </form>
        `)
        
        document.body.appendChild(modal)
    }
    
    showTimeEntryForm() {
        const modal = this.createModal('Log Time Entry', `
            <form data-form="time-entry" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Case</label>
                        <select name="case_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Case</option>
                            ${this.cases.map(c => `<option value="${c.id}">${c.case_number} - ${c.title}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Officer</label>
                        <select name="officer_id" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Officer</option>
                            ${this.officers.map(officer => `<option value="${officer.id}" data-rate="${officer.hourly_rate}">${officer.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" name="entry_date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                        <input type="number" name="hours" step="0.25" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                        <input type="number" name="rate" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                    <select name="task_type" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Legal Research">Legal Research</option>
                        <option value="Court Appearance">Court Appearance</option>
                        <option value="Client Meeting">Client Meeting</option>
                        <option value="Document Review">Document Review</option>
                        <option value="Administrative">Administrative</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Email/Correspondence">Email/Correspondence</option>
                        <option value="Travel">Travel</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" required rows="3" placeholder="Describe the work performed..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                
                <div class="flex items-center">
                    <input type="checkbox" name="billable" id="billable" checked class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label for="billable" class="ml-2 block text-sm text-gray-900">Billable</label>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" data-action="close-modal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Log Time</button>
                </div>
            </form>
        `)
        
        document.body.appendChild(modal)
        
        // Auto-populate rate when officer is selected
        const officerSelect = modal.querySelector('select[name="officer_id"]')
        const rateInput = modal.querySelector('input[name="rate"]')
        
        officerSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0]
            if (selectedOption) {
                const rate = selectedOption.getAttribute('data-rate')
                if (rate) rateInput.value = rate
            }
        })
    }
    
    createModal(title, content) {
        const modal = document.createElement('div')
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    <button data-action="close-modal" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="px-6 py-4">
                    ${content}
                </div>
            </div>
        `
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.matches('[data-action="close-modal"]')) {
                this.closeModal()
            }
        })
        
        return modal
    }
    
    closeModal() {
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) modal.remove()
    }
    
    showNotification(title, message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        }
        
        const notification = document.createElement('div')
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 translate-x-full`
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-semibold">${title}</h4>
                    <p class="text-sm">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `
        
        document.body.appendChild(notification)
        
        // Slide in
        setTimeout(() => {
            notification.classList.remove('translate-x-full')
        }, 100)
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full')
            setTimeout(() => notification.remove(), 300)
        }, 5000)
    }
    
    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
    
    getDaysUntilDeadline(dueDateString) {
        const dueDate = new Date(dueDateString)
        const today = new Date()
        const diffTime = dueDate.getTime() - today.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
    
    getPriorityClass(priority) {
        const classes = {
            'Low': 'bg-green-100 text-green-800',
            'Medium': 'bg-yellow-100 text-yellow-800',
            'High': 'bg-red-100 text-red-800',
            'Critical': 'bg-red-200 text-red-900',
            'Urgent': 'bg-red-300 text-red-900'
        }
        return classes[priority] || 'bg-gray-100 text-gray-800'
    }
    
    getStatusClass(status) {
        const classes = {
            'New': 'bg-blue-100 text-blue-800',
            'Active': 'bg-green-100 text-green-800',
            'On Hold': 'bg-yellow-100 text-yellow-800',
            'Scheduled': 'bg-blue-100 text-blue-800',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
            'Postponed': 'bg-yellow-100 text-yellow-800'
        }
        return classes[status] || 'bg-gray-100 text-gray-800'
    }
    
    getInitials(name) {
        return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2)
    }
    
    truncate(text, length) {
        return text.length > length ? text.slice(0, length) + '...' : text
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LegalCaseApp()
})