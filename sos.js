/**
 * WideEYE — Phase 6: Emergency SOS & Response System 🆘
 * Brand: BLACK + LEMON YELLOW (#DFFF00) + WHITE (#FFFFFF)
 * RED (#EF4444) used strictly for emergency state indicators
 */

class WideEyeEmergencyCenter {
  constructor() {
    // State: 'SOS_COUNTDOWN' | 'SOS_ACTIVE' | 'SOS_CANCELLED' | 'EMERGENCY_RESOLVED'
    this.state = 'SOS_COUNTDOWN';
    this.audioEnabled = true;
    this.countdownSeconds = 5;
    this.countdownInterval = null;
    this.locationHeartbeatInterval = null;
    
    // Emergency Context Data (Consistent across Phase 2, 3, 4, 5)
    this.data = {
      driver: 'Rahul Kumar',
      driverRating: '★ 4.8',
      vehicle: 'White Auto (UP32 AB 1234)',
      tripId: 'WE-24081',
      pickup: 'DLF Cyber City, Phase 2, Gurugram',
      destination: 'City Centre Mall, MG Road, Gurugram',
      fare: '₹96',
      distance: '8.4 km',
      riskScore: 94,
      coordinates: { lat: 28.4986, lng: 77.0878 },
      speed: '34 km/h',
      contact: {
        name: 'Priya Sharma',
        relationship: 'Emergency Contact',
        phone: '+91 98765 XXXXX',
        status: 'Notification Sent'
      }
    };

    // Timeline Log
    this.timelineEvents = [];

    // Audio Context
    this.audioContext = null;
    this.audioOscillator = null;

    this.bindDom();
    this.initAudioContext();
    this.parseUrlParams();
    this.initEmergencyFlow();
  }

  bindDom() {
    this.dom = {
      // Countdown Modal
      countdownModal: document.getElementById('sos-countdown-modal'),
      countdownNumber: document.getElementById('sos-countdown-number'),
      countdownCircle: document.getElementById('sos-countdown-circle'),
      
      // Active Emergency Container
      emergencyMainContent: document.getElementById('emergency-main-content'),
      
      // Status & Header
      topStatusPill: document.getElementById('top-sos-status-pill'),
      soundToggleBtn: document.getElementById('btn-sound-toggle'),
      soundLabel: document.getElementById('sound-label'),
      soundIcon: document.getElementById('sound-icon'),
      
      // Map & Telemetry
      emergencyMapCanvas: document.getElementById('emergency-map-canvas'),
      gpsCoordText: document.getElementById('gps-coords-text'),
      speedText: document.getElementById('vehicle-speed-text'),
      locationHeartbeatTime: document.getElementById('location-heartbeat-time'),
      
      // Cards & Data
      driverRiskVal: document.getElementById('driver-risk-val'),
      contactStatusBadge: document.getElementById('contact-status-badge'),
      timelineList: document.getElementById('emergency-timeline-list'),
      
      // Modals & Toasts
      resolveModal: document.getElementById('resolve-emergency-modal'),
      toastContainer: document.getElementById('emergency-toast-container')
    };
  }

  initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API unavailable.', e);
    }
  }

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('score')) {
      this.data.riskScore = parseInt(params.get('score'), 10) || 94;
    }
    if (this.dom.driverRiskVal) {
      this.dom.driverRiskVal.textContent = `${this.data.riskScore}% (CRITICAL)`;
    }
  }

  initEmergencyFlow() {
    // Check if immediate countdown should start
    this.startCountdown();
  }

  // 1. SOS COUNTDOWN (5..4..3..2..1)
  startCountdown() {
    this.state = 'SOS_COUNTDOWN';
    this.countdownSeconds = 5;

    if (this.dom.countdownModal) {
      this.dom.countdownModal.classList.add('active');
    }
    if (this.dom.countdownNumber) {
      this.dom.countdownNumber.textContent = '5';
    }

    this.logTimeline('CRITICAL_DETECTED', `Critical drowsiness (${this.data.riskScore}%) detected · Emergency countdown initiated`);
    this.playCountdownBeep();

    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;

      if (this.dom.countdownNumber) {
        this.dom.countdownNumber.textContent = String(this.countdownSeconds);
      }

      if (this.dom.countdownCircle) {
        const offset = 283 - (283 * ((5 - this.countdownSeconds) / 5));
        this.dom.countdownCircle.style.strokeDashoffset = offset;
      }

      this.playCountdownBeep();

      if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownInterval);
        this.activateSOS();
      }
    }, 1000);
  }

  cancelSOS() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.state = 'SOS_CANCELLED';
    this.stopAudio();

    if (this.dom.countdownModal) {
      this.dom.countdownModal.classList.remove('active');
    }

    this.showToast('SOS Cancelled · Returning to monitoring', 'info');
    this.logTimeline('SOS_CANCELLED', 'Emergency SOS cancelled by user');

    setTimeout(() => {
      window.location.href = 'track.html';
    }, 1200);
  }

  // 2. SOS ACTIVATED (MAIN EMERGENCY STATE)
  activateSOS() {
    this.state = 'SOS_ACTIVE';
    if (this.dom.countdownModal) {
      this.dom.countdownModal.classList.remove('active');
    }

    this.playEmergencySiren();
    this.logTimeline('SOS_ACTIVATED', '🚨 SOS ACTIVATED · Emergency triage mode engaged');

    // Trigger Sequential Dispatches & Notification Toasts
    setTimeout(() => {
      this.showToast('Location detected: DLF Cyber City (28.4986° N, 77.0878° E) ✓', 'success');
      this.logTimeline('LOCATION_DETECTED', 'High-precision GPS location locked');
    }, 400);

    setTimeout(() => {
      this.showToast('Live location shared with emergency contacts ✓', 'success');
      this.logTimeline('LOCATION_SHARED', 'Live tracking URL transmitted to trusted contacts');
    }, 1200);

    setTimeout(() => {
      this.showToast('Emergency contact Priya Sharma notified via SMS & App ✓', 'success');
      this.logTimeline('CONTACT_NOTIFIED', 'Emergency SMS & in-app push alert dispatched to Priya Sharma');
      if (this.dom.contactStatusBadge) {
        this.dom.contactStatusBadge.innerHTML = '✓ Notification Sent';
      }
    }, 2000);

    setTimeout(() => {
      this.showToast('Emergency assistance request initiated (Simulated Triage) ✓', 'warning');
      this.logTimeline('ASSISTANCE_DISPATCHED', 'Central emergency assistance request logged with dispatch center');
    }, 2800);

    // Initialize Map Rendering & Location Heartbeat
    this.initEmergencyMap();
    this.startLocationHeartbeat();
  }

  // 3. LIVE EMERGENCY LOCATION MAP
  initEmergencyMap() {
    const canvas = this.dom.emergencyMapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Black Canvas
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle Road Grid
      ctx.strokeStyle = '#181818';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Major Arterial Road Lines
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Route Path (Cyber City ➔ MG Road)
      ctx.beginPath();
      ctx.moveTo(120, 360);
      ctx.lineTo(260, 280);
      ctx.lineTo(440, 280);
      ctx.lineTo(580, 160);
      ctx.lineTo(760, 160);
      ctx.stroke();

      // Lemon Yellow Active Route Vector
      ctx.strokeStyle = '#DFFF00';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Pickup Marker (Lemon Yellow Dot)
      ctx.fillStyle = '#DFFF00';
      ctx.beginPath();
      ctx.arc(120, 360, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.arc(120, 360, 3, 0, 2 * Math.PI);
      ctx.fill();

      // Destination Marker (Crisp White / Black)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(760, 160, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#050505';
      ctx.beginPath();
      ctx.arc(760, 160, 3, 0, 2 * Math.PI);
      ctx.fill();

      // CURRENT VEHICLE POSITION: PULSING RED EMERGENCY MARKER
      const vehicleX = 390;
      const vehicleY = 280;

      // Pulsing Emergency Radar Ring
      const pulseTime = (performance.now() % 1500) / 1500;
      const pulseRadius = 16 + (pulseTime * 28);
      const pulseAlpha = 1 - pulseTime;

      ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(vehicleX, vehicleY, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Red Outer Circle
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(vehicleX, vehicleY, 15, 0, 2 * Math.PI);
      ctx.fill();

      // White Center Vehicle Icon Dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(vehicleX, vehicleY, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Marker Label
      ctx.font = 'bold 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('EMERGENCY VEHICLE HERE', vehicleX - 65, vehicleY - 24);

      if (this.state === 'SOS_ACTIVE') {
        requestAnimationFrame(renderMap);
      }
    };

    renderMap();
  }

  startLocationHeartbeat() {
    if (this.locationHeartbeatInterval) clearInterval(this.locationHeartbeatInterval);
    
    this.locationHeartbeatInterval = setInterval(() => {
      if (this.state !== 'SOS_ACTIVE') return;

      // Subtle realistic coordinate jitter to simulate live GPS tracking
      const latJitter = (Math.random() - 0.5) * 0.0002;
      const lngJitter = (Math.random() - 0.5) * 0.0002;
      const currentLat = (this.data.coordinates.lat + latJitter).toFixed(4);
      const currentLng = (this.data.coordinates.lng + lngJitter).toFixed(4);

      if (this.dom.gpsCoordText) {
        this.dom.gpsCoordText.textContent = `${currentLat}° N, ${currentLng}° E`;
      }
      if (this.dom.locationHeartbeatTime) {
        const now = new Date();
        this.dom.locationHeartbeatTime.textContent = `Updated ${now.toTimeString().split(' ')[0]}`;
      }
    }, 4000);
  }

  // 4. EMERGENCY ACTIONS
  callEmergencyContact() {
    this.showToast(`Connecting masked proxy call to ${this.data.contact.name}...`, 'info');
    this.logTimeline('CALL_INITIATED', `Direct call initiated to emergency contact: ${this.data.contact.name} (${this.data.contact.phone})`);
  }

  sendEmergencyUpdate() {
    this.showToast(`Status update sent to ${this.data.contact.name} (Simulated SMS) ✓`, 'success');
    this.logTimeline('UPDATE_SENT', `SMS & WhatsApp location update dispatched to ${this.data.contact.name}`);
  }

  shareLiveLocation() {
    const shareUrl = `https://wideeye.safety/live-sos?trip=${this.data.tripId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showToast('Emergency tracking link copied to clipboard ✓', 'success');
      });
    } else {
      this.showToast('Emergency tracking link copied: ' + shareUrl, 'info');
    }
    this.logTimeline('SHARE_LINK', 'Emergency location sharing link generated & copied');
  }

  // 5. EMERGENCY RESOLUTION WORKFLOW
  promptResolveEmergency() {
    if (this.dom.resolveModal) {
      this.dom.resolveModal.classList.add('active');
    }
  }

  cancelResolveModal() {
    if (this.dom.resolveModal) {
      this.dom.resolveModal.classList.remove('active');
    }
  }

  confirmResolveEmergency() {
    this.state = 'EMERGENCY_RESOLVED';
    this.stopAudio();

    if (this.dom.resolveModal) {
      this.dom.resolveModal.classList.remove('active');
    }

    this.logTimeline('EMERGENCY_RESOLVED', 'Emergency incident marked as resolved and closed.');
    this.showToast('Emergency Resolved ✓ Returning to live ride...', 'success');

    setTimeout(() => {
      window.location.href = 'track.html';
    }, 1500);
  }

  // 6. SYNTHESIZED WEB AUDIO EMERGENCY ALARM
  playCountdownBeep() {
    if (!this.audioEnabled || !this.audioContext) return;
    this.resumeAudio();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  playEmergencySiren() {
    if (!this.audioEnabled || !this.audioContext) return;
    this.resumeAudio();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1300, ctx.currentTime + 0.4);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  }

  stopAudio() {
    if (this.audioOscillator) {
      try { this.audioOscillator.stop(); } catch (e) {}
      this.audioOscillator = null;
    }
  }

  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    if (this.dom.soundLabel) {
      this.dom.soundLabel.textContent = this.audioEnabled ? 'Emergency Sound On' : 'Emergency Sound Off';
    }
    if (this.dom.soundIcon) {
      this.dom.soundIcon.setAttribute('data-lucide', this.audioEnabled ? 'volume-2' : 'volume-x');
      if (window.lucide) window.lucide.createIcons();
    }
    this.showToast(this.audioEnabled ? 'Emergency Audio Enabled' : 'Emergency Audio Muted', 'info');
  }

  resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 7. TOAST NOTIFICATION GENERATOR
  showToast(message, type = 'info') {
    if (!this.dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `emergency-toast-item ${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    this.dom.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // 8. EVENT TIMELINE LOGGING
  logTimeline(eventType, description) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    this.timelineEvents.unshift({ time: timeStr, type: eventType, text: description });

    if (this.dom.timelineList) {
      this.dom.timelineList.innerHTML = this.timelineEvents
        .map((e, idx) => `
          <li class="emergency-timeline-item ${idx === 0 ? 'active-event' : 'completed-event'}">
            <span class="timeline-dot-icon">${idx === 0 ? '●' : '✓'}</span>
            <span class="time-col">${e.time}</span>
            <span class="text-col">${e.text}</span>
          </li>
        `)
        .join('');
    }
  }
}

// Global exposure
window.WideEyeEmergencyCenter = WideEyeEmergencyCenter;
