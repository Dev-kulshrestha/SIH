/**
 * WideEYE — Phase 3 Driver Profile + Live Ride Tracking Script
 * Brand: BLACK + LEMON YELLOW (#DFFF00) + WHITE (#FFFFFF)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 1. STATE DEFINITIONS
  const STATES = {
    1: {
      kicker: 'Ride Confirmed',
      mainStatus: 'Your driver is on the way',
      subStatus: 'Track your ride in real time.',
      etaNum: '3 min',
      etaLbl: 'Driver arriving soon',
      distText: '1.2 km away',
      mapHeading: 'Driver is 3 min away',
      mapDesc: 'Rahul Kumar is heading to your pickup location.',
      progressPct: 25,
      activeStep: 1,
      driverPos: { top: 48, left: 34 },
      pathOffset: 600
    },
    2: {
      kicker: 'Driver Approaching',
      mainStatus: 'Driver is arriving',
      subStatus: 'Please be ready at your pickup location.',
      etaNum: '1 min',
      etaLbl: 'Driver near pickup point',
      distText: '350 m away',
      mapHeading: 'Driver is 1 min away',
      mapDesc: 'Rahul Kumar is turning into Cyber City Boulevard.',
      progressPct: 40,
      activeStep: 1,
      driverPos: { top: 54, left: 28 },
      pathOffset: 600
    },
    3: {
      kicker: 'Driver At Pickup',
      mainStatus: 'Driver has arrived',
      subStatus: 'Rahul Kumar is waiting at Cyber City Gate 2.',
      etaNum: 'Arrived',
      etaLbl: 'Meet at pickup point',
      distText: 'At pickup location',
      mapHeading: 'Rahul Kumar has arrived',
      mapDesc: 'Vehicle: White Auto (UP32 AB 1234).',
      progressPct: 50,
      activeStep: 2,
      driverPos: { top: 57.5, left: 24 },
      pathOffset: 600
    },
    4: {
      kicker: 'Trip Active',
      mainStatus: 'Ride started',
      subStatus: 'WideEYE Safety AI is actively monitoring the journey.',
      etaNum: '22 min',
      etaLbl: 'Estimated arrival at City Centre',
      distText: '7.9 km to destination',
      mapHeading: 'En Route to City Centre',
      mapDesc: 'Trip in progress · Safety camera connected.',
      progressPct: 60,
      activeStep: 3,
      driverPos: { top: 52, left: 36 },
      pathOffset: 450
    },
    5: {
      kicker: 'In Transit',
      mainStatus: 'Heading to destination',
      subStatus: 'Taking MG Road Arterial Expressway.',
      etaNum: '12 min',
      etaLbl: 'Estimated arrival at City Centre',
      distText: '4.2 km to destination',
      mapHeading: 'Smooth traffic on MG Road',
      mapDesc: 'Speed: 42 km/h · Driver alert score: 98%.',
      progressPct: 75,
      activeStep: 3,
      driverPos: { top: 42, left: 52 },
      pathOffset: 280
    },
    6: {
      kicker: 'Approaching Destination',
      mainStatus: 'Almost there',
      subStatus: 'Approaching Sector 29, City Centre.',
      etaNum: '2 min',
      etaLbl: 'Prepare to exit',
      distText: '600 m to destination',
      mapHeading: 'Arriving in 2 min',
      mapDesc: 'Entering Sector 29 Leisure Valley entrance.',
      progressPct: 90,
      activeStep: 3,
      driverPos: { top: 32, left: 70 },
      pathOffset: 80
    },
    7: {
      kicker: 'Trip Completed',
      mainStatus: "You've arrived",
      subStatus: 'Thank you for riding safe with WideEYE.',
      etaNum: 'Completed',
      etaLbl: 'Safe arrival verified',
      distText: 'Destination reached',
      mapHeading: 'Trip Completed Successfully',
      mapDesc: 'Total Fare: ₹96 (Paid via Cash).',
      progressPct: 100,
      activeStep: 4,
      driverPos: { top: 27.5, left: 78 },
      pathOffset: 0
    }
  };

  let currentState = 1;
  let autoSimInterval = null;

  // 2. DOM ELEMENT REFERENCES
  const trackingKicker = document.getElementById('tracking-kicker');
  const trackingMainStatus = document.getElementById('tracking-main-status');
  const trackingSubStatus = document.getElementById('tracking-sub-status');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const etaHeroNumber = document.getElementById('eta-hero-number');
  const etaHeroLabel = document.getElementById('eta-hero-label');
  const etaDistText = document.getElementById('eta-dist-text');
  const mapStatusHeading = document.getElementById('map-status-heading');
  const mapStatusDesc = document.getElementById('map-status-desc');
  const liveDriverMarker = document.getElementById('live-driver-marker');
  const driverMapSubText = document.getElementById('driver-map-sub-text');
  const activeProgressPath = document.getElementById('active-progress-path');

  // Modals
  const callModal = document.getElementById('call-modal');
  const shareModal = document.getElementById('share-modal');
  const safetyModal = document.getElementById('safety-modal');
  const chatDrawer = document.getElementById('chat-drawer');
  const toastNotify = document.getElementById('toast-notify');

  // 3. APPLY RIDE STATE FUNCTION
  function applyRideState(stateNum) {
    currentState = stateNum;
    const s = STATES[stateNum];
    if (!s) return;

    if (trackingKicker) trackingKicker.textContent = s.kicker;
    if (trackingMainStatus) trackingMainStatus.textContent = s.mainStatus;
    if (trackingSubStatus) trackingSubStatus.textContent = s.subStatus;
    if (progressBarFill) progressBarFill.style.width = `${s.progressPct}%`;
    if (etaHeroNumber) etaHeroNumber.textContent = s.etaNum;
    if (etaHeroLabel) etaHeroLabel.textContent = s.etaLbl;
    if (etaDistText) etaDistText.textContent = s.distText;
    if (mapStatusHeading) mapStatusHeading.textContent = s.mapHeading;
    if (mapStatusDesc) mapStatusDesc.textContent = s.mapDesc;

    if (driverMapSubText) {
      driverMapSubText.textContent = s.etaNum;
    }

    // Move Driver Marker smoothly
    if (liveDriverMarker) {
      liveDriverMarker.style.top = `${s.driverPos.top}%`;
      liveDriverMarker.style.left = `${s.driverPos.left}%`;
    }

    // Update active SVG route stroke
    if (activeProgressPath) {
      activeProgressPath.style.strokeDashoffset = s.pathOffset;
    }

    // Stepper styling
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`prog-step-${i}`);
      if (stepEl) {
        if (i <= s.activeStep) {
          stepEl.classList.add('active');
        } else {
          stepEl.classList.remove('active');
        }
      }
    }

    // Update demo switcher active button
    document.querySelectorAll('.stage-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`stage-btn-${stateNum}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Special state styling
    if (stateNum === 7) {
      showToast("Trip Completed ✓", "Safe arrival at City Centre Mall.");
      const compModal = document.getElementById('trip-completed-modal');
      if (compModal) {
        setTimeout(() => {
          compModal.classList.add('active');
          compModal.setAttribute('aria-hidden', 'false');
          if (window.lucide) window.lucide.createIcons();
        }, 1200);
      }
    }
  }

  // 4. AUTOMATIC SIMULATION TIMER (Plays through the entire journey)
  function startSimulation() {
    autoSimInterval = setInterval(() => {
      if (currentState < 7) {
        applyRideState(currentState + 1);
      } else {
        clearInterval(autoSimInterval);
      }
    }, 4500);
  }

  // Allow manual jump by SIH judges
  window.jumpToRideState = function(stateNum) {
    if (autoSimInterval) clearInterval(autoSimInterval);
    applyRideState(stateNum);
  };

  // Initial State Apply
  applyRideState(1);
  startSimulation();

  // 5. CALL DRIVER MODAL
  window.openCallModal = function() {
    if (callModal) {
      callModal.classList.add('active');
      callModal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeCallModal = function() {
    if (callModal) {
      callModal.classList.remove('active');
      callModal.setAttribute('aria-hidden', 'true');
    }
  };

  window.executeCallSimulation = function() {
    closeCallModal();
    showToast("Calling Rahul Kumar...", "Connecting through secure masked private proxy.");
  };

  // 6. CHAT WITH DRIVER DRAWER
  window.openChatDrawer = function() {
    if (chatDrawer) {
      chatDrawer.classList.add('active');
      chatDrawer.setAttribute('aria-hidden', 'false');
      const input = document.getElementById('chat-input-text');
      if (input) input.focus();
    }
  };

  window.closeChatDrawer = function() {
    if (chatDrawer) {
      chatDrawer.classList.remove('active');
      chatDrawer.setAttribute('aria-hidden', 'true');
    }
  };

  window.sendUserChatMessage = function() {
    const input = document.getElementById('chat-input-text');
    const messagesList = document.getElementById('chat-messages-list');
    if (!input || !input.value.trim() || !messagesList) return;

    const userText = input.value.trim();
    input.value = '';

    // Append User message
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-bubble';
    userBubble.innerHTML = `<p>${userText}</p><span class="chat-time">Just now</span>`;
    messagesList.appendChild(userBubble);
    messagesList.scrollTop = messagesList.scrollHeight;

    // Simulate Driver auto-reply after 1.2s
    setTimeout(() => {
      const driverReplies = [
        "Got it! I am arriving right now.",
        "Yes, I see your location. Standing by near the gate.",
        "Understood. Drive safe, arriving in 1 minute.",
        "Thank you! WideEYE Safety is active on our route."
      ];
      const randomReply = driverReplies[Math.floor(Math.random() * driverReplies.length)];

      const driverBubble = document.createElement('div');
      driverBubble.className = 'chat-bubble driver-bubble';
      driverBubble.innerHTML = `<p>${randomReply}</p><span class="chat-time">Just now</span>`;
      messagesList.appendChild(driverBubble);
      messagesList.scrollTop = messagesList.scrollHeight;
    }, 1200);
  };

  // Support Enter key to send chat
  const chatInput = document.getElementById('chat-input-text');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendUserChatMessage();
      }
    });
  }

  // 7. SHARE TRIP MODAL
  window.openShareModal = function() {
    if (shareModal) {
      shareModal.classList.add('active');
      shareModal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeShareModal = function() {
    if (shareModal) {
      shareModal.classList.remove('active');
      shareModal.setAttribute('aria-hidden', 'true');
    }
  };

  window.copyTripLink = function() {
    const linkInput = document.getElementById('share-link-val');
    if (linkInput) {
      navigator.clipboard.writeText(linkInput.value);
      showToast("Link Copied!", "Trip tracking link copied to clipboard.");
    }
  };

  window.executeShareTrip = function() {
    closeShareModal();
    showToast("Trip Shared ✓", "Live tracking details sent to your emergency contacts.");
  };

  // 8. SAFETY QUICK MODAL
  window.openSafetyModal = function() {
    if (safetyModal) {
      safetyModal.classList.add('active');
      safetyModal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeSafetyModal = function() {
    if (safetyModal) {
      safetyModal.classList.remove('active');
      safetyModal.setAttribute('aria-hidden', 'true');
    }
  };

  // 9. COLLAPSIBLE TRIP DETAILS
  window.toggleTripDetails = function() {
    const body = document.getElementById('trip-details-body');
    const chevron = document.getElementById('trip-details-chevron');
    if (body) {
      body.classList.toggle('open');
      if (chevron) {
        chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    }
  };

  // 10. MAP ZOOM & RECENTER
  window.simulateTrackingZoom = function(delta) {
    const canvas = document.getElementById('tracking-canvas');
    if (!canvas) return;
    let currentScale = parseFloat(canvas.getAttribute('data-scale') || '1');
    currentScale = Math.max(0.85, Math.min(1.4, currentScale + delta * 0.12));
    canvas.setAttribute('data-scale', currentScale);
    canvas.style.transform = `scale(${currentScale})`;
  };

  window.recenterToDriver = function() {
    const canvas = document.getElementById('tracking-canvas');
    if (canvas) {
      canvas.setAttribute('data-scale', '1.1');
      canvas.style.transform = 'scale(1.1)';
      showToast("Focused on Driver", "Live camera tracked onto Rahul Kumar's vehicle.");
    }
  };

  // Toast Helper
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

  // Handle ESC key to close all modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCallModal();
      closeChatDrawer();
      closeShareModal();
      closeSafetyModal();
    }
  });

});
