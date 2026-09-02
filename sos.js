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
    
    // Single Source of Truth for GPS & Telemetry
    this.currentLocation = {
      lat: 28.4986,
      lng: 77.0878,
      speed: '34 km/h'
    };

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
      coordinates: this.currentLocation,
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
    
    // Initialize Real Leaflet OpenStreetMap Immediately on Page Load
    this.initEmergencyMap();
    this.startLocationHeartbeat();
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
      emergencyMap: document.getElementById('emergency-map'),
      emergencyMapFallback: document.getElementById('emergency-map-fallback'),
      inmapVehicleSpeed: document.getElementById('inmap-vehicle-speed'),
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

    // Invalidate map geometry when active
    if (this.leafletMap) {
      this.leafletMap.invalidateSize();
    } else {
      this.initEmergencyMap();
    }
  }

  // 3. LIVE EMERGENCY LOCATION MAP (LEAFLET + OPENSTREETMAP)
  initEmergencyMap() {
    const mapContainer = document.getElementById('emergency-map');
    const fallbackEl = document.getElementById('emergency-map-fallback');
    
    if (!mapContainer) return;

    if (!window.L) {
      console.warn('Leaflet library (window.L) not detected.');
      if (fallbackEl) fallbackEl.classList.remove('hidden');
      return;
    }

    try {
      if (fallbackEl) fallbackEl.classList.add('hidden');

      // Clean up previous map instance if already mounted
      if (this.leafletMap) {
        this.leafletMap.remove();
        this.leafletMap = null;
      }

      const initialLat = this.currentLocation.lat;
      const initialLng = this.currentLocation.lng;

      // Initialize Leaflet Map centered at Cyber City, Gurugram (zoom 15 for clear streets & roads)
      this.leafletMap = L.map('emergency-map', {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        dragging: true
      });

      // Standard OpenStreetMap Tile Layer
      this.tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 10,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      }).addTo(this.leafletMap);

      this.tileLayer.on('tileerror', (e) => {
        console.warn('Tile load issue:', e);
      });

      // Custom Emergency Vehicle DivIcon with Subtle Pulsing Radar Ring & Car SVG
      const emergencyVehicleIcon = L.divIcon({
        className: 'custom-emergency-icon',
        html: `
          <div class="emergency-marker-wrap">
            <div class="emergency-marker-radar"></div>
            <div class="emergency-marker-core">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      // Destination Marker Icon (City Centre Mall, MG Road)
      const destinationIcon = L.divIcon({
        className: 'custom-dest-icon',
        html: `
          <div class="dest-marker-badge" title="Destination: City Centre Mall">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13]
      });

      // Live Ride Route (DLF Cyber City to MG Road)
      const routeCoordinates = [
        [28.4986, 77.0878],
        [28.4965, 77.0872],
        [28.4935, 77.0858],
        [28.4890, 77.0835],
        [28.4840, 77.0815],
        [28.4800, 77.0800]
      ];

      this.routePolyline = L.polyline(routeCoordinates, {
        color: '#EF4444',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(this.leafletMap);

      // Add Destination Marker
      L.marker([28.4800, 77.0800], { icon: destinationIcon })
        .addTo(this.leafletMap)
        .bindPopup(`
          <div class="map-emergency-popup">
            <strong>Destination</strong>
            <div class="pop-sub" style="color:#D4A017;">City Centre Mall</div>
            <div class="pop-coords">MG Road, Gurugram</div>
          </div>
        `);

      // Add Emergency Vehicle Marker with Dynamic Interactive Popup
      this.vehicleMarker = L.marker([initialLat, initialLng], { icon: emergencyVehicleIcon })
        .addTo(this.leafletMap)
        .bindPopup(`
          <div class="map-emergency-popup">
            <strong>WideEYE Vehicle</strong>
            <div class="pop-sub">Live Emergency Location</div>
            <div class="pop-coords" id="popup-gps-coords">${initialLat.toFixed(4)}° N, ${initialLng.toFixed(4)}° E</div>
            <div class="pop-speed" id="popup-vehicle-speed">Speed: ${this.currentLocation.speed}</div>
          </div>
        `);

      // Open vehicle popup initially
      this.vehicleMarker.openPopup();

      // Ensure geometry calculation across initial render ticks
      [50, 150, 300, 600, 1200].forEach(delay => {
        setTimeout(() => {
          if (this.leafletMap) {
            this.leafletMap.invalidateSize();
          }
        }, delay);
      });

    } catch (err) {
      console.error('Failed to initialize Leaflet emergency map:', err);
      if (fallbackEl) fallbackEl.classList.remove('hidden');
    }
  }

  // Single Source of Truth Location & Telemetry Updater
  updateCurrentLocation(lat, lng, speed) {
    this.currentLocation.lat = lat;
    this.currentLocation.lng = lng;
    if (speed) this.currentLocation.speed = speed;

    this.data.coordinates.lat = lat;
    this.data.coordinates.lng = lng;
    this.data.speed = this.currentLocation.speed;

    // 1. Update Marker Position
    if (this.vehicleMarker) {
      this.vehicleMarker.setLatLng([lat, lng]);
    }

    // 2. Update Interactive Popup Content
    const popupCoords = document.getElementById('popup-gps-coords');
    const popupSpeed = document.getElementById('popup-vehicle-speed');
    if (popupCoords) popupCoords.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    if (popupSpeed) popupSpeed.textContent = `Speed: ${this.currentLocation.speed}`;

    // 3. Update In-Map Live Vehicle Chip
    if (this.dom.inmapVehicleSpeed) {
      this.dom.inmapVehicleSpeed.textContent = this.currentLocation.speed;
    }

    // 4. Update Bottom Floating GPS Card
    if (this.dom.gpsCoordText) {
      this.dom.gpsCoordText.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    }
    if (this.dom.speedText) {
      this.dom.speedText.textContent = this.currentLocation.speed;
    }
    if (this.dom.locationHeartbeatTime) {
      const now = new Date();
      this.dom.locationHeartbeatTime.textContent = `● Location sharing active · Updated ${now.toTimeString().split(' ')[0]}`;
    }
  }

  startLocationHeartbeat() {
    if (this.locationHeartbeatInterval) clearInterval(this.locationHeartbeatInterval);

    let stepIndex = 0;
    const waypoints = [
      { lat: 28.4986, lng: 77.0878, speed: '34 km/h' },
      { lat: 28.4975, lng: 77.0875, speed: '32 km/h' },
      { lat: 28.4960, lng: 77.0870, speed: '30 km/h' },
      { lat: 28.4948, lng: 77.0864, speed: '28 km/h' },
      { lat: 28.4935, lng: 77.0858, speed: '25 km/h' },
      { lat: 28.4945, lng: 77.0862, speed: '29 km/h' },
      { lat: 28.4965, lng: 77.0871, speed: '33 km/h' }
    ];
    
    this.locationHeartbeatInterval = setInterval(() => {
      if (this.state !== 'SOS_ACTIVE') return;

      stepIndex = (stepIndex + 1) % waypoints.length;
      const wp = waypoints[stepIndex];

      // Subtle natural GPS jitter
      const latJitter = (Math.random() - 0.5) * 0.00008;
      const lngJitter = (Math.random() - 0.5) * 0.00008;
      const currentLat = Number((wp.lat + latJitter).toFixed(4));
      const currentLng = Number((wp.lng + lngJitter).toFixed(4));

      this.updateCurrentLocation(currentLat, currentLng, wp.speed);
    }, 3500);
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
