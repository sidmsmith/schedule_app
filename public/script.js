function pulseLegendForUtilization(utilizationInput) {
  const utilization = typeof utilizationInput === 'number'
    ? utilizationInput
    : utilizationInput
      ? calculateUtilizationFromMeta(utilizationInput)
      : null;
  if (utilization === null || Number.isNaN(utilization)) return;
  pulseLegendDot(getLegendClass(utilization));
}

function calculateUtilizationFromMeta(meta) {
  const match = typeof meta === 'string' ? meta.match(/(\d+)\s*\/\s*(\d+)/) : null;
  if (!match) return null;
  const total = Number(match[1]);
  const capacity = Number(match[2]);
  if (!capacity) return null;
  return (total / capacity) * 100;
}

function getLegendClass(utilization) {
  if (utilization < UTILIZATION_THRESHOLDS.greenMax) return 'green';
  if (utilization <= UTILIZATION_THRESHOLDS.yellowMax) return 'yellow';
  return 'red';
}

function pulseLegendDot(color) {
  if (!color) return;
  const dots = document.querySelectorAll(`.legend-dot.${color}`);
  dots.forEach(dot => {
    const parent = dot.closest('.legend-item');
    parent?.classList.add('pulsing');
    setTimeout(() => parent?.classList.remove('pulsing'), 800);
  });
}
// public/script.js
const orgInput = document.getElementById('org');
const authBtn = document.getElementById('authBtn');
const mainUI = document.getElementById('mainUI');
const workspace = document.getElementById('workspace');
const calendarGrid = document.getElementById('calendarGrid');
const dateRangeLabel = document.getElementById('dateRange');
const prevRangeBtn = document.getElementById('prevRangeBtn');
const nextRangeBtn = document.getElementById('nextRangeBtn');
const consoleBody = document.getElementById('consoleBody');
const modalBackdrop = document.getElementById('modalBackdrop');
const confirmationModal = document.getElementById('confirmationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const scheduleModal = document.getElementById('scheduleModal');
const schedulePoInput = document.getElementById('schedulePo');
const scheduleDriverInput = document.getElementById('scheduleDriver');
const scheduleError = document.getElementById('scheduleError');
const scheduleConfirmBtn = document.getElementById('scheduleConfirmBtn');
const scheduleCancelBtn = document.getElementById('scheduleCancelBtn');
const themeSelectorBtn = document.getElementById('themeSelectorBtn');
const themeModal = document.getElementById('themeModal');
const themeList = document.getElementById('themeList');
const authSection = document.getElementById('authSection');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchError = document.getElementById('searchError');
const searchContainer = document.querySelector('.appointment-search');
const dayNav = document.getElementById('dayNav');
const backToTopBtn = document.getElementById('backToTopBtn');
const slotInfoToast = document.getElementById('slotInfoToast');
const slotInfoTitle = document.getElementById('slotInfoTitle');
const slotInfoMeta = document.getElementById('slotInfoMeta');
const slotInfoContent = document.getElementById('slotInfoContent');
const slotInfoCloseBtn = document.getElementById('slotInfoCloseBtn');
const icsToggleBtn = document.getElementById('icsToggleBtn');

const DAY_COUNT = 5;
const WEEK_STEP = 7;
const START_HOUR = 7;
const END_HOUR = 18;

const RESOURCE_GROUPS = [
  {
    ResourceGroupName: 'Dock',
    ResourceUnits: [
      { ResourceId: 'Dock 1' }
    ]
  }
];

const UTILIZATION_THRESHOLDS = {
  greenMax: 50,
  yellowMax: 75
};

const DISPLAY_OFFSET_HOURS = -5;
const HIGHLIGHT_DURATION = 5000;
const SEARCH_SPLIT_REGEX = /[\s,;]+/;
const AUTO_REFRESH_INTERVAL = 3 * 60 * 1000;
const MAX_WEEKS_BUFFER = 8;
const mediaQuery = window.matchMedia('(max-width: 768px)');
let isMobileViewport = mediaQuery.matches;
mediaQuery.addEventListener?.('change', e => {
  isMobileViewport = e.matches;
  if (!isMobileViewport) {
    setSearchCollapsed(false);
  } else {
    setSearchCollapsed(!searchInput?.value);
  }
  if (calendarInitialized) {
    renderCalendar();
  }
});
if (isMobileViewport) {
  setSearchCollapsed(!searchInput?.value);
}

let token = null;
let currentOrg = null;
let currentRangeStart = getEffectiveWeekStart(new Date());
let calendarInitialized = false;
let hasScrolledToFirstSlot = false;
let slotLookup = new Map();
let isFetching = false;
let isScheduling = false;
let pendingSlot = null;
let appointmentCellMap = new Map();
const highlightTimers = new Map();
let slotInfoToastTimer = null;
let autoRefreshTimer = null;
const loadedWeeks = [];
const weekData = new Map();
let pendingWeekLoads = new Set();
let calendarDownloadEnabled = false;
let lastScheduledDetails = null;
let activeWeekIso = null;
// Mobile-only navigation anchor that always advances exactly 1 week per tap
let mobileNavIso = null;
updateIcsToggleUI();
const DEFAULT_ORG = 'SS-DEMO';
const DEFAULT_THEME_KEY = 'minimal-light';

const urlParams = new URLSearchParams(window.location.search);
const USE_MOCK_DATA = urlParams.has('mock');

const THEMES = {
  default: {
    name: 'Default (Dark)',
    colors: {
      '--bg-color': '#121212',
      '--text-color': '#e0e0e0',
      '--text-muted': '#bbbbbb',
      '--card-bg': '#1e1e1e',
      '--border-color': '#333',
      '--input-bg': '#2d2d2d',
      '--input-border': '#444',
      '--input-focus-bg': '#333',
      '--input-focus-border': '#0d6efd',
      '--input-focus-shadow': 'rgba(13, 110, 253, 0.25)',
      '--primary-color': '#0d6efd',
      '--primary-hover': '#0b5ed7',
      '--slot-border': '#d0d7ff',
      '--slot-text': '#0d6efd',
      '--slot-green-bg': '#6ee7b7',
      '--slot-green-border': '#34d399',
      '--slot-green-text': '#064e3b',
      '--slot-yellow-bg': '#fef3c7',
      '--slot-yellow-border': '#fcd34d',
      '--slot-yellow-text': '#78350f',
      '--slot-red-bg': '#ef4444',
      '--slot-red-border': '#ef4444',
      '--slot-red-text': '#fff1f2',
      '--header-bg': '#111827',
      '--header-text': '#e5e7eb'
    }
  },
  loves: {
    name: "Love's Travel Stops",
    colors: {
      '--bg-color': '#f8f9fa',
      '--text-color': '#212529',
      '--text-muted': '#6c757d',
      '--card-bg': '#ffffff',
      '--border-color': '#dee2e6',
      '--input-bg': '#f5f5f5',
      '--input-border': '#ced4da',
      '--input-focus-bg': '#ffffff',
      '--input-focus-border': '#E31837',
      '--input-focus-shadow': 'rgba(227, 24, 55, 0.25)',
      '--primary-color': '#E31837',
      '--primary-hover': '#C0142D',
      '--slot-border': '#cbd4ff',
      '--slot-text': '#0d6efd',
      '--slot-green-bg': '#def7ec',
      '--slot-green-border': '#34d399',
      '--slot-green-text': '#065f46',
      '--slot-yellow-bg': '#fff4db',
      '--slot-yellow-border': '#f6c343',
      '--slot-yellow-text': '#92400e',
      '--slot-red-bg': '#fecdd3',
      '--slot-red-border': '#fb7185',
      '--slot-red-text': '#7f1d1d',
      '--header-bg': '#f1f5f9',
      '--header-text': '#1f2933'
    }
  },
  manhattan: {
    name: 'Manhattan Associates',
    colors: {
      '--bg-color': '#f5f7fa',
      '--text-color': '#1a1a1a',
      '--text-muted': '#4a5568',
      '--card-bg': '#ffffff',
      '--border-color': '#e1e8ed',
      '--input-bg': '#f0f2f5',
      '--input-border': '#cbd5e0',
      '--input-focus-bg': '#ffffff',
      '--input-focus-border': '#0066cc',
      '--input-focus-shadow': 'rgba(0, 102, 204, 0.25)',
      '--primary-color': '#0066cc',
      '--primary-hover': '#0052a3',
      '--slot-border': '#bcd7ff',
      '--slot-text': '#0d6efd',
      '--slot-green-bg': '#c7f9cc',
      '--slot-green-border': '#34d399',
      '--slot-green-text': '#065f46',
      '--slot-yellow-bg': '#fce7b2',
      '--slot-yellow-border': '#fbbf24',
      '--slot-yellow-text': '#92400e',
      '--slot-red-bg': '#fecdd3',
      '--slot-red-border': '#fb7185',
      '--slot-red-text': '#7f1d1d',
      '--header-bg': '#dce7f5',
      '--header-text': '#0f172a'
    }
  },
  msc: {
    name: 'MSC Industrial',
    colors: {
      '--bg-color': '#fafafa',
      '--text-color': '#1a1a1a',
      '--text-muted': '#757575',
      '--card-bg': '#ffffff',
      '--border-color': '#e0e0e0',
      '--input-bg': '#f0f0f0',
      '--input-border': '#bdbdbd',
      '--input-focus-bg': '#ffffff',
      '--input-focus-border': '#003d82',
      '--input-focus-shadow': 'rgba(0,61,130,0.25)',
      '--primary-color': '#003d82',
      '--primary-hover': '#002d5f',
      '--slot-border': '#c2d4f8',
      '--slot-text': '#0d6efd',
      '--slot-green-bg': '#d7f5e3',
      '--slot-green-border': '#27ae60',
      '--slot-green-text': '#0b5f38',
      '--slot-yellow-bg': '#fff2c2',
      '--slot-yellow-border': '#ffb347',
      '--slot-yellow-text': '#7c3e00',
      '--slot-red-bg': '#fecdd3',
      '--slot-red-border': '#fb7185',
      '--slot-red-text': '#7f1d1d',
      '--header-bg': '#e5e7eb',
      '--header-text': '#1f1f1f'
    }
  },
  'corporate-blue': {
    name: 'Corporate Blue',
    colors: {
      '--bg-color': '#e3f2fd',
      '--text-color': '#0d47a1',
      '--text-muted': '#1976d2',
      '--card-bg': '#ffffff',
      '--border-color': '#90caf9',
      '--input-bg': '#f5f5f5',
      '--input-border': '#90caf9',
      '--input-focus-bg': '#ffffff',
      '--input-focus-border': '#1565c0',
      '--input-focus-shadow': 'rgba(21,101,192,0.25)',
      '--primary-color': '#1565c0',
      '--primary-hover': '#0d47a1',
      '--slot-border': '#90caf9',
      '--slot-text': '#0d47a1',
      '--slot-green-bg': '#c8facc',
      '--slot-green-border': '#30b566',
      '--slot-green-text': '#04543a',
      '--slot-yellow-bg': '#fff1bf',
      '--slot-yellow-border': '#f6c851',
      '--slot-yellow-text': '#845400',
      '--slot-red-bg': '#fecdd3',
      '--slot-red-border': '#fb7185',
      '--slot-red-text': '#7f1d1d',
      '--header-bg': '#bbdefb',
      '--header-text': '#0d47a1'
    }
  },
  'minimal-light': {
    name: 'Minimal Light',
    colors: {
      '--bg-color': '#ffffff',
      '--text-color': '#1f2933',
      '--text-muted': '#616e7c',
      '--card-bg': '#f8fafc',
      '--border-color': '#d9e2ec',
      '--input-bg': '#ffffff',
      '--input-border': '#cbd5e0',
      '--input-focus-bg': '#ffffff',
      '--input-focus-border': '#5a67d8',
      '--input-focus-shadow': 'rgba(90,103,216,0.25)',
      '--primary-color': '#5a67d8',
      '--primary-hover': '#4c51bf',
      '--slot-border': '#d1d5db',
      '--slot-text': '#1f2933',
      '--slot-green-bg': '#e3fcec',
      '--slot-green-border': '#34d399',
      '--slot-green-text': '#065f46',
      '--slot-yellow-bg': '#fffbea',
      '--slot-yellow-border': '#f6c343',
      '--slot-yellow-text': '#92400e',
      '--slot-red-bg': '#fecdd3',
      '--slot-red-border': '#fb7185',
      '--slot-red-text': '#7f1d1d',
      '--header-bg': '#d9e2ec',
      '--header-text': '#1f2933'
    }
  }
};

function status(text, type = 'info') {
  const prefix = type.toUpperCase();
  if (type === 'error') {
    console.error(`[${prefix}] ${text}`);
  } else if (type === 'success') {
    console.info(`[${prefix}] ${text}`);
  } else {
    console.log(`[${prefix}] ${text}`);
  }
}

function logConsole(label, payload) {
  if (!consoleBody) return;
  const entry = document.createElement('div');
  entry.className = 'console-entry';
  const stamp = new Date().toLocaleTimeString();
  const heading = document.createElement('div');
  heading.className = 'console-timestamp';
  heading.textContent = `${stamp} | ${label}`;
  entry.appendChild(heading);

  if (payload !== undefined) {
    const pre = document.createElement('pre');
    pre.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    entry.appendChild(pre);
  }

  consoleBody.appendChild(entry);

  while (consoleBody.childElementCount > 25) {
    consoleBody.removeChild(consoleBody.firstElementChild);
  }

  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function isModalVisible(el) {
  return el && !el.hidden;
}

function showBackdrop() {
  if (modalBackdrop) modalBackdrop.hidden = false;
}

function hideBackdropIfNone() {
  if (modalBackdrop && ![scheduleModal, confirmationModal, themeModal].some(isModalVisible)) {
    modalBackdrop.hidden = true;
  }
}

function openConfirmationModal(title, message) {
  if (!confirmationModal || !modalBackdrop) return;
  if (modalTitle) modalTitle.textContent = title;
  if (modalMessage) modalMessage.innerHTML = message;
  confirmationModal.hidden = false;
  showBackdrop();
}

function closeConfirmationModal() {
  if (!confirmationModal) return;
  confirmationModal.hidden = true;
  hideBackdropIfNone();
}

function openScheduleModal(slotDate, slotEl) {
  if (!scheduleModal || !modalBackdrop) return;
  pendingSlot = { slotDate: new Date(slotDate), slotEl };
  if (schedulePoInput) schedulePoInput.value = '';
  if (scheduleDriverInput) scheduleDriverInput.value = '';
  if (scheduleError) scheduleError.hidden = true;
  hideSlotInfoToast();
  scheduleModal.hidden = false;
  showBackdrop();
  setTimeout(() => schedulePoInput?.focus(), 0);
  
  // Send HA event for schedule_attempted
  if (currentOrg) {
    api('schedule_attempted', { org: currentOrg }).catch(err => {
      console.warn('Failed to send schedule_attempted event:', err);
    });
  }
}

function closeScheduleModal() {
  if (!scheduleModal) return;
  scheduleModal.hidden = true;
  pendingSlot = null;
  hideBackdropIfNone();
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // move Sunday back to Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function getEffectiveWeekStart(date = new Date()) {
  let start = getWeekStart(date);
  const day = date.getDay();
  if (day === 6 || day === 0) {
    start = addDays(start, WEEK_STEP);
  }
  return start;
}

function isInitialWeekStart(date) {
  const baseline = getEffectiveWeekStart(new Date());
  return date.getTime() === baseline.getTime();
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getInitialPrefetchCount() {
  return isMobileViewport ? 4 : 1;
}

function formatRange(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatHour(hour) {
  const isPM = hour >= 12;
  const suffix = isPM ? 'pm' : 'am';
  const normalized = ((hour + 11) % 12) + 1;
  return `${normalized}:00${suffix}`;
}

function formatISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeSlotKey(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:00`;
}

function formatAPIDateTime(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:00:00`;
}

function getUtilizationClass(utilization) {
  if (utilization < UTILIZATION_THRESHOLDS.greenMax) return 'slot-green';
  if (utilization <= UTILIZATION_THRESHOLDS.yellowMax) return 'slot-yellow';
  return 'slot-red';
}

function renderCalendar() {
  if (!calendarGrid || !dateRangeLabel) return;
  const sortedWeeks = [...loadedWeeks].sort();
  const previousScrollY = isMobileViewport ? window.scrollY : 0;

  calendarGrid.innerHTML = '';
  appointmentCellMap.clear();

  if (!sortedWeeks.length) {
    dateRangeLabel.textContent = 'No data loaded';
    renderDayNav();
    updateNavigationButtons();
    return;
  }

  let weeksToRender = sortedWeeks;
  if (!isMobileViewport) {
    // Desktop: Always show only the active week, never multiple weeks
    if (activeWeekIso && sortedWeeks.includes(activeWeekIso)) {
      weeksToRender = [activeWeekIso];
    } else if (sortedWeeks.length > 0) {
      activeWeekIso = sortedWeeks[0];
      weeksToRender = [activeWeekIso];
    } else {
      weeksToRender = [];
    }
  }

  const fragment = document.createDocumentFragment();

  weeksToRender.forEach(weekIso => {
    const weekStart = parseISODate(weekIso);
    const block = document.createElement('div');
    block.className = 'week-block';
    block.dataset.weekStart = weekIso;
    block.appendChild(createWeekDivider(weekStart));

    const grid = document.createElement('div');
    grid.className = 'week-grid';
    for (let i = 0; i < DAY_COUNT; i++) {
      const dayDate = addDays(weekStart, i);
      const column = buildDayColumn(dayDate);
      column.dataset.weekStart = weekIso;
      grid.appendChild(column);
    }
    block.appendChild(grid);
    fragment.appendChild(block);
  });

  calendarGrid.appendChild(fragment);
  rebuildAppointmentCellMapFromDOM();

  const firstWeekDate = parseISODate(weeksToRender[0]);
  const lastWeekDate = addDays(parseISODate(weeksToRender[weeksToRender.length - 1]), DAY_COUNT - 1);
  dateRangeLabel.textContent = isMobileViewport
    ? `${formatRange(firstWeekDate)}`
    : `${formatRange(firstWeekDate)} - ${formatRange(lastWeekDate)}`;
  currentRangeStart = firstWeekDate;
  renderDayNav();
  updateNavigationButtons();

  if (isMobileViewport) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: previousScrollY });
    });
  }
  
  // On web version, scroll to first available slot after initial render (only once)
  // This runs after the DOM is fully built, so we can safely query for slots
  if (!isMobileViewport && !hasScrolledToFirstSlot && calendarInitialized) {
    const triggerTime = new Date().toLocaleTimeString();
    console.log(`[AUTO-SCROLL] Trigger scheduled at ${triggerTime} (after renderCalendar)`);
    status(`⏱️ Auto-scroll scheduled at ${triggerTime}`, 'info');
    
    // Use multiple animation frames and a delay to ensure DOM is fully rendered and painted
    requestAnimationFrame(() => {
      console.log('[AUTO-SCROLL] First RAF after renderCalendar');
      requestAnimationFrame(() => {
        console.log('[AUTO-SCROLL] Second RAF after renderCalendar');
        setTimeout(() => {
          const delayTime = new Date().toLocaleTimeString();
          console.log(`[AUTO-SCROLL] Delay completed at ${delayTime} - calling scrollToFirstAvailableSlot()`);
          if (!hasScrolledToFirstSlot) {
            scrollToFirstAvailableSlot();
          } else {
            console.log('[AUTO-SCROLL] Already scrolled, skipping');
          }
        }, 300);
      });
    });
  }
}

function scrollToFirstAvailableSlot() {
  // Only scroll to first available slot on web version (not mobile)
  if (isMobileViewport || !calendarGrid || hasScrolledToFirstSlot) {
    if (!isMobileViewport) {
      console.log('[AUTO-SCROLL] Skipped - isMobile:', isMobileViewport, 'hasGrid:', !!calendarGrid, 'hasScrolled:', hasScrolledToFirstSlot);
    }
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  console.log(`[AUTO-SCROLL] Attempting at ${timestamp} - slots check starting...`);

  // Show visible debug message
  const debugMsg = `🔍 Auto-scroll triggered at ${timestamp}`;
  status(debugMsg, 'info');
  
  // Also log to console with details
  logConsole('Auto-scroll attempt', { timestamp, hasScrolled: hasScrolledToFirstSlot });

  // Find all time slots that are not hidden
  const availableSlots = calendarGrid.querySelectorAll('.time-slot:not(.hidden-slot)');
  
  console.log(`[AUTO-SCROLL] Found ${availableSlots.length} available slots`);
  
  if (availableSlots.length === 0) {
    console.log('[AUTO-SCROLL] No slots found - will retry in 300ms');
    // No available slots found - retry after a delay
    setTimeout(() => {
      if (!hasScrolledToFirstSlot) {
        scrollToFirstAvailableSlot();
      }
    }, 300);
    return;
  }

  // Get the first available slot
  const firstAvailableSlot = availableSlots[0];
  const slotText = firstAvailableSlot.textContent?.trim() || 'unknown';
  console.log(`[AUTO-SCROLL] First available slot: ${slotText}`);

  // Scroll to the slot with smooth behavior and some offset from top
  const scrollToSlot = () => {
    try {
      const rect = firstAvailableSlot.getBoundingClientRect();
      console.log(`[AUTO-SCROLL] Element rect:`, { width: rect.width, height: rect.height, top: rect.top });
      
      if (rect.width === 0 && rect.height === 0) {
        console.log('[AUTO-SCROLL] Element not laid out yet - will retry in 200ms');
        // Element not yet laid out, retry
        setTimeout(() => {
          if (!hasScrolledToFirstSlot) {
            scrollToFirstAvailableSlot();
          }
        }, 200);
        return;
      }

      const offset = rect.top + window.scrollY - 100;
      console.log(`[AUTO-SCROLL] Scrolling to offset: ${offset} (rect.top: ${rect.top}, scrollY: ${window.scrollY})`);
      
      window.scrollTo({ 
        top: Math.max(0, offset), 
        behavior: 'smooth' 
      });

      // Mark as scrolled
      hasScrolledToFirstSlot = true;
      const scrollTime = new Date().toLocaleTimeString();
      console.log(`[AUTO-SCROLL] ✅ Scroll completed at ${scrollTime}`);
      status(`✅ Auto-scrolled to first available slot at ${scrollTime}`, 'success');

      // Focus the slot after scrolling
      setTimeout(() => {
        try {
          firstAvailableSlot.focus();
          console.log('[AUTO-SCROLL] Focused on slot');
        } catch (e) {
          console.log('[AUTO-SCROLL] Focus failed:', e);
        }
      }, 600);
    } catch (e) {
      console.error('[AUTO-SCROLL] Error during scroll:', e);
      // Ignore scroll errors, but don't retry indefinitely
      hasScrolledToFirstSlot = true;
    }
  };

  // Use requestAnimationFrame to ensure DOM is painted
  console.log('[AUTO-SCROLL] Scheduling scroll with requestAnimationFrame');
  requestAnimationFrame(() => {
    console.log('[AUTO-SCROLL] First RAF callback');
    requestAnimationFrame(() => {
      console.log('[AUTO-SCROLL] Second RAF callback - executing scroll');
      scrollToSlot();
    });
  });
}

function updateNavigationButtons() {
  if (!prevRangeBtn) return;
  const baselineIso = formatISODate(getEffectiveWeekStart(new Date()));
  const sortedWeeks = [...loadedWeeks].sort();
  let disablePrev;
  if (isMobileViewport) {
    disablePrev = !sortedWeeks.length || sortedWeeks[0] === baselineIso;
  } else {
    const currentIso = activeWeekIso || sortedWeeks[0];
    disablePrev = !currentIso || currentIso === baselineIso;
  }
  prevRangeBtn.disabled = disablePrev;
  prevRangeBtn.classList.toggle('d-none', disablePrev && !isMobileViewport);
}

function setCalendarRefreshing(isRefreshing) {
  if (!calendarGrid) return;
  calendarGrid.classList.toggle('refreshing', isRefreshing);
  if (!isRefreshing) {
    requestAnimationFrame(() => {
      calendarGrid.classList.add('ready');
      Array.from(calendarGrid.children).forEach((column, idx) => {
        column.style.setProperty('--column-delay', `${idx * 50}ms`);
      });
      setTimeout(() => calendarGrid.classList.remove('ready'), 600);
    });
  } else {
    calendarGrid.classList.remove('ready');
  }
}

function flashNavButton(button) {
  if (!button) return;
  button.classList.add('nav-click');
  setTimeout(() => button.classList.remove('nav-click'), 250);
}

function scrollToCalendarTop() {
  if (!isMobileViewport) return;
  const target = workspace || calendarGrid;
  if (!target) return;
  const offset = target.getBoundingClientRect().top + window.scrollY - 24;
  window.scrollTo({ top: offset, behavior: 'smooth' });
}

function scrollCalendarToStart() {
  if (!calendarGrid || !isMobileViewport) return;
  const firstBlock = calendarGrid.querySelector('.week-block');
  if (firstBlock) {
    firstBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (dayNav && dayNav.firstElementChild) {
    Array.from(dayNav.children).forEach((btn, idx) => {
      btn.classList.toggle('active', idx === 0);
    });
  }
}

function buildDayColumn(dayDate) {
  const column = document.createElement('div');
  column.className = 'day-column';
  column.dataset.day = formatISODate(dayDate);
  const now = new Date();
  // Apply the same 5-hour offset to current time for accurate comparison
  const nowWithOffset = new Date(now);
  nowWithOffset.setHours(nowWithOffset.getHours() - DISPLAY_OFFSET_HOURS);
  column.innerHTML = `
    <div class="day-header">
      <div class="day-name">${dayDate.toLocaleDateString(undefined, { weekday: 'short' })}</div>
      <div class="day-date">${dayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
    </div>
  `;

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'time-slot';
    slot.style.background = '';
    slot.style.borderColor = '';
    slot.style.color = '';
    const slotDate = new Date(dayDate);
    slotDate.setHours(hour, 0, 0, 0);
    const key = makeSlotKey(slotDate);
    const slotInfo = slotLookup.get(key);
    const slotActualDate = new Date(slotDate);
    slotActualDate.setHours(slotActualDate.getHours() - DISPLAY_OFFSET_HOURS);
    const isPastSlot = slotActualDate < nowWithOffset;

    const label = formatHour(hour);
    let hideSlot = false;
    let metaDisplay = '--';
    let slotTitle = 'No capacity data';

    if (slotInfo) {
      const capacity = slotInfo.capacity ?? 0;
      const total = slotInfo.totalAppointments ?? 0;
      hideSlot = capacity === 0 || total >= capacity;
      metaDisplay = `${total}/${capacity}`;
      slotTitle = (slotInfo.appointmentIds?.length)
        ? slotInfo.appointmentIds.join(', ')
        : 'No appointments';
      slot.dataset.capacity = capacity;
      slot.dataset.utilization = slotInfo.capacityUtilization ?? 0;

      const utilization = slotInfo.capacityUtilization ?? 0;

      if (!hideSlot) {
        if (total === 0) {
          slot.className = 'time-slot';
          slot.style.background = '#ffffff';
          slot.style.borderColor = '#d0d7ff';
          slot.style.color = '#0d6efd';
        } else {
          slot.classList.remove('slot-green', 'slot-yellow', 'slot-red');
          const utilizationClass = getUtilizationClass(utilization);
          slot.classList.add(utilizationClass);
          slot.style.background = '';
          slot.style.borderColor = '';
          slot.style.color = '';
        }
      }
    }

    const shouldHide = hideSlot || isPastSlot;

    const slotDisplayLabel = `${dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ${label}`;

    slot.innerHTML = `
      <div class="slot-content">
        <span>${label}</span>
        <span class="slot-meta">${metaDisplay}</span>
      </div>`;

    slot.classList.remove('has-tooltip');
    delete slot.dataset.appointments;
    if (slotInfo) {
      const appointments = slotInfo.appointmentIds || [];
      if (!shouldHide && appointments.length) {
        slot.classList.add('has-tooltip');
        slot.dataset.appointments = appointments.join('\n');
      }
    }
    slot.setAttribute('aria-label', slotTitle);

    if (shouldHide) {
      slot.classList.add('hidden-slot');
      slot.classList.remove('highlighted');
    } else {
      slot.dataset.slotIso = formatAPIDateTime(slotDate);
      slot.dataset.slotDisplay = slotDisplayLabel;
      slot.addEventListener('click', () => openScheduleModal(new Date(slotDate), slot));
      if (slotInfo?.appointmentIds?.length) {
        const infoBtn = document.createElement('button');
        infoBtn.type = 'button';
        infoBtn.className = 'slot-info-btn';
        infoBtn.innerHTML = '<i class="fas fa-eye"></i>';
        infoBtn.addEventListener('click', e => {
          e.stopPropagation();
          showSlotInfoToast({
            title: slotDisplayLabel,
            meta: `${slotInfo.totalAppointments}/${slotInfo.capacity} booked`,
            appointments: slotInfo.appointmentIds
          });
        });
        slot.querySelector('.slot-content')?.appendChild(infoBtn);
      }
    }

    column.appendChild(slot);
  }

  return column;
}

function createWeekDivider(weekStartDate) {
  const divider = document.createElement('div');
  divider.className = 'week-divider';
  divider.dataset.weekStart = formatISODate(weekStartDate);
  divider.textContent = `Week of ${weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return divider;
}

function addWeekToList(weekIso) {
  if (!loadedWeeks.includes(weekIso)) {
    loadedWeeks.push(weekIso);
    loadedWeeks.sort();
  }
}

function scrollToWeekStart(weekIso) {
  if (!calendarGrid) return;
  const block = calendarGrid.querySelector(`[data-week-start="${weekIso}"]`);
  if (block) {
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function ensureWeekLoaded(weekIso) {
  if (!weekIso || weekData.has(weekIso)) return;
  const weekStartDate = parseISODate(weekIso);
  let position = 'append';
  if (loadedWeeks.length) {
    const earliest = parseISODate(loadedWeeks[0]);
    if (weekStartDate < earliest) position = 'prepend';
  }
  await loadWeek(weekStartDate, position);
}

async function loadWeek(weekStartDate, position = 'append') {
  const weekIso = formatISODate(weekStartDate);
  if (weekData.has(weekIso) || pendingWeekLoads.has(weekIso)) {
    logConsole('Week load skipped', { weekIso, reason: 'cached-or-pending' });
    return;
  }
  if (weekData.size >= MAX_WEEKS_BUFFER && !weekData.has(weekIso)) {
    logConsole('Week load skipped', { weekIso, reason: 'cap-reached' });
    return;
  }
  pendingWeekLoads.add(weekIso);
  logConsole('Week load start', { weekIso, position });
  try {
    for (let i = 0; i < DAY_COUNT; i++) {
      const targetDate = addDays(weekStartDate, i);
      const apiResponse = await fetchCalendarData(targetDate);
      slotLookup = buildSlotLookup(apiResponse, slotLookup);
    }
    weekData.set(weekIso, true);
    addWeekToList(weekIso);
    if (!activeWeekIso) {
      activeWeekIso = weekIso;
    }
    renderCalendar();
    logConsole('Week load complete', { weekIso, totalWeeks: loadedWeeks.length });
  } catch (error) {
    logConsole('Week load error', { weekIso, error: error?.message || error });
    throw error;
  } finally {
    pendingWeekLoads.delete(weekIso);
  }
}

function resetCalendarState() {
  loadedWeeks.length = 0;
  weekData.clear();
  pendingWeekLoads = new Set();
  appointmentCellMap.clear();
  slotLookup = new Map();
  activeWeekIso = null;
  hasScrolledToFirstSlot = false;
  if (calendarGrid) {
    calendarGrid.innerHTML = '';
  }
}

async function loadNextWeek() {
  if (!loadedWeeks.length) return;
  const lastWeekIso = loadedWeeks[loadedWeeks.length - 1];
  const nextWeekStart = addDays(parseISODate(lastWeekIso), WEEK_STEP);
  await loadWeek(nextWeekStart, 'append');
}

async function loadPreviousWeek() {
  if (!loadedWeeks.length) return;
  const firstWeekIso = loadedWeeks[0];
  const previousWeekStart = addDays(parseISODate(firstWeekIso), -WEEK_STEP);
  await loadWeek(previousWeekStart, 'prepend');
}

function scheduleAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(refreshVisibleWeeks, AUTO_REFRESH_INTERVAL);
}

async function refreshVisibleWeeks() {
  for (const weekIso of loadedWeeks) {
    const weekStart = parseISODate(weekIso);
    for (let i = 0; i < DAY_COUNT; i++) {
      await refreshDayColumn(addDays(weekStart, i));
    }
  }
}

function rebuildAppointmentCellMapFromDOM() {
  appointmentCellMap.clear();
  if (!calendarGrid) return;
  const tooltipSlots = calendarGrid.querySelectorAll('.time-slot.has-tooltip');
  tooltipSlots.forEach(slot => {
    const ids = slot.dataset.appointments?.split('\n') || [];
    ids.forEach(id => {
      const normalized = id?.trim().toUpperCase();
      if (normalized) {
        appointmentCellMap.set(normalized, slot);
      }
    });
  });
}

function renderDayNav() {
  if (!dayNav) return;
  dayNav.innerHTML = '';
  const baseWeekIso = isMobileViewport
    ? (loadedWeeks[0] || formatISODate(currentRangeStart))
    : (activeWeekIso || loadedWeeks[0] || formatISODate(currentRangeStart));
  if (!baseWeekIso) return;
  const baseDate = parseISODate(baseWeekIso);
  for (let i = 0; i < DAY_COUNT; i++) {
    const dayDate = addDays(baseDate, i);
    const iso = formatISODate(dayDate);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.day = iso;
    btn.textContent = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
    btn.addEventListener('click', () => scrollToDay(iso, btn));
    dayNav.appendChild(btn);
  }
  if (dayNav.firstElementChild) {
    dayNav.firstElementChild.classList.add('active');
  }
}

function scrollToDay(dayIso, triggerBtn) {
  if (!calendarGrid) return;
  const column = calendarGrid.querySelector(`[data-day="${dayIso}"]`);
  if (column) {
    column.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
    column.classList.add('day-column-focus');
    setTimeout(() => column.classList.remove('day-column-focus'), 1800);
  }
  if (dayNav) {
    Array.from(dayNav.children).forEach(btn => {
      btn.classList.toggle('active', btn === triggerBtn);
    });
  }
}

function showSlotInfoToast({ title, meta, appointments }) {
  if (!slotInfoToast || !slotInfoContent) return;
  if (slotInfoTitle) slotInfoTitle.textContent = title;
  if (slotInfoMeta) slotInfoMeta.textContent = meta;
  slotInfoContent.innerHTML = '';
  appointments.forEach(id => {
    const li = document.createElement('li');
    li.textContent = id;
    slotInfoContent.appendChild(li);
  });
  slotInfoToast.hidden = false;
  slotInfoToast.classList.add('visible');
  pulseLegendForUtilization(calculateUtilizationFromMeta(meta));
  if (slotInfoToastTimer) clearTimeout(slotInfoToastTimer);
  slotInfoToastTimer = setTimeout(hideSlotInfoToast, 6000);
}

function hideSlotInfoToast() {
  if (!slotInfoToast) return;
  slotInfoToast.classList.remove('visible');
  slotInfoToast.hidden = true;
  if (slotInfoToastTimer) {
    clearTimeout(slotInfoToastTimer);
    slotInfoToastTimer = null;
  }
}

function updateBackToTopVisibility() {
  if (!backToTopBtn) return;
  if (window.scrollY > 250) {
    backToTopBtn.classList.add('show');
  } else {
    backToTopBtn.classList.remove('show');
  }
}

async function handleInfiniteScroll() {
  if (!isMobileViewport || !calendarInitialized || isFetching) return;
  if (weekData.size >= MAX_WEEKS_BUFFER) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
  if (!nearBottom) return;
  await loadNextWeek();
}

function normalizeAppointmentId(id) {
  return id.trim().toUpperCase();
}

function parseSearchTerms() {
  if (!searchInput) return [];
  return searchInput.value
    .split(SEARCH_SPLIT_REGEX)
    .map(term => term.trim())
    .filter(Boolean);
}

function showSearchError(message) {
  if (!searchError) return;
  searchError.textContent = message;
  searchError.hidden = false;
}

function clearSearchError() {
  if (!searchError) return;
  searchError.hidden = true;
}

function setSearchCollapsed(collapsed) {
  if (!searchContainer || !isMobileViewport) return;
  searchContainer.classList.toggle('collapsed', collapsed);
}

function updateIcsToggleUI() {
  if (!icsToggleBtn) return;
  icsToggleBtn.classList.toggle('active', calendarDownloadEnabled);
  icsToggleBtn.setAttribute('aria-pressed', String(calendarDownloadEnabled));
}

function toggleIcsPreference() {
  calendarDownloadEnabled = !calendarDownloadEnabled;
  updateIcsToggleUI();
}

function generateMockCalendarResponse(targetDate = new Date()) {
  const baseDate = new Date(targetDate);
  baseDate.setMinutes(0, 0, 0);
  const intervals = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const start = new Date(baseDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const capacity = 7;
    const total = (hour % 4);
    intervals.push({
      IntervalStart: start.toISOString(),
      IntervalEnd: end.toISOString(),
      Capacity: capacity,
      TotalAppointment: total,
      CapacityUtilization: Math.round((total / capacity) * 100),
      AppointmentIds: Array.from({ length: total }, (_, idx) => `APT-MOCK-${hour}-${idx + 1}`)
    });
  }
  return Promise.resolve({
    data: {
      GridData: [
        {
          ResourceGroupName: 'Mock Dock',
          ResourceUnits: [
            {
              ResourceId: 'Dock 1',
              IntervalCapacities: intervals
            }
          ]
        }
      ]
    }
  });
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildIcsContent({ appointmentId, slotDate, durationMinutes = 60 }) {
  const start = new Date(slotDate);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const dtStamp = formatICSDate(new Date());
  const dtStart = formatICSDate(start);
  const dtEnd = formatICSDate(end);
  const uid = `${appointmentId || 'appointment'}@schedule_app`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schedule App//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Appointment ${appointmentId}`,
    currentOrg ? `LOCATION:${currentOrg}` : 'LOCATION:Facility',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function downloadIcs(details) {
  if (!details) return;
  const content = buildIcsContent(details);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${details.appointmentId || 'appointment'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function highlightSlot(slot) {
  if (!slot) return;
  slot.classList.add('highlighted');
  slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  pulseLegendForUtilization(Number(slot.dataset.utilization ?? 0));
  if (highlightTimers.has(slot)) {
    clearTimeout(highlightTimers.get(slot));
  }
  const timer = setTimeout(() => {
    slot.classList.remove('highlighted');
    highlightTimers.delete(slot);
  }, HIGHLIGHT_DURATION);
  highlightTimers.set(slot, timer);
}

function findSlotElementForDate(slotDate) {
  if (!calendarGrid || !slotDate) return null;
  const iso = formatAPIDateTime(new Date(slotDate));
  return calendarGrid.querySelector(`[data-slot-iso="${iso}"]`);
}

function handleAppointmentSearch(event) {
  event?.preventDefault();
  if (!appointmentCellMap.size) return;
  const terms = parseSearchTerms();
  if (!terms.length) {
    showSearchError('Enter an appointment ID');
    return;
  }
  let found = false;
  const normalized = terms.map(normalizeAppointmentId);
  normalized.forEach(term => {
    const slot = appointmentCellMap.get(term);
    if (slot) {
      found = true;
      highlightSlot(slot);
    }
  });
  if (found) {
    clearSearchError();
    pulseLegendForUtilization(findFirstUtilization(normalized));
  } else {
    showSearchError('No Appointment Found');
  }
  if (isMobileViewport) setSearchCollapsed(true);
}

function findFirstUtilization(terms) {
  for (const term of terms) {
    const slot = appointmentCellMap.get(term);
    if (slot) return slot.dataset.utilization;
  }
  return null;
}

async function ensureCalendarReady() {
  if (!calendarInitialized) {
    currentRangeStart = getEffectiveWeekStart(new Date());
    calendarInitialized = true;
    try {
      await loadWeek(currentRangeStart, 'append');
      const prefetchCount = getInitialPrefetchCount();
      for (let i = 1; i < prefetchCount; i++) {
        await loadWeek(addDays(currentRangeStart, i * WEEK_STEP), 'append');
      }
      scheduleAutoRefresh();
    } catch (error) {
      console.error('Initial calendar load failed', error);
      status(error.message || 'Calendar load failed', 'error');
    }
  }
  renderCalendar();
  updateNavigationButtons();
}

function resetWorkspace() {
  workspace?.classList.remove('unlocked');
  calendarInitialized = false;
  currentRangeStart = getEffectiveWeekStart(new Date());
  resetCalendarState();
  if (dateRangeLabel) dateRangeLabel.textContent = 'Pending authentication...';
  currentOrg = null;
  updateNavigationButtons();
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function buildSlotLookup(response, accumulator = new Map()) {
  const gridData = response?.data?.GridData || [];

  gridData.forEach(group => {
    (group.ResourceUnits || []).forEach(unit => {
      (unit.IntervalCapacities || []).forEach(interval => {
        const capacity = interval?.Capacity ?? 0;
        const utilization = interval?.CapacityUtilization ?? 0;
        const totalAppointments = interval?.TotalAppointment ?? 0;
        const slotStart = new Date(interval.IntervalStart);
        const slotEnd = new Date(interval.IntervalEnd);
        const cursor = new Date(slotStart);
        while (cursor < slotEnd) {
          const displayTime = new Date(cursor);
          displayTime.setHours(displayTime.getHours() + DISPLAY_OFFSET_HOURS);
          const key = makeSlotKey(displayTime);
          accumulator.set(key, {
            capacity,
            capacityUtilization: utilization,
            totalAppointments,
            appointmentIds: interval?.AppointmentIds || []
          });
          cursor.setHours(cursor.getHours() + 1);
        }
      });
    });
  });

  return accumulator;
}

function clearDayFromLookup(dayDate) {
  const iso = formatISODate(dayDate);
  for (const key of Array.from(slotLookup.keys())) {
    if (key.startsWith(iso)) {
      slotLookup.delete(key);
    }
  }
}

async function refreshDayColumn(slotDate) {
  if (!calendarGrid) return;
  const dayDate = new Date(slotDate);
  dayDate.setHours(0, 0, 0, 0);
  const iso = formatISODate(dayDate);
  const response = await fetchCalendarData(dayDate);
  clearDayFromLookup(dayDate);
  slotLookup = buildSlotLookup(response, slotLookup);
  const newColumn = buildDayColumn(dayDate);
  const existing = calendarGrid.querySelector(`[data-day="${iso}"]`);
  if (existing) {
    existing.replaceWith(newColumn);
  } else {
    calendarGrid.appendChild(newColumn);
  }
  rebuildAppointmentCellMapFromDOM();
  renderDayNav();
}

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
  localStorage.setItem('scheduleTheme', themeKey);
}

function loadTheme() {
  const saved = localStorage.getItem('scheduleTheme') || DEFAULT_THEME_KEY;
  applyTheme(saved);
}

function renderThemeList() {
  if (!themeList) return;
  const current = localStorage.getItem('scheduleTheme') || DEFAULT_THEME_KEY;
  themeList.innerHTML = '';
  Object.entries(THEMES).forEach(([key, theme]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn w-100 text-start ${key === current ? 'active' : ''}`;
    btn.textContent = theme.name;
    btn.onclick = () => {
      applyTheme(key);
      closeThemeModal();
    };
    themeList.appendChild(btn);
  });
}

function openThemeModal() {
  if (!themeModal) return;
  renderThemeList();
  themeModal.hidden = false;
  showBackdrop();
}

function closeThemeModal() {
  if (!themeModal) return;
  themeModal.hidden = true;
  hideBackdropIfNone();
}

async function fetchCalendarData(targetDate) {
  if (USE_MOCK_DATA) {
    return generateMockCalendarResponse(targetDate);
  }
  if (!currentOrg) throw new Error('ORG not set');
  const dateString = formatISODate(targetDate || new Date());
  const payload = {
    org: currentOrg,
    date: dateString,
    resourceGroups: RESOURCE_GROUPS
  };

  logConsole('Request: calendar-data', payload);

  const response = await api('calendar-data', payload);

  if (!response || response.success === false) {
    throw new Error(response?.error || 'Calendar data unavailable');
  }
  logConsole('Response: calendar-data', response);
  return response;
}

async function loadAndRenderCalendar() {
  if (!currentOrg || isFetching) return;
  resetCalendarState();
  isFetching = true;
  setCalendarRefreshing(true);
  try {
    await loadWeek(currentRangeStart, 'append');
    activeWeekIso = formatISODate(currentRangeStart);
    mobileNavIso = activeWeekIso;
    const prefetchCount = getInitialPrefetchCount();
    for (let i = 1; i < prefetchCount; i++) {
      await loadWeek(addDays(currentRangeStart, i * WEEK_STEP), 'append');
    }
    // On desktop, keep only the active week in loadedWeeks
    if (!isMobileViewport && activeWeekIso) {
      const keepWeek = activeWeekIso;
      loadedWeeks.length = 0;
      if (weekData.has(keepWeek)) {
        loadedWeeks.push(keepWeek);
      }
    }
    
    // Set calendarInitialized BEFORE final render so scroll logic can run
    calendarInitialized = true;
    scheduleAutoRefresh();
    status('Calendar ready', 'success');
    
    // Trigger a final renderCalendar to ensure scroll happens after all data is loaded
    // The scroll logic is now in renderCalendar() itself and will run after this render
    renderCalendar();
  } catch (err) {
    console.error('Calendar fetch failed', err);
    status(err.message || 'Calendar load failed', 'error');
    logConsole('Error: calendar-data', err.message || err.toString());
  } finally {
    isFetching = false;
    setCalendarRefreshing(false);
  }
  scrollToCalendarTop();
  scrollCalendarToStart();
}

async function scheduleSlot(slotDate, slotEl) {
  if (!token || !currentOrg) {
    return status('Authenticate before scheduling', 'error');
  }
  if (isScheduling) return;

  const requestDate = new Date(slotDate);
  requestDate.setHours(requestDate.getHours() - DISPLAY_OFFSET_HOURS);
  const preferredDateTime = formatAPIDateTime(requestDate);
  isScheduling = true;
  status('Scheduling appointment...', 'info');
  logConsole('Request: schedule_appointment', { preferredDateTime });
  slotEl?.setAttribute('disabled', 'disabled');
  slotEl?.classList.add('disabled-slot');
  scheduleConfirmBtn?.setAttribute('disabled', 'disabled');
  scheduleCancelBtn?.setAttribute('disabled', 'disabled');
  if (scheduleError) scheduleError.hidden = true;

  try {
    const res = await api('schedule-appointment', { org: currentOrg, preferredDateTime });
    if (!res || res.success === false) {
      throw new Error(res?.error || 'Scheduling failed');
    }
    const appointmentId =
      res?.data?.Appointment?.AppointmentId ||
      res?.data?.AppointmentId ||
      'Appointment';
    const message = `Appointment <strong>${appointmentId}</strong> scheduled on ${slotDate.toLocaleDateString()} at ${slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    closeScheduleModal();
    openConfirmationModal('Appointment Scheduled', message);
    status(`Scheduled ${appointmentId}`, 'success');
    logConsole('Response: schedule_appointment', { success: true, appointmentId });
    
    // FIXED: Store details but don't download yet - user hasn't seen the toggle
    lastScheduledDetails = {
      appointmentId,
      slotDate: new Date(slotDate),
      durationMinutes: 60
    };
    
    pendingSlot = null;
    await refreshDayColumn(slotDate);
    const refreshedSlotEl = findSlotElementForDate(slotDate);
    if (refreshedSlotEl) {
      highlightSlot(refreshedSlotEl);
    }
  } catch (err) {
    console.error('schedule appointment failed', err);
    status(err.message || 'Scheduling failed', 'error');
    logConsole('Error: schedule_appointment', err.message || err.toString());
    if (scheduleError) {
      scheduleError.textContent = err.message || 'Scheduling failed';
      scheduleError.hidden = false;
    }
  } finally {
    isScheduling = false;
    slotEl?.removeAttribute('disabled');
    slotEl?.classList.remove('disabled-slot');
    scheduleConfirmBtn?.removeAttribute('disabled');
    scheduleCancelBtn?.removeAttribute('disabled');
  }
}

async function api(action, data = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const payload = { action, ...data };
  logConsole('API Request', { action, payload });
  try {
    const response = await fetch('/api/validate', {
    method: 'POST',
    headers,
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    logConsole('API Response', { action, status: response.status, body: json });
    return json;
  } catch (err) {
    logConsole('API Error', { action, error: err?.message || err });
    throw err;
  }
}

window.addEventListener('load', async () => {
  loadTheme();
  try {
    // Detect device type
    const deviceType = isMobileViewport ? 'mobile' : 'browser';
    logConsole('Request: app_opened', { action: 'app_opened', device_type: deviceType });
    await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'app_opened', device_type: deviceType })
    });
    logConsole('Response: app_opened', { success: true });
  } catch (err) {
    console.error('App init failed', err);
    logConsole('Error: app_opened', err.message || err.toString());
  }
  if (orgInput) {
    orgInput.value = DEFAULT_ORG;
  }
  authSection?.classList.add('d-none');
  await handleAuth();
  updateBackToTopVisibility();
  if (isMobileViewport) setSearchCollapsed(true);
});

async function handleAuth() {
  const org = orgInput?.value.trim();
  if (!org) {
    status('ORG required', 'error');
    return;
  }

  status('Authenticating...');
  logConsole('Request: auth', { org });
  const res = await api('auth', { org });
  if (!res.success) {
    status(res.error || 'Auth failed', 'error');
    if (mainUI?.style) mainUI.style.display = 'none';
    resetWorkspace();
    logConsole('Response: auth', { success: false, error: res.error || 'Auth failed' });
    return;
  }

  token = res.token;
  currentOrg = org;
  logConsole('Response: auth', { success: true });
  status(`Authenticated as ${org}`, 'success');
  if (mainUI?.style) mainUI.style.display = 'block';
  workspace?.classList.add('unlocked');
  authSection?.classList.add('d-none');
  await loadAndRenderCalendar();
}

orgInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAuth();
  }
});

authBtn?.addEventListener('click', handleAuth);

scheduleCancelBtn?.addEventListener('click', () => {
  if (isScheduling) return;
  closeScheduleModal();
});

scheduleConfirmBtn?.addEventListener('click', async () => {
  if (!pendingSlot || isScheduling) return;
  const po = schedulePoInput?.value.trim();
  if (!po) {
    if (scheduleError) {
      scheduleError.textContent = 'Purchase Order is required';
      scheduleError.hidden = false;
    }
    return;
  }
  if (scheduleError) scheduleError.hidden = true;
  await scheduleSlot(pendingSlot.slotDate, pendingSlot.slotEl);
});

// FIXED: Download ICS based on toggle state when user closes confirmation modal
modalCloseBtn?.addEventListener('click', () => {
  // Check if ICS download is enabled and download if so
  if (calendarDownloadEnabled && lastScheduledDetails) {
    downloadIcs(lastScheduledDetails);
  }
  
  // After success, highlight the scheduled slot as a visual confirmation
  if (lastScheduledDetails?.slotDate) {
    const el = findSlotElementForDate(lastScheduledDetails.slotDate);
    if (el) highlightSlot(el);
  }
  closeConfirmationModal();
});

// Prevent closing schedule/confirmation modals via backdrop; allow only theme modal
modalBackdrop?.addEventListener('click', () => {
  if (isModalVisible(themeModal)) {
    closeThemeModal();
  }
});

themeSelectorBtn?.addEventListener('click', openThemeModal);

[schedulePoInput, scheduleDriverInput].forEach(input => {
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      scheduleConfirmBtn?.click();
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && isModalVisible(confirmationModal)) {
    e.preventDefault();
    closeConfirmationModal();
  }
});

async function handlePrevJump(button) {
  if (!calendarInitialized || isFetching) return;
  flashNavButton(button);
  if (isMobileViewport) {
    // Mobile: strictly go one week back from mobileNavIso
    const baseline = mobileNavIso || formatISODate(getEffectiveWeekStart(new Date()));
    const prevIso = formatISODate(addDays(parseISODate(baseline), -WEEK_STEP));
    await ensureWeekLoaded(prevIso);
    mobileNavIso = prevIso;
    activeWeekIso = prevIso;
    scrollToWeekStart(prevIso);
    return;
  }
  // Desktop: Replace current week with previous week
  const baselineIso = formatISODate(getEffectiveWeekStart(new Date()));
  const currentIso = activeWeekIso || baselineIso;
  if (!currentIso || currentIso === baselineIso) return;
  const previousIso = formatISODate(addDays(parseISODate(currentIso), -WEEK_STEP));
  await ensureWeekLoaded(previousIso);
  if (!weekData.has(previousIso)) return;
  activeWeekIso = previousIso;
  currentRangeStart = parseISODate(activeWeekIso);
  // On desktop, clear old weeks and keep only the active one
  if (!isMobileViewport) {
    const keepWeek = activeWeekIso;
    loadedWeeks.length = 0;
    if (keepWeek && weekData.has(keepWeek)) {
      loadedWeeks.push(keepWeek);
    }
  }
  renderCalendar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleNextJump(button) {
  if (!calendarInitialized || isFetching) return;
  flashNavButton(button);
  if (isMobileViewport) {
    // Mobile: strictly go one week forward from mobileNavIso
    const baseline = mobileNavIso || formatISODate(getEffectiveWeekStart(new Date()));
    const nextIso = formatISODate(addDays(parseISODate(baseline), WEEK_STEP));
    await ensureWeekLoaded(nextIso);
    mobileNavIso = nextIso;
    activeWeekIso = nextIso;
    requestAnimationFrame(() => scrollToWeekStart(nextIso));
    return;
  }
  // Desktop: Replace current week with next week
  const baselineIso = formatISODate(getEffectiveWeekStart(new Date()));
  const currentIso = activeWeekIso || baselineIso;
  const nextIso = formatISODate(addDays(parseISODate(currentIso), WEEK_STEP));
  await ensureWeekLoaded(nextIso);
  if (!weekData.has(nextIso)) return;
  activeWeekIso = nextIso;
  currentRangeStart = parseISODate(activeWeekIso);
  // On desktop, clear old weeks and keep only the active one
  if (!isMobileViewport) {
    const keepWeek = activeWeekIso;
    loadedWeeks.length = 0;
    if (keepWeek && weekData.has(keepWeek)) {
      loadedWeeks.push(keepWeek);
    }
  }
  renderCalendar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

prevRangeBtn?.addEventListener('click', () => handlePrevJump(prevRangeBtn));
nextRangeBtn?.addEventListener('click', () => handleNextJump(nextRangeBtn));

searchBtn?.addEventListener('click', handleAppointmentSearch);
searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAppointmentSearch();
  }
});
searchInput?.addEventListener('input', () => {
  if (searchError && !searchError.hidden) {
    clearSearchError();
  }
  if (!searchInput.value) setSearchCollapsed(true);
});

slotInfoCloseBtn?.addEventListener('click', hideSlotInfoToast);
backToTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', updateBackToTopVisibility);
window.addEventListener('scroll', handleInfiniteScroll);
searchInput?.addEventListener('focus', () => setSearchCollapsed(false));
searchInput?.addEventListener('blur', () => {
  if (!searchInput.value) setSearchCollapsed(true);
});
icsToggleBtn?.addEventListener('click', toggleIcsPreference);
document.addEventListener('click', e => {
  if (!slotInfoToast || slotInfoToast.hidden) return;
  if (slotInfoToast.contains(e.target)) return;
  if (e.target.closest('.slot-info-btn')) return;
  hideSlotInfoToast();
});