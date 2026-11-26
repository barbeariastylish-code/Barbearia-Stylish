/* =========================================================
   Barbearia Stylish — site público
   Serviços, agendamento em 4 etapas e histórico local.
   ========================================================= */

/* ---------- Dados padrão ---------- */

const DEFAULT_SERVICES = [
    { id: 1,  name: 'Corte social',          description: 'Acabamento perfeito e bem destacado',                      duration: 30, price: 20 },
    { id: 5,  name: 'Corte degradê',         description: 'Perfeição em cada detalhe',                                duration: 45, price: 25 },
    { id: 14, name: 'Pezinho + sobrancelha', description: 'Precisão e qualidade',                                     duration: 15, price: 10 },
    { id: 15, name: 'Corte + pigmentação',   description: 'Resultado 100% positivo',                                  duration: 55, price: 50 },
    { id: 16, name: 'Corte + luzes',         description: 'Perfeição em cada resultado',                              duration: 90, price: 80 },
    { id: 13, name: 'Nevou',                 description: 'Descoloração platinada completa, com sobrancelha inclusa', duration: 90, price: 120 }
];

// Horário de funcionamento por dia da semana (0 = domingo ... 6 = sábado)
const BUSINESS_HOURS = {
    weekday:        { open: '08:00', close: '19:30' },
    fridaySaturday: { open: '08:00', close: '20:30' },
    sunday:         { open: '08:00', close: '19:30' }
};

const WHATSAPP_NUMBER = '558695125698';
const SLOT_MINUTES = 30;     // intervalo entre horários exibidos
const DAYS_AHEAD = 21;       // quantos dias aparecem para escolha
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------- Estado ---------- */

const state = {
    services: [],
    settings: {},
    selected: [],          // serviços escolhidos
    date: null,            // 'AAAA-MM-DD'
    time: null,            // 'HH:MM'
    client: { name: '', phone: '' },
    step: 1,
    occupied: {},          // horários ocupados do dia escolhido
    availabilityRef: null,
    loadingSlots: false,
    slotsError: ''
};

/* ---------- Atalhos ---------- */

const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const formatPrice = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const onlyDigits = text => String(text).replace(/\D/g, '');
const sumOf = (list, key) => list.reduce((total, item) => total + item[key], 0);

// Evita que textos digitados pelo usuário virem HTML
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateBR(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateLong(iso) {
    const date = new Date(`${iso}T12:00:00`);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function toHHMM(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

// Máscara de telefone: (86) 99999-9999
function maskPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

/* ---------- Aviso rápido (toast) ---------- */

let toastTimer;
function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function setStepError(step, message = '') {
    const box = $(`[data-error="${step}"]`);
    if (box) box.textContent = message;
}

/* ---------- Inicialização ---------- */

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadSettings();

    renderServices();
    renderSelected();
    renderDays();
    renderHeroStatus();

    setupMenu();
    setupBooking();
    setupHistory();

    $('#year').textContent = new Date().getFullYear();
});

// Serviços: usa os padrões, mesclando ajustes salvos pelo painel admin
function loadServices() {
    const stored = readJSON('barbershop_services', []);
    state.services = DEFAULT_SERVICES.map(base => {
        const saved = stored.find(service => service.id === base.id);
        return saved ? { ...saved, ...base } : base;
    });
}

function loadSettings() {
    const stored = readJSON('barbershop_settings', {});
    state.settings = {
        intervalMinutes: 10,
        closedDays: [],
        ...stored,
        whatsappNumber: WHATSAPP_NUMBER
    };
}

/* ---------- Menu mobile ---------- */

function setupMenu() {
    const toggle = $('#menuToggle');
    const nav = $('#mainNav');

    const setOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        $('.sr-only', toggle).textContent = open ? 'Fechar menu' : 'Abrir menu';
        nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', nav).forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setOpen(false);
    });
}

/* ---------- Status no topo ("aberto agora") ---------- */

function getBusinessHours(isoDate) {
    const day = new Date(`${isoDate}T12:00:00`).getDay();
    if (day === 5 || day === 6) return BUSINESS_HOURS.fridaySaturday;
    if (day === 0) return BUSINESS_HOURS.sunday;
    return BUSINESS_HOURS.weekday;
}

function isClosedDay(isoDate) {
    const day = new Date(`${isoDate}T12:00:00`).getDay();
    return (state.settings.closedDays || []).includes(day);
}

function renderHeroStatus() {
    const box = $('#heroStatus');
    const now = new Date();
    const today = toISODate(now);
    const hours = getBusinessHours(today);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const isOpen = !isClosedDay(today) && nowMin >= toMinutes(hours.open) && nowMin < toMinutes(hours.close);

    box.classList.toggle('is-open', isOpen);
    box.textContent = isOpen
        ? `Aberto agora, até ${hours.close}`
        : 'Fechado agora. Você já pode agendar para o próximo dia.';
}

/* ---------- Lista de serviços ---------- */

function renderServices() {
    $('#servicesList').innerHTML = state.services.map(service => `
        <li>
            <button class="service" type="button" data-service="${service.id}" aria-pressed="false">
                <span class="service__name">${escapeHtml(service.name)}</span>
                <span class="service__desc">${escapeHtml(service.description)}</span>
                <span class="service__time">${service.duration} min</span>
                <span class="service__price">${formatPrice(service.price)}</span>
                <span class="service__check" aria-hidden="true"></span>
            </button>
        </li>
    `).join('');

    $('#servicesList').addEventListener('click', event => {
        const button = event.target.closest('[data-service]');
        if (button) toggleService(Number(button.dataset.service));
    });
}

function toggleService(id) {
    const index = state.selected.findIndex(service => service.id === id);
    if (index === -1) {
        state.selected.push(state.services.find(service => service.id === id));
    } else {
        state.selected.splice(index, 1);
    }
    setStepError(1);
    renderSelected();
}

// Atualiza: cartões marcados, etapa 1 e barra fixa
function renderSelected() {
    const ids = state.selected.map(service => service.id);
    $$('[data-service]').forEach(button => {
        button.setAttribute('aria-pressed', String(ids.includes(Number(button.dataset.service))));
    });

    const box = $('#selectedServices');
    const totalPrice = sumOf(state.selected, 'price');
    const totalTime = sumOf(state.selected, 'duration');

    if (!state.selected.length) {
        box.innerHTML = `
            <p class="muted">Nenhum serviço escolhido ainda.</p>
            <a class="link" href="#servicos">Ver serviços e preços</a>
        `;
    } else {
        box.innerHTML = `
            <ul class="picked__list">
                ${state.selected.map(service => `
                    <li>
                        <span>${escapeHtml(service.name)}</span>
                        <span class="picked__price">${formatPrice(service.price)}</span>
                        <button class="picked__remove" type="button" data-remove="${service.id}" aria-label="Remover ${escapeHtml(service.name)}">×</button>
                    </li>
                `).join('')}
            </ul>
            <p class="picked__total"><span>Total, ${totalTime} min</span><strong>${formatPrice(totalPrice)}</strong></p>
            <a class="link" href="#servicos">Adicionar outro serviço</a>
        `;
    }

    // Barra fixa
    const cart = $('#cartBar');
    const count = state.selected.length;
    cart.hidden = count === 0 || state.step === 5;
    updateCartVisibility();
    $('#cartCount').textContent = `${count} ${count === 1 ? 'serviço' : 'serviços'}, ${totalTime} min`;
    $('#cartTotal').textContent = formatPrice(totalPrice);
}

/* ---------- Agendamento ---------- */

function updateCartVisibility() {
    const rect = $('#agendar').getBoundingClientRect();
    const middle = window.innerHeight / 2;
    $('#cartBar').classList.toggle('is-tucked', rect.top < middle && rect.bottom > middle);
}

function setupBooking() {
    // Botões "Continuar" / "Voltar"
    $$('[data-go]').forEach(button => {
        button.addEventListener('click', () => goToStep(Number(button.dataset.go)));
    });

    // Remover serviço na etapa 1
    $('#selectedServices').addEventListener('click', event => {
        const button = event.target.closest('[data-remove]');
        if (button) toggleService(Number(button.dataset.remove));
    });

    // Barra fixa: vai direto para a próxima etapa útil
    $('#cartGo').addEventListener('click', event => {
        event.preventDefault();
        goToStep(state.step === 1 ? 2 : state.step, { scroll: true });
    });

    // Escolha de dia e horário
    $('#daysList').addEventListener('click', event => {
        const button = event.target.closest('[data-date]');
        if (button && !button.disabled) selectDate(button.dataset.date);
    });
    $('#timeSlots').addEventListener('click', event => {
        const button = event.target.closest('[data-time]');
        if (button && !button.disabled) selectTime(button.dataset.time);
    });

    // Dados do cliente
    $('#clientPhone').addEventListener('input', event => {
        event.target.value = maskPhone(event.target.value);
    });
    $('#bookingForm').addEventListener('submit', event => {
        event.preventDefault();
        goToStep(4);
    });

    $('#confirmBtn').addEventListener('click', confirmBooking);
    $('#resetBtn').addEventListener('click', resetBooking);

    // Esconde a barra fixa enquanto o agendamento ocupa o meio da tela
    window.addEventListener('scroll', updateCartVisibility, { passive: true });
    window.addEventListener('resize', updateCartVisibility);
    updateCartVisibility();
}

function validateStep(target) {
    if (target >= 2 && !state.selected.length) {
        setStepError(1, 'Escolha pelo menos um serviço para continuar.');
        return 1;
    }
    if (target >= 3 && (!state.date || !state.time)) {
        setStepError(2, state.date ? 'Escolha um horário.' : 'Escolha um dia e um horário.');
        return 2;
    }
    if (target >= 4) {
        const name = $('#clientName').value.trim();
        const phone = $('#clientPhone').value.trim();
        if (name.length < 2) {
            setStepError(3, 'Digite seu nome.');
            $('#clientName').focus();
            return 3;
        }
        if (onlyDigits(phone).length < 10) {
            setStepError(3, 'Digite um WhatsApp com DDD, por exemplo (86) 99999-9999.');
            $('#clientPhone').focus();
            return 3;
        }
        state.client = { name, phone };
    }
    return target;
}

function goToStep(target, { scroll = false } = {}) {
    // Voltar nunca precisa de validação
    const step = target > state.step ? validateStep(target) : target;
    if (step < target) {
        // Mostra a etapa onde falta algo
        showStep(step);
        if (scroll) scrollToBooking();
        return;
    }

    [1, 2, 3, 4].forEach(n => { if (n !== step) setStepError(n); });
    if (step === 4) renderSummary();
    showStep(step);
    if (scroll) scrollToBooking();
}

function showStep(step) {
    const changed = state.step !== step;
    state.step = step;

    $$('.step').forEach(panel => {
        panel.classList.toggle('is-active', Number(panel.dataset.step) === step);
    });
    $$('.steps__item').forEach((item, index) => {
        const n = index + 1;
        item.classList.toggle('is-current', n === step);
        item.classList.toggle('is-done', n < step);
        if (n === step) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
    });

    renderSelected();
    // Leva o foco para o painel, ajudando quem usa teclado ou leitor de tela
    if (changed) $('#bookingPanel').focus({ preventScroll: true });
}

function scrollToBooking() {
    $('#agendar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Dias ---------- */

function renderDays() {
    const today = new Date();
    const buttons = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const iso = toISODate(date);
        const closed = isClosedDay(iso);
        const label = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : WEEKDAYS[date.getDay()];

        buttons.push(`
            <button class="day" type="button" data-date="${iso}" aria-pressed="false" ${closed ? 'disabled' : ''}
                    aria-label="${formatDateLong(iso)}${closed ? ', fechado' : ''}">
                <span class="day__week">${label}</span>
                <span class="day__num">${date.getDate()}</span>
                <span class="day__month">${closed ? 'fechado' : MONTHS[date.getMonth()]}</span>
            </button>
        `);
    }

    $('#daysList').innerHTML = buttons.join('');
}

function selectDate(iso) {
    state.date = iso;
    state.time = null;
    setStepError(2);
    $$('[data-date]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.date === iso));
    });
    subscribeToAvailability(iso);
}

/* ---------- Horários ---------- */

function buildSlots(iso) {
    const hours = getBusinessHours(iso);
    const start = toMinutes(hours.open);
    const end = toMinutes(hours.close);

    // Se for hoje, esconde horários que já passaram (com 15 min de folga)
    const now = new Date();
    const minStart = iso === toISODate(now) ? now.getHours() * 60 + now.getMinutes() + 15 : 0;

    const slots = [];
    for (let minute = start; minute < end; minute += SLOT_MINUTES) {
        if (minute < minStart) continue;
        const time = toHHMM(minute);
        slots.push({ time, free: state.occupied[time] !== true });
    }
    return slots;
}

function renderSlots() {
    const box = $('#timeSlots');

    if (!state.date) {
        box.innerHTML = '<p class="muted">Escolha um dia para ver os horários livres.</p>';
        return;
    }
    if (state.loadingSlots) {
        box.innerHTML = '<p class="muted">Carregando horários…</p>';
        return;
    }
    if (state.slotsError) {
        box.innerHTML = `<p class="muted">${escapeHtml(state.slotsError)}</p>`;
        return;
    }

    const slots = buildSlots(state.date);
    if (!slots.some(slot => slot.free)) {
        box.innerHTML = '<p class="muted">Não sobrou horário livre nesse dia. Escolha outro dia.</p>';
        return;
    }

    box.innerHTML = slots.map(slot => `
        <button class="slot" type="button" data-time="${slot.time}"
                aria-pressed="${state.time === slot.time}" ${slot.free ? '' : 'disabled'}
                ${slot.free ? '' : `aria-label="${slot.time}, ocupado"`}>
            ${slot.time}
        </button>
    `).join('');
}

function selectTime(time) {
    if (state.occupied[time] === true) return;
    state.time = time;
    setStepError(2);
    $$('[data-time]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.time === time));
    });
}

// Escuta, em tempo real, os horários ocupados do dia no Firebase
function subscribeToAvailability(iso) {
    if (state.availabilityRef) {
        state.availabilityRef.off();
        state.availabilityRef = null;
    }

    state.occupied = {};
    state.loadingSlots = true;
    state.slotsError = '';
    renderSlots();

    window.bookingFirebaseReady.then(isReady => {
        if (state.date !== iso) return;
        if (!isReady) {
            state.loadingSlots = false;
            state.slotsError = 'O agendamento online está indisponível no momento. Chame a gente no WhatsApp.';
            renderSlots();
            return;
        }

        state.availabilityRef = window.bookingDatabase.ref(`occupiedSlots/${iso}`);
        state.availabilityRef.on('value', snapshot => {
            if (state.date !== iso) return;
            state.occupied = snapshot.val() || {};
            state.loadingSlots = false;
            state.slotsError = '';
            if (state.time && state.occupied[state.time] === true) {
                state.time = null;
                showToast('O horário que você escolheu acabou de ser reservado. Escolha outro.');
            }
            renderSlots();
        }, () => {
            if (state.date !== iso) return;
            state.loadingSlots = false;
            state.slotsError = 'Não foi possível carregar os horários. Tente de novo em instantes.';
            renderSlots();
        });
    }).catch(error => {
        if (state.date !== iso) return;
        console.error('Falha ao iniciar o Firebase:', error);
        state.loadingSlots = false;

        const messages = {
            'auth/operation-not-allowed': 'Ative o login Anônimo em Authentication > Método de login no Firebase.',
            'auth/admin-restricted-operation': 'Ative o login Anônimo em Authentication > Método de login no Firebase.',
            'auth/unauthorized-domain': 'Autorize o domínio deste site em Authentication > Configurações > Domínios autorizados.'
        };
        state.slotsError = messages[error.code]
            || `Não foi possível conectar ao sistema de agendamento (${error.code || 'erro de conexão'}).`;
        renderSlots();
    });
}

/* ---------- Revisão e confirmação ---------- */

function renderSummary() {
    const totalPrice = sumOf(state.selected, 'price');
    const totalTime = sumOf(state.selected, 'duration');

    $('#bookingSummary').innerHTML = `
        <dl class="summary">
            <div><dt>Quando</dt><dd>${formatDateLong(state.date)}, às ${state.time}</dd></div>
            <div><dt>Nome</dt><dd>${escapeHtml(state.client.name)}</dd></div>
            <div><dt>WhatsApp</dt><dd>${escapeHtml(state.client.phone)}</dd></div>
            <div>
                <dt>Serviços</dt>
                <dd>
                    <ul class="summary__services">
                        ${state.selected.map(service => `
                            <li><span>${escapeHtml(service.name)}</span><span>${formatPrice(service.price)}</span></li>
                        `).join('')}
                    </ul>
                </dd>
            </div>
            <div class="summary__total"><dt>Total, ${totalTime} min</dt><dd>${formatPrice(totalPrice)}</dd></div>
        </dl>
    `;
}

async function confirmBooking() {
    const button = $('#confirmBtn');
    if (button.disabled) return;

    // Abre a aba já no clique (evita bloqueio de pop-up); o endereço é definido depois
    const whatsappWindow = window.open('about:blank', '_blank');

    button.disabled = true;
    button.textContent = 'Reservando…';
    setStepError(4);

    const booking = {
        id: Date.now(),
        clientName: state.client.name,
        clientPhone: state.client.phone,
        services: state.selected,
        date: state.date,
        time: state.time,
        totalDuration: sumOf(state.selected, 'duration'),
        totalPrice: sumOf(state.selected, 'price'),
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };

    const restoreButton = () => {
        button.disabled = false;
        button.textContent = 'Confirmar agendamento';
    };

    try {
        const isReady = await window.bookingFirebaseReady;
        if (!isReady) throw new Error('Firebase não configurado');

        // Transação: só reserva se o horário ainda estiver livre
        const result = await window.bookingDatabase
            .ref(`occupiedSlots/${booking.date}/${booking.time}`)
            .transaction(current => (current === null ? true : undefined));

        if (!result.committed) {
            if (whatsappWindow) whatsappWindow.close();
            restoreButton();
            state.time = null;
            showStep(2);
            renderSlots();
            setStepError(2, 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.');
            return;
        }
    } catch (error) {
        console.error(error);
        if (whatsappWindow) whatsappWindow.close();
        restoreButton();
        setStepError(4, 'Não foi possível salvar o agendamento. Confira sua internet e tente de novo.');
        return;
    }

    // Os detalhes ficam salvos neste aparelho; o banco guarda só a ocupação dos horários
    const bookings = readJSON('barbershop_bookings', []);
    bookings.push(booking);
    localStorage.setItem('barbershop_bookings', JSON.stringify(bookings));

    sendWhatsAppNotification(booking, whatsappWindow);
    restoreButton();

    $('#doneText').textContent =
        `${formatDateLong(booking.date)}, às ${booking.time}. O horário já está bloqueado na agenda. ` +
        'Envie a mensagem que abrimos no WhatsApp para o barbeiro ficar sabendo.';
    showStep(5);
}

function sendWhatsAppNotification(booking, targetWindow = null) {
    const message = [
        '📅 Novo agendamento!',
        `Cliente: ${booking.clientName}`,
        `Telefone: ${booking.clientPhone}`,
        `Serviço: ${booking.services.map(service => service.name).join(' + ')}`,
        `Data: ${formatDateBR(booking.date)}`,
        `Horário: ${booking.time}`,
        `Valor: ${formatPrice(booking.totalPrice)}`
    ].join('\n');

    const url = `https://wa.me/${state.settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
    if (targetWindow) targetWindow.location.href = url;
    else window.open(url, '_blank');
}

function resetBooking() {
    state.selected = [];
    state.date = null;
    state.time = null;
    state.client = { name: '', phone: '' };
    if (state.availabilityRef) {
        state.availabilityRef.off();
        state.availabilityRef = null;
    }

    $('#bookingForm').reset();
    $$('[data-date]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    renderSlots();
    showStep(1);
    $('#servicos').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- Histórico (neste aparelho) ---------- */

const STATUS_LABEL = { confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado' };

function setupHistory() {
    const input = $('#historyPhone');
    input.addEventListener('input', () => { input.value = maskPhone(input.value); });

    $('#historyForm').addEventListener('submit', event => {
        event.preventDefault();
        const box = $('#lookupHistory');
        const phone = onlyDigits(input.value);

        if (phone.length < 10) {
            box.innerHTML = '<p class="muted-light">Digite o WhatsApp com DDD.</p>';
            input.focus();
            return;
        }

        const bookings = readJSON('barbershop_bookings', [])
            .filter(booking => onlyDigits(booking.clientPhone) === phone)
            .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

        if (!bookings.length) {
            box.innerHTML = '<p class="muted-light">Nenhum agendamento com esse número neste aparelho.</p>';
            return;
        }

        box.innerHTML = `
            <ul class="history__list">
                ${bookings.map(booking => `
                    <li>
                        <strong>${escapeHtml(booking.services.map(service => service.name).join(' + '))}</strong>
                        <span>${formatDateBR(booking.date)} às ${escapeHtml(booking.time)}</span>
                        <span class="history__meta">${STATUS_LABEL[booking.status] || escapeHtml(booking.status)}, ${formatPrice(booking.totalPrice)}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    });
}
