// Default services
const defaultServices = [
    { id: 1, name: 'Corte social', description: 'Acabamento perfeito e bem destacado', duration: 30, price: 20.00 },
    { id: 5, name: 'Corte degradê', description: 'Perfeição em cada detalhe', duration: 45, price: 25.00 },
    { id: 14, name: 'Pezinho + sobrancelha', description: 'Precisão e qualidade', duration: 15, price: 10.00 },
    { id: 15, name: 'Corte + pigmentação', description: 'Resultado 100% positivo', duration: 55, price: 50.00 },
    { id: 16, name: 'Corte + luzes', description: 'Perfeição em cada resultado', duration: 90, price: 80.00 },
    { id: 13, name: 'Nevou', description: 'Descoloração platinada completa, com sobrancelha inclusa', duration: 90, price: 120.00 }
];

// State
let services = [];
let settings = {};
let financeChart = null;
let servicesChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadSettings();
    setupLogin();
    setupNavigation();
    setupForms();
});

// Load services
function loadServices() {
    const stored = localStorage.getItem('barbershop_services');
    const storedServices = stored ? JSON.parse(stored) : [];
    services = defaultServices.map(defaultService => {
        const storedService = storedServices.find(service => service.id === defaultService.id);
        return storedService ? { ...storedService, ...defaultService } : defaultService;
    });
}

// Save services
function saveServices() {
    localStorage.setItem('barbershop_services', JSON.stringify(services));
}

// Load settings
function loadSettings() {
    const stored = localStorage.getItem('barbershop_settings');
    settings = stored ? { ...JSON.parse(stored), whatsappNumber: '558695125698' } : {
        whatsappNumber: '558695125698',
        openTime: '08:00',
        closeTime: '19:30',
        intervalMinutes: 10,
        closedDays: []
    };
}

// Save settings
function saveSettings() {
    localStorage.setItem('barbershop_settings', JSON.stringify(settings));
}

// Setup login
function getAdminCredentials() {
    return {
        user: atob('aXNtYWVs'),
        pass: atob('aXNtYWVsMDA=')
    };
}

function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('adminUser').value;
        const pass = document.getElementById('adminPass').value;
        const expected = getAdminCredentials();
        
        if (user === expected.user && pass === expected.pass) {
            localStorage.setItem('barbershop_admin_logged', 'true');
            showDashboard();
        } else {
            alert('Usuário ou senha incorretos!');
        }
    });
    
    // Check if already logged in
    if (localStorage.getItem('barbershop_admin_logged') === 'true') {
        showDashboard();
    }
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadDashboard();
}

// Logout
function logout() {
    localStorage.removeItem('barbershop_admin_logged');
    location.reload();
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
}

// Switch section
function switchSection(sectionName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionName}`);
    });
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'agenda':
            loadAgenda();
            break;
        case 'financeiro':
            loadFinanceiro();
            break;
        case 'servicos':
            loadServicesAdmin();
            break;
        case 'configuracoes':
            loadConfiguracoes();
            break;
    }
}

// Setup forms
function setupForms() {
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettingsFromForm();
    });
    
    // Expense form
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveExpense();
    });
    
    // Service form
    document.getElementById('serviceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveService();
    });
}

// Load Dashboard
function loadDashboard() {
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
    
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    
    // Today's bookings
    const todayBookings = bookings.filter(b => b.date === today);
    document.getElementById('todayBookings').textContent = todayBookings.length;
    
    // Month revenue (from completed bookings)
    const monthBookings = bookings.filter(b => 
        b.date.startsWith(currentMonth) && b.status === 'completed'
    );
    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    document.getElementById('monthRevenue').textContent = formatCurrency(monthRevenue);
    
    // Month expenses
    const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + e.value, 0);
    
    // Month balance
    const monthBalance = monthRevenue - monthExpensesTotal;
    document.getElementById('monthBalance').textContent = formatCurrency(monthBalance);
    
    // Month clients
    const uniqueClients = new Set(monthBookings.map(b => b.clientPhone)).size;
    document.getElementById('monthClients').textContent = uniqueClients;
    
    // Charts
    loadFinanceChart();
    loadServicesChart();
}

// Load Finance Chart
function loadFinanceChart() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    const last6Months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        last6Months.push(date.toISOString().substring(0, 7));
    }
    
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
    
    const entradas = last6Months.map(month => {
        return bookings
            .filter(b => b.date.startsWith(month) && b.status === 'completed')
            .reduce((sum, b) => sum + b.totalPrice, 0);
    });
    
    const saidas = last6Months.map(month => {
        return expenses
            .filter(e => e.date.startsWith(month))
            .reduce((sum, e) => sum + e.value, 0);
    });
    
    if (financeChart) financeChart.destroy();
    
    financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last6Months.map(m => {
                const [year, month] = m.split('-');
                return `${month}/${year}`;
            }),
            datasets: [
                {
                    label: 'Entradas',
                    data: entradas,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                },
                {
                    label: 'Saídas',
                    data: saidas,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#b0b0b0',
                        callback: value => 'R$ ' + value.toFixed(0)
                    }
                },
                x: {
                    ticks: {
                        color: '#b0b0b0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Load Services Chart
function loadServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    const serviceCount = {};
    completedBookings.forEach(booking => {
        booking.services.forEach(service => {
            serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
        });
    });
    
    const sortedServices = Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (servicesChart) servicesChart.destroy();
    
    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedServices.map(s => s[0]),
            datasets: [{
                data: sortedServices.map(s => s[1]),
                backgroundColor: [
                    '#e21b2d',
                    '#1769d2',
                    '#c5cbd3',
                    '#b81224',
                    '#4b5563'
                ],
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Load Agenda
function loadAgenda() {
    const container = document.getElementById('agendaContainer');
    const dateInput = document.getElementById('agendaDate');
    const viewSelect = document.getElementById('agendaView');
    
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    dateInput.addEventListener('change', renderAgenda);
    viewSelect.addEventListener('change', renderAgenda);
    
    renderAgenda();
}

// Render Agenda
function renderAgenda() {
    const container = document.getElementById('agendaContainer');
    const selectedDate = document.getElementById('agendaDate').value;
    const view = document.getElementById('agendaView').value;
    
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    
    let filteredBookings = [];
    
    if (view === 'day') {
        filteredBookings = bookings.filter(b => b.date === selectedDate);
    } else if (view === 'week') {
        const date = new Date(selectedDate);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const startStr = startOfWeek.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        
        filteredBookings = bookings.filter(b => b.date >= startStr && b.date <= endStr);
    } else {
        const month = selectedDate.substring(0, 7);
        filteredBookings = bookings.filter(b => b.date.startsWith(month));
    }
    
    // Sort by date and time
    filteredBookings.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });
    
    if (filteredBookings.length === 0) {
        container.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        return;
    }
    
    container.innerHTML = filteredBookings.map(booking => {
        const [year, month, day] = booking.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        const servicesList = booking.services.map(s => s.name).join(', ');
        
        return `
            <div class="agenda-item ${booking.status}">
                <div class="agenda-info">
                    <h4>${booking.clientName}</h4>
                    <p>• ${formattedDate} às ${booking.time}</p>
                    <p>• ${servicesList}</p>
                    <p>• Valor: ${formatCurrency(booking.totalPrice)}</p>
                    <p>• Status: ${getStatusLabel(booking.status)}</p>
                </div>
                <div class="agenda-actions">
                    ${booking.status === 'confirmed' ? `
                        <button class="btn-success" onclick="updateBookingStatus(${booking.id}, 'completed')">Concluído</button>
                        <button class="btn-secondary" onclick="updateBookingStatus(${booking.id}, 'cancelled')">Cancelar</button>
                    ` : ''}
                    ${booking.status === 'completed' ? `
                        <button class="btn-secondary" onclick="updateBookingStatus(${booking.id}, 'confirmed')">Desfazer</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Get status label
function getStatusLabel(status) {
    const labels = {
        confirmed: 'Confirmado',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
}

// Update booking status
function updateBookingStatus(bookingId, newStatus) {
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const index = bookings.findIndex(b => b.id === bookingId);
    
    if (index !== -1) {
        bookings[index].status = newStatus;
        localStorage.setItem('barbershop_bookings', JSON.stringify(bookings));
        renderAgenda();
    }
}

// Load Financeiro
function loadFinanceiro() {
    showFinanceTab('entradas');
}

// Show finance tab
function showFinanceTab(tabName) {
    document.querySelectorAll('.finance-tab').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tabName));
    });
    
    if (tabName === 'entradas') {
        loadEntradas();
    } else if (tabName === 'saidas') {
        loadSaidas();
    } else if (tabName === 'resumo') {
        loadResumo();
    }
}

// Load Entradas
function loadEntradas() {
    const container = document.getElementById('entradasTable');
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    if (completedBookings.length === 0) {
        container.innerHTML = '<p>Nenhuma entrada registrada.</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Cliente</th>
                    <th>Serviços</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${completedBookings.map(b => {
                    const [year, month, day] = b.date.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    const servicesList = b.services.map(s => s.name).join(', ');
                    return `
                        <tr>
                            <td>${formattedDate}</td>
                            <td>${b.time}</td>
                            <td>${b.clientName}</td>
                            <td>${servicesList}</td>
                            <td>${formatCurrency(b.totalPrice)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Filter entradas
function filterEntradas() {
    loadEntradas();
}

// Load Saidas
function loadSaidas() {
    const container = document.getElementById('saidasTable');
    const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
    
    if (expenses.length === 0) {
        container.innerHTML = '<p>Nenhuma despesa registrada.</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(e => {
                    const [year, month, day] = e.date.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    return `
                        <tr>
                            <td>${formattedDate}</td>
                            <td>${e.category}</td>
                            <td>${e.description}</td>
                            <td>${formatCurrency(e.value)}</td>
                            <td>
                                <button class="btn-secondary" onclick="deleteExpense(${e.id})">Excluir</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Load Resumo
function loadResumo() {
    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
    
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalEntradas = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalSaidas = expenses.reduce((sum, e) => sum + e.value, 0);
    const saldo = totalEntradas - totalSaidas;
    
    document.getElementById('totalEntradas').textContent = formatCurrency(totalEntradas);
    document.getElementById('totalSaidas').textContent = formatCurrency(totalSaidas);
    document.getElementById('saldoLiquido').textContent = formatCurrency(saldo);
}

// Open expense modal
function openExpenseModal() {
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseModal').classList.add('active');
}

// Close expense modal
function closeExpenseModal() {
    document.getElementById('expenseModal').classList.remove('active');
    document.getElementById('expenseForm').reset();
}

// Save expense
function saveExpense() {
    const expense = {
        id: Date.now(),
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value,
        value: parseFloat(document.getElementById('expenseValue').value),
        date: document.getElementById('expenseDate').value
    };
    
    const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
    expenses.push(expense);
    localStorage.setItem('barbershop_expenses', JSON.stringify(expenses));
    
    closeExpenseModal();
    loadSaidas();
}

// Delete expense
function deleteExpense(expenseId) {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
        const expenses = JSON.parse(localStorage.getItem('barbershop_expenses') || '[]');
        const filtered = expenses.filter(e => e.id !== expenseId);
        localStorage.setItem('barbershop_expenses', JSON.stringify(filtered));
        loadSaidas();
    }
}

// Load Services Admin
function loadServicesAdmin() {
    const container = document.getElementById('servicesAdminList');
    
    container.innerHTML = services.map(service => `
        <div class="service-admin-item">
            <div class="service-admin-info">
                <h4>${service.name}</h4>
                <p>${service.description}</p>
                <p>• ${service.duration} min | ${formatCurrency(service.price)}</p>
            </div>
            <div class="service-admin-actions">
                <button class="btn-secondary" onclick="editService(${service.id})">Editar</button>
                <button class="btn-secondary" onclick="deleteService(${service.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Open service modal
function openServiceModal() {
    document.getElementById('serviceModalTitle').textContent = 'Novo Serviço';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceModal').classList.add('active');
}

// Close service modal
function closeServiceModal() {
    document.getElementById('serviceModal').classList.remove('active');
    document.getElementById('serviceForm').reset();
}

// Edit service
function editService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    document.getElementById('serviceModalTitle').textContent = 'Editar Serviço';
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceDescription').value = service.description;
    document.getElementById('serviceDuration').value = service.duration;
    document.getElementById('servicePrice').value = service.price;
    
    document.getElementById('serviceModal').classList.add('active');
}

// Save service
function saveService() {
    const serviceId = document.getElementById('serviceId').value;
    const serviceData = {
        id: serviceId ? parseInt(serviceId) : Date.now(),
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        duration: parseInt(document.getElementById('serviceDuration').value),
        price: parseFloat(document.getElementById('servicePrice').value)
    };
    
    if (serviceId) {
        const index = services.findIndex(s => s.id === parseInt(serviceId));
        if (index !== -1) {
            services[index] = serviceData;
        }
    } else {
        services.push(serviceData);
    }
    
    saveServices();
    closeServiceModal();
    loadServicesAdmin();
}

// Delete service
function deleteService(serviceId) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        services = services.filter(s => s.id !== serviceId);
        saveServices();
        loadServicesAdmin();
    }
}

// Load Configuracoes
function loadConfiguracoes() {
    document.getElementById('whatsappNumber').value = settings.whatsappNumber;
    document.getElementById('openTime').value = settings.openTime;
    document.getElementById('closeTime').value = settings.closeTime;
    document.getElementById('intervalMinutes').value = settings.intervalMinutes;
    
    // Set closed days checkboxes
    document.querySelectorAll('input[name="closedDays"]').forEach(checkbox => {
        checkbox.checked = settings.closedDays.includes(parseInt(checkbox.value));
    });
}

// Save settings from form
function saveSettingsFromForm() {
    settings.whatsappNumber = document.getElementById('whatsappNumber').value;
    settings.openTime = document.getElementById('openTime').value;
    settings.closeTime = document.getElementById('closeTime').value;
    settings.intervalMinutes = parseInt(document.getElementById('intervalMinutes').value);
    
    settings.closedDays = [];
    document.querySelectorAll('input[name="closedDays"]:checked').forEach(checkbox => {
        settings.closedDays.push(parseInt(checkbox.value));
    });
    
    saveSettings();
    alert('Configurações salvas com sucesso!');
}

// Format currency
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}