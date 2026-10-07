// Services data (default)
const defaultServices = [
    { id: 1, name: 'Corte social', description: 'Acabamento perfeito e bem destacado', duration: 30, price: 20.00 },
    { id: 5, name: 'Corte degradê', description: 'Perfeição em cada detalhe', duration: 45, price: 25.00 },
    { id: 14, name: 'Pezinho + sobrancelha', description: 'Precisão e qualidade', duration: 15, price: 10.00 },
    { id: 15, name: 'Corte + pigmentação', description: 'Resultado 100% positivo', duration: 55, price: 50.00 },
    { id: 16, name: 'Corte + luzes', description: 'Perfeição em cada resultado', duration: 90, price: 80.00 },
    { id: 13, name: 'Nevou', description: 'Descoloração platinada completa, com sobrancelha inclusa', duration: 90, price: 120.00 }
];

const businessHours = {
    weekday: { open: '08:00', close: '19:30' },
    fridaySaturday: { open: '08:00', close: '20:30' },
    sunday: { open: '08:00', close: '19:30' }
};

// State
let selectedServices = [];
let selectedDate = null;
let selectedTime = null;
let clientData = { name: '', phone: '' };
let services = [];
let settings = {};
let occupiedTimes = {};
let availabilityRef = null;
let availabilityLoading = false;
let availabilityError = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadSettings();
    renderServices();
    setupDateInput();
    setupPublicInteractions();
});

// Load services from localStorage or use defaults
function loadServices() {
    const stored = localStorage.getItem('barbershop_services');
    const storedServices = stored ? JSON.parse(stored) : [];
    services = defaultServices.map(defaultService => {
        const storedService = storedServices.find(service => service.id === defaultService.id);
        return storedService ? { ...storedService, ...defaultService } : defaultService;
    });
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

// Render services list
function renderServices() {
    const container = document.getElementById('servicesList');
    container.innerHTML = services.map(service => `
        <div class="service-card" onclick="toggleService(${service.id})" onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleService(${service.id}); }" id="service-${service.id}" role="button" tabindex="0" aria-pressed="false">
            <div class="service-icon" aria-hidden="true">${getServiceIcon(service.name)}</div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <div class="service-meta">
                <span class="service-duration">⏱ ${service.duration} min</span>
                <span class="service-price">R$ ${service.price.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `).join('');
}

function getServiceIcon(serviceName) {
    const name = serviceName.toLowerCase();
    if (name.includes('barba')) return '✦';
    if (name.includes('sobrancelha')) return '⌁';
    if (name.includes('platinado') || name.includes('coloração')) return '◈';
    if (name.includes('máquina')) return '▦';
    return '✂';
}

// Toggle service selection
function toggleService(serviceId) {
    const index = selectedServices.findIndex(s => s.id === serviceId);
    const service = services.find(s => s.id === serviceId);
    
    if (index === -1) {
        selectedServices.push(service);
        const card = document.getElementById(`service-${serviceId}`);
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
    } else {
        selectedServices.splice(index, 1);
        const card = document.getElementById(`service-${serviceId}`);
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    }
    
    updateSelectedServicesDisplay();
}

// Update selected services display
function updateSelectedServicesDisplay() {
    const container = document.getElementById('selectedServices');
    
    if (selectedServices.length === 0) {
        container.innerHTML = '<p>Nenhum serviço selecionado</p>';
        return;
    }
    
    container.innerHTML = selectedServices.map(service => `
        <div class="selected-service-item">
            <span>${service.name}</span>
            <button onclick="toggleService(${service.id})">&times;</button>
        </div>
    `).join('');
    
    const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    
    container.innerHTML += `
        <div class="selected-service-item" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
            <strong>Total: ${totalDuration} min</strong>
            <strong style="color: var(--primary-color)">R$ ${total.toFixed(2).replace('.', ',')}</strong>
        </div>
    `;
}

// Setup date input with minimum date as today
function setupDateInput() {
    const dateInput = document.getElementById('bookingDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    dateInput.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        selectedTime = null;
        subscribeToAvailability(selectedDate);
    });
}

// Render available time slots
function getBusinessHours(dateString) {
    const day = new Date(`${dateString}T12:00:00`).getDay();
    if (day === 5 || day === 6) return businessHours.fridaySaturday;
    if (day === 0) return businessHours.sunday;
    return businessHours.weekday;
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    
    if (!selectedDate) {
        container.innerHTML = '<p>Selecione uma data para ver os horários disponíveis</p>';
        return;
    }

    if (availabilityLoading) {
        container.innerHTML = '<p>Consultando horários disponíveis...</p>';
        return;
    }

    if (availabilityError) {
        container.innerHTML = `<p>${availabilityError}</p>`;
        return;
    }
    
    const hours = getBusinessHours(selectedDate);
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    
    const slots = [];
    let currentTime = openHour * 60 + openMin;
    const endTime = closeHour * 60 + closeMin;
    
    while (currentTime < endTime) {
        const hours = Math.floor(currentTime / 60);
        const minutes = currentTime % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        const isBooked = occupiedTimes[timeString] === true;
        slots.push({
            time: timeString,
            available: !isBooked
        });
        
        currentTime += 30;
    }
    
    container.innerHTML = slots.map(slot => `
        <div class="time-slot ${slot.available ? '' : 'disabled'} ${selectedTime === slot.time ? 'selected' : ''}" 
             onclick="${slot.available ? `selectTime('${slot.time}')` : ''}">
            ${slot.time}
        </div>
    `).join('');
}

function subscribeToAvailability(date) {
    if (availabilityRef) {
        availabilityRef.off();
        availabilityRef = null;
    }

    occupiedTimes = {};
    availabilityLoading = true;
    availabilityError = '';
    renderTimeSlots();

    window.bookingFirebaseReady.then(isReady => {
        if (selectedDate !== date) return;
        if (!isReady) {
            availabilityLoading = false;
            availabilityError = 'Agendamento online indisponível: configure a conexão com o Firebase.';
            renderTimeSlots();
            return;
        }

        availabilityRef = window.bookingDatabase.ref(`occupiedSlots/${date}`);
        availabilityRef.on('value', snapshot => {
            if (selectedDate !== date) return;
            occupiedTimes = snapshot.val() || {};
            availabilityLoading = false;
            availabilityError = '';
            if (selectedTime && occupiedTimes[selectedTime] === true) selectedTime = null;
            renderTimeSlots();
        }, () => {
            if (selectedDate !== date) return;
            availabilityLoading = false;
            availabilityError = 'Não foi possível carregar os horários. Tente novamente.';
            renderTimeSlots();
        });
    }).catch(error => {
        if (selectedDate !== date) return;
        availabilityLoading = false;
        console.error('Falha ao iniciar Firebase para os agendamentos:', error);
        if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
            availabilityError = 'Ative o login Anônimo em Authentication > Método de login no Firebase.';
        } else if (error.code === 'auth/unauthorized-domain') {
            availabilityError = 'Autorize o domínio deste site em Authentication > Configurações > Domínios autorizados.';
        } else {
            availabilityError = `Não foi possível conectar ao sistema de agendamento (${error.code || 'erro de conexão'}).`;
        }
        renderTimeSlots();
    });
}

// Select time slot
function selectTime(time) {
    if (occupiedTimes[time] === true) return;
    selectedTime = time;
    renderTimeSlots();
}

// Navigation between steps
function goToStep(stepNumber) {
    // Validation
    if (stepNumber === 2 && selectedServices.length === 0) {
        alert('Por favor, selecione pelo menos um serviço!');
        return;
    }
    
    if (stepNumber === 3 && (!selectedDate || !selectedTime)) {
        alert('Por favor, selecione data e horário!');
        return;
    }
    
    if (stepNumber === 4) {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        
        if (!name || !phone) {
            alert('Por favor, preencha nome e telefone!');
            return;
        }
        
        clientData = { name, phone };
        renderBookingSummary();
    }
    
    // Update active step
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.toggle('active', index + 1 === stepNumber);
    });
    updateBookingProgress(stepNumber);
}

function updateBookingProgress(stepNumber) {
    document.querySelectorAll('.booking-progress li').forEach((item, index) => {
        item.classList.toggle('current', index + 1 === stepNumber);
        item.classList.toggle('complete', index + 1 < stepNumber);
        item.setAttribute('aria-current', index + 1 === stepNumber ? 'step' : 'false');
    });
}

function setupPublicInteractions() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        window.setTimeout(() => loader.classList.add('loaded'), 450);
    }

    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!isOpen));
            menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
            mainNav.classList.toggle('open', !isOpen);
        });

        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.setAttribute('aria-label', 'Abrir menu');
                mainNav.classList.remove('open');
            });
        });
    }

    const revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, revealObserver) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        revealElements.forEach(element => observer.observe(element));
    } else {
        revealElements.forEach(element => element.classList.add('is-visible'));
    }
}

// Render booking summary
function renderBookingSummary() {
    const container = document.getElementById('bookingSummary');
    const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    
    const [year, month, day] = selectedDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    container.innerHTML = `
        <div class="summary-item">
            <span>Cliente:</span>
            <span>${clientData.name}</span>
        </div>
        <div class="summary-item">
            <span>Telefone:</span>
            <span>${clientData.phone}</span>
        </div>
        <div class="summary-item">
            <span>Data:</span>
            <span>${formattedDate}</span>
        </div>
        <div class="summary-item">
            <span>Horário:</span>
            <span>${selectedTime}</span>
        </div>
        <div class="summary-item">
            <span>Serviços:</span>
        </div>
        ${selectedServices.map(s => `
            <div class="summary-item" style="padding-left: 20px; font-size: 0.9rem;">
                <span>${s.name} (${s.duration} min)</span>
                <span>R$ ${s.price.toFixed(2).replace('.', ',')}</span>
            </div>
        `).join('')}
        <div class="summary-item">
            <span>Total:</span>
            <span>${totalDuration} min | R$ ${total.toFixed(2).replace('.', ',')}</span>
        </div>
    `;
}

// Confirm booking
async function confirmBooking() {
    const whatsappWindow = window.open('about:blank', '_blank');
    const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
    
    const booking = {
        id: Date.now(),
        clientName: clientData.name,
        clientPhone: clientData.phone,
        services: selectedServices,
        date: selectedDate,
        time: selectedTime,
        totalDuration,
        totalPrice: total,
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };
    
    try {
        const isReady = await window.bookingFirebaseReady;
        if (!isReady) throw new Error('Firebase não configurado');

        const slotResult = await window.bookingDatabase
            .ref(`occupiedSlots/${selectedDate}/${selectedTime}`)
            .transaction(current => current === null ? true : undefined);

        if (!slotResult.committed) {
            if (whatsappWindow) whatsappWindow.close();
            selectedTime = null;
            alert('Esse horário acabou de ser reservado. Escolha outro horário disponível.');
            return;
        }
    } catch (error) {
        if (whatsappWindow) whatsappWindow.close();
        alert('Não foi possível salvar seu agendamento. Verifique sua conexão e tente novamente.');
        return;
    }

    // Save booking details on this device; the shared database stores availability only.
    const allBookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]');
    allBookings.push(booking);
    localStorage.setItem('barbershop_bookings', JSON.stringify(allBookings));
    renderClientHistory(booking.clientPhone);
    
    // Send WhatsApp notification to barber
    sendWhatsAppNotification(booking, whatsappWindow);
    
    // Show success
    goToStep(5);
}

function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}

function renderClientHistory(phone, targetId = 'clientHistory') {
    const container = document.getElementById(targetId);
    if (!container) return;

    const bookings = JSON.parse(localStorage.getItem('barbershop_bookings') || '[]')
        .filter(booking => normalizePhone(booking.clientPhone) === normalizePhone(phone))
        .sort((first, second) => `${second.date} ${second.time}`.localeCompare(`${first.date} ${first.time}`));

    container.hidden = false;
    container.innerHTML = `
        <h4>Meus cortes</h4>
        <div class="history-list">
            ${bookings.map(booking => {
                const [year, month, day] = booking.date.split('-');
                return `<div class="history-item"><strong>${booking.services.map(service => service.name).join(' + ')}</strong><span>${day}/${month}/${year} às ${booking.time}</span><small>${formatBookingStatus(booking.status)} · R$ ${booking.totalPrice.toFixed(2).replace('.', ',')}</small></div>`;
            }).join('')}
        </div>
    `;
}

function lookupClientHistory() {
    const phone = document.getElementById('historyPhone').value.trim();
    if (!phone) {
        alert('Digite seu WhatsApp para consultar seus cortes.');
        return;
    }

    renderClientHistory(phone, 'lookupHistory');
}

function formatBookingStatus(status) {
    return { confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado' }[status] || status;
}

// Send WhatsApp notification
function sendWhatsAppNotification(booking, targetWindow = null) {
    const [year, month, day] = booking.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    const servicesList = booking.services.map(s => s.name).join(' + ');
    
    const message = `📅 Novo agendamento!
Cliente: ${booking.clientName}
Telefone: ${booking.clientPhone}
Serviço: ${servicesList}
Data: ${formattedDate}
Horário: ${booking.time}
Valor: R$ ${booking.totalPrice.toFixed(2).replace('.', ',')}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodedMessage}`;
    
    // Reuse the window opened before the async reservation request.
    if (targetWindow) targetWindow.location.href = whatsappUrl;
    else window.open(whatsappUrl, '_blank');
}

// Reset booking
function resetBooking() {
    selectedServices = [];
    selectedDate = null;
    selectedTime = null;
    clientData = { name: '', phone: '' };
    
    document.getElementById('bookingDate').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    });
    
    updateSelectedServicesDisplay();
    goToStep(1);
}