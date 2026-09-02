/**
 * WideEYE — Phase 6: Emergency SOS & Response System 🆘
 * Brand: BLACK + LEMON YELLOW (#D4A017) + WHITE (#FFFFFF)
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
      countdownSecText: document.getElementById('sos-countdown-sec-text'),
      
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
      this.dom.countdownNumber.style.animation = 'none';
      void this.dom.countdownNumber.offsetWidth;
      this.dom.countdownNumber.style.animation = 'sos-num-tick 0.35s ease-out';
    }
    if (this.dom.countdownSecText) {
      this.dom.countdownSecText.textContent = '5 seconds';
    }
    if (this.dom.countdownCircle) {
      this.dom.countdownCircle.style.strokeDashoffset = '0';
    }

    this.logTimeline('CRITICAL_DETECTED', `Critical drowsiness (${this.data.riskScore}%) detected · Emergency countdown initiated`);
    this.playEmergencySirenPulse(5);

    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;

      if (this.dom.countdownNumber) {
        this.dom.countdownNumber.textContent = String(this.countdownSeconds);
        this.dom.countdownNumber.style.animation = 'none';
        void this.dom.countdownNumber.offsetWidth;
        this.dom.countdownNumber.style.animation = 'sos-num-tick 0.35s ease-out';
      }

      if (this.dom.countdownSecText) {
        this.dom.countdownSecText.textContent = `${this.countdownSeconds} second${this.countdownSeconds === 1 ? '' : 's'}`;
      }

      if (this.dom.countdownCircle) {
        const circumference = 402.12;
        const progress = this.countdownSeconds / 5;
        const offset = circumference * (1 - progress);
        this.dom.countdownCircle.style.strokeDashoffset = offset;
      }

      if (this.countdownSeconds > 0) {
        this.playEmergencySirenPulse(this.countdownSeconds);
      }

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
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Pickup Marker (Lemon Yellow Dot)
      ctx.fillStyle = '#D4A017';
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
    this.showToast(`Calling emergency contact: ${this.data.contact.name}...`, 'info');
    this.logTimeline('CALL_INITIATED', `Direct emergency call initiated to ${this.data.contact.name} (${this.data.contact.phone})`);
  }

  sendEmergencyUpdate() {
    this.showToast(`Status update sent to ${this.data.contact.name} (Simulated SMS) ✓`, 'success');
    this.logTimeline('UPDATE_SENT', `SMS & WhatsApp location update dispatched to ${this.data.contact.name}`);
  }

  shareLiveLocation() {
    const shareUrl = `https://wideeye.safety/live-sos?trip=${this.data.tripId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    // Update button UI
    const shareBtn = document.getElementById('btn-sos-share');
    const shareText = document.getElementById('share-loc-text');
    const shareIcon = document.getElementById('share-loc-icon');

    if (shareBtn) shareBtn.classList.add('shared');
    if (shareText) shareText.textContent = 'Location Shared';
    if (shareIcon) {
      shareIcon.setAttribute('data-lucide', 'check');
      if (window.lucide) window.lucide.createIcons();
    }

    this.showToast('Live location shared ✓', 'success');
    this.logTimeline('LOCATION_SHARED', 'Live emergency tracking URL broadcast to contacts');
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

  // 6. SYNTHESIZED WEB AUDIO EMERGENCY ALARM & REALISTIC SIREN
  playEmergencySirenPulse(secondsRemaining) {
    if (!this.audioEnabled) return;
    this.resumeAudio();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Realistic dual-oscillator emergency warning siren
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Urgency escalates: 5..2 pulse, 1 is sharper higher alert tone
      const baseFreq = secondsRemaining === 1 ? 880 : (640 + (5 - secondsRemaining) * 45);
      const peakFreq = secondsRemaining === 1 ? 1300 : baseFreq + 360;
      const duration = secondsRemaining === 1 ? 0.42 : 0.32;

      // Pitch sweep: Low -> High -> Low (Emergency vehicle siren modulation)
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.linearRampToValueAtTime(peakFreq, now + (duration * 0.45));
      osc1.frequency.linearRampToValueAtTime(baseFreq, now + duration);

      osc2.frequency.setValueAtTime(baseFreq * 0.5, now);
      osc2.frequency.linearRampToValueAtTime(peakFreq * 0.5, now + (duration * 0.45));
      osc2.frequency.linearRampToValueAtTime(baseFreq * 0.5, now + duration);

      // Volume envelope: smooth punchy attack, exponential release
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {
      console.warn('Audio synthesis notice:', e);
    }
  }

  playFinalSosActivatedSiren() {
    if (!this.audioEnabled) return;
    this.resumeAudio();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Stronger 2-stage emergency alert siren
      [0, 0.35].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        const startT = now + offset;
        const dur = 0.32;

        osc.frequency.setValueAtTime(800 + idx * 120, startT);
        osc.frequency.linearRampToValueAtTime(1400 + idx * 120, startT + (dur * 0.5));
        osc.frequency.linearRampToValueAtTime(800 + idx * 120, startT + dur);

        gain.gain.setValueAtTime(0.001, startT);
        gain.gain.linearRampToValueAtTime(0.25, startT + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startT);
        osc.stop(startT + dur);
      });
    } catch (e) {
      console.warn('Audio notice:', e);
    }
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
