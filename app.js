/**
 * WideEYE — Phase 1 Interactive Landing Page Script
 * Brand: WideEYE (Strict Black & White Minimalist Mobility System)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 1. Sticky Header Scroll Effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveNavLink();
  });

  // 2. Active Navigation Link on Scroll
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
  const sections = document.querySelectorAll('section[id]');

  function updateActiveNavLink() {
    let currentSectionId = '';
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  }

  // 3. Mobile Navigation Drawer Handling
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  function openDrawer() {
    mobileDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    mobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('active');
    document.body.style.overflow = '';
    mobileToggle.setAttribute('aria-expanded', 'false');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) closeDrawer();
    });
  }

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  // 4. Interactive Booking Modal (Phase 1 Visual Experience)
  const bookingModal = document.getElementById('booking-modal');
  const openBookingBtns = document.querySelectorAll('.open-booking-modal');
  const closeBookingBtn = document.getElementById('close-booking-modal');
  const confirmBookingBtn = document.getElementById('confirm-booking-btn');
  const toastNotify = document.getElementById('toast-notify');

  function openModal() {
    if (bookingModal) {
      bookingModal.classList.add('active');
      bookingModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (mobileDrawer.classList.contains('active')) {
        closeDrawer();
      }
    }
  }

  function closeModal() {
    if (bookingModal) {
      bookingModal.classList.remove('active');
      bookingModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  openBookingBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeBookingBtn) closeBookingBtn.addEventListener('click', closeModal);

  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) closeModal();
    });
  }

  // Handle ESC key to close modal/drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
  });

  // Ride Tier Selection in Modal
  window.selectRideTier = function(element, tierName, price) {
    document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
  };

  // Confirm booking simulation
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', () => {
      closeModal();
      showToast('Booking Simulated!', 'WideEYE Safety Monitor Connected & Trip Active.');
    });
  }

  function showToast(title, message) {
    if (!toastNotify) return;
    const strong = toastNotify.querySelector('strong');
    const p = toastNotify.querySelector('p');
    if (strong) strong.textContent = title;
    if (p) p.textContent = message;

    toastNotify.classList.add('show');
    setTimeout(() => {
      toastNotify.classList.remove('show');
    }, 4000);
  }

  // 5. Interactive Safety Monitor State Switcher (Simulator for SIH Judges)
  window.switchMonitorState = function(state) {
    const btnSafe = document.getElementById('btn-state-safe');
    const btnWarn = document.getElementById('btn-state-warn');
    const driverStatus = document.getElementById('monitor-driver-status');
    const scoreVal = document.getElementById('monitor-score-val');
    const meterFill = document.getElementById('monitor-meter-fill');
    const scoreBadge = document.querySelector('.score-level-badge');
    const trackingTag = document.querySelector('.tracking-tag');

    if (state === 'safe') {
      btnSafe.classList.add('active');
      btnWarn.classList.remove('active');

      if (driverStatus) {
        driverStatus.textContent = 'SAFE';
        driverStatus.className = 'm-value status-safe';
      }
      if (scoreVal) scoreVal.textContent = '18%';
      if (meterFill) {
        meterFill.style.width = '18%';
        meterFill.style.backgroundColor = '#10B981';
      }
      if (scoreBadge) {
        scoreBadge.textContent = 'LOW RISK';
        scoreBadge.className = 'score-level-badge badge-normal';
      }
      if (trackingTag) {
        trackingTag.textContent = 'DRIVER_EYE_TRACK [OK]';
        trackingTag.style.color = '#FFFFFF';
      }
    } else if (state === 'fatigue') {
      btnWarn.classList.add('active');
      btnSafe.classList.remove('active');

      if (driverStatus) {
        driverStatus.textContent = 'FATIGUE ALERT';
        driverStatus.className = 'm-value status-warn';
      }
      if (scoreVal) scoreVal.textContent = '82%';
      if (meterFill) {
        meterFill.style.width = '82%';
        meterFill.style.backgroundColor = '#EF4444';
      }
      if (scoreBadge) {
        scoreBadge.textContent = 'HIGH RISK';
        scoreBadge.className = 'score-level-badge badge-danger';
      }
      if (trackingTag) {
        trackingTag.textContent = 'EAR_DROWSY_THRESHOLD [WARN]';
        trackingTag.style.color = '#EF4444';
      }
    }
  };

});


