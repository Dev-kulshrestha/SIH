/**
 * WideEYE — Phase 8 Post-Ride Dashboard & Safety History System
 * Brand: BLACK (#050505, #0B0B0B) + LEMON YELLOW (#D4A017) + WHITE (#FFFFFF)
 */

class WideEyeSafetyDashboard {
  constructor() {
    this.tripData = this.loadTripData();
    this.pastTrips = this.loadPastTrips();
    this.currentFilter = 'all';

    this.init();
  }

  // 1. DATA INTEGRATION & DEFAULT DEMO SESSION
  loadTripData() {
    // Try reading active trip from localStorage (shared across Phase 2, 3, 4, 5, 6)
    const stored = localStorage.getItem('wideeye_current_trip');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Could not parse stored trip data:', e);
      }
    }

    // Standard high-fidelity demonstration trip data
    return {
      tripId: "WE-24081",
      dateStr: "Today, 11:06 AM",
      pickup: "Current Location (Cyber City)",
      destination: "City Centre Mall (Sector 29)",
      distanceKm: 8.4,
      durationMin: 24,
      fare: "96.00",
      rideType: "Auto",
      paymentMethod: "Cash / UPI",
      overallStatus: "SAFE",
      maxRisk: 46,
      averageRisk: 24,
      minRisk: 8,
      warningsCount: 2,
      audioAlertsCount: 1,
      visualWarningsCount: 2,
      highRiskCount: 0,
      criticalCount: 0,
      sosEventsCount: 0,
      driver: {
        name: "Rahul Kumar",
        rating: 4.8,
        vehicle: "Auto",
        vehicleNumber: "UP32 AB 1234",
        monitoringDuration: "24 min"
      },
      passenger: {
        name: "Dev Kumar",
        driverVerified: true,
        tripMonitored: true,
        safetyActive: true,
        emergencyContactsCount: 2,
        liveSharingEnabled: true,
        sosAvailable: true
      },
      riskHistory: [
        { minute: 0, time: "10:42", risk: 12, label: "Baseline calibrated (EAR 0.32)" },
        { minute: 5, time: "10:47", risk: 18, label: "Attentive driving on Cyber City Blvd" },
        { minute: 10, time: "10:52", risk: 26, label: "Normal blinks, slight gaze variance" },
        { minute: 15, time: "10:57", risk: 42, label: "Warning 1: Eye closure 1.4s (EAR 0.19)" },
        { minute: 20, time: "11:02", risk: 46, label: "Warning 2: Yawn & MAR spike 0.68" },
        { minute: 24, time: "11:06", risk: 31, label: "Safe arrival at Sector 29 gate" }
      ],
      eventTimeline: [
        { time: "10:42", title: "Trip started", desc: "DLF Cyber City", risk: 12, type: "safe" },
        { time: "10:43", title: "Driver verified", desc: "Rahul Kumar", risk: 14, type: "safe" },
        { time: "10:45", title: "WideEYE monitoring activated", desc: "Driver safety monitoring started", risk: 16, type: "safe" },
        { time: "10:51", title: "Normal driving detected", desc: "Driver remained attentive", risk: 18, type: "safe" },
        { time: "10:55", title: "Warning triggered", desc: "Drowsiness risk increased", risk: 42, type: "warning" },
        { time: "10:56", title: "Risk stabilized", desc: "Trip progressing normally", risk: 24, type: "safe" }
      ]
    };
  }

  loadPastTrips() {
    return [
      {
        id: "WE-24081",
        date: "Today, 10:42 AM",
        destination: "City Centre",
        pickup: "Cyber City",
        rideType: "Auto",
        distance: "8.4 km",
        duration: "24 min",
        maxRisk: 46,
        warnings: 2,
        critical: 0,
        safetyStatus: "SAFE",
        safetyScore: 92,
        isCurrent: true
      },
      {
        id: "WE-23910",
        date: "Yesterday, 6:15 PM",
        destination: "IGI Airport Terminal 3",
        pickup: "Golf Course Road",
        rideType: "Cab",
        distance: "14.2 km",
        duration: "36 min",
        maxRisk: 28,
        warnings: 0,
        critical: 0,
        safetyStatus: "SAFE",
        safetyScore: 98,
        isCurrent: false
      },
      {
        id: "WE-23841",
        date: "28 Aug, 9:20 AM",
        destination: "DLF Phase 1 Metro",
        pickup: "Sector 56 Market",
        rideType: "Bike",
        distance: "5.1 km",
        duration: "14 min",
        maxRisk: 22,
        warnings: 0,
        critical: 0,
        safetyStatus: "SAFE",
        safetyScore: 100,
        isCurrent: false
      },
      {
        id: "WE-23712",
        date: "25 Aug, 11:45 PM",
        destination: "Sohna Road Tech Park",
        pickup: "Cyber Hub Gate 1",
        rideType: "Cab",
        distance: "16.8 km",
        duration: "42 min",
        maxRisk: 54,
        warnings: 3,
        critical: 0,
        safetyStatus: "WARNING",
        safetyScore: 84,
        isCurrent: false
      }
    ];
  }

  init() {
    this.calculateSafetyScore();
    this.renderMetrics();
    this.renderOverallSafetyCard();
    this.renderRiskChart();
    this.renderEventTimeline();
    this.renderAlertSummary();
    this.renderCriticalSection();
    this.renderDriverAndPassengerCards();
    this.renderTripDetails();
    this.renderSafetyHighlights();
    this.renderRideHistory();
    this.setupEventListeners();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 2. DYNAMIC SAFETY SCORE CALCULATION
  calculateSafetyScore() {
    // Prototype score algorithm: Base 100 minus weighted deductions
    const wDeduct = (this.tripData.warningsCount || 0) * 4;
    const hDeduct = (this.tripData.highRiskCount || 0) * 10;
    const cDeduct = (this.tripData.criticalCount || 0) * 25;
    
    let score = 100 - wDeduct - hDeduct - cDeduct;
    if (score < 20) score = 20;
    if (score > 100) score = 100;
    
    this.safetyScore = score;
    this.tripData.safetyScore = score;
  }

  // 3. RENDER METRICS & HERO
  renderMetrics() {
    // Distance
    const elDist = document.getElementById('stat-val-dist');
    if (elDist) elDist.innerHTML = `${this.tripData.distanceKm} <span class="unit">km</span>`;

    // Duration
    const elDur = document.getElementById('stat-val-dur');
    if (elDur) elDur.innerHTML = `${this.tripData.durationMin} <span class="unit">min</span>`;

    // Max Risk
    const elMax = document.getElementById('stat-val-maxrisk');
    if (elMax) elMax.innerHTML = `${this.tripData.maxRisk}<span class="unit">%</span>`;

    // Warnings
    const elWarn = document.getElementById('stat-val-warn');
    if (elWarn) elWarn.textContent = this.tripData.warningsCount;

    // High Risk
    const elHigh = document.getElementById('stat-val-high');
    if (elHigh) elHigh.textContent = this.tripData.highRiskCount;

    // Critical
    const elCrit = document.getElementById('stat-val-crit');
    if (elCrit) elCrit.textContent = this.tripData.criticalCount;

    // Radial Progress Indicator for Safety Score
    const scoreValEl = document.getElementById('safety-score-number');
    if (scoreValEl) scoreValEl.textContent = `${this.safetyScore}`;

    const circleProgress = document.getElementById('score-circle-fill');
    if (circleProgress) {
      // 2 * PI * r = 2 * PI * 48 ≈ 301.59
      const circumference = 301.59;
      circleProgress.style.strokeDasharray = circumference;
      const offset = circumference - (this.safetyScore / 100) * circumference;
      circleProgress.style.strokeDashoffset = offset;
    }
  }

  // 4. OVERALL SAFETY CARD (DYNAMIC NARRATIVE)
  renderOverallSafetyCard() {
    const narrativeEl = document.getElementById('overall-safety-narrative');
    
    let narrative = "No critical safety events were recorded during this trip. Driver attentiveness remained consistently high.";

    if (this.tripData.criticalCount > 0) {
      narrative = "WideEYE detected critical fatigue risks requiring active emergency mitigation.";
    } else if (this.tripData.highRiskCount > 0 || this.tripData.maxRisk > 60) {
      narrative = "Driver experienced elevated fatigue intervals. High-risk prompts were triggered.";
    } else if (this.tripData.warningsCount > 0) {
      narrative = `No critical safety events were recorded during this trip. ${this.tripData.warningsCount} minor fatigue alerts were triggered and resolved within 1.8 seconds.`;
    }

    if (narrativeEl) narrativeEl.textContent = narrative;

    // Drowsiness Summary Details
    const maxR = document.getElementById('drowsy-max-val');
    if (maxR) maxR.textContent = `${this.tripData.maxRisk}%`;
    const avgR = document.getElementById('drowsy-avg-val');
    if (avgR) avgR.textContent = `${this.tripData.averageRisk}%`;
    const dMaxRisk = document.getElementById('driver-max-risk');
    if (dMaxRisk) dMaxRisk.textContent = `${this.tripData.maxRisk}%`;
  }

  // 5. INTERACTIVE RISK TREND GRAPH & TOOLTIPS
  renderRiskChart() {
    const points = this.tripData.riskHistory;
    if (!points || points.length === 0) return;

    const svg = document.getElementById('risk-trend-svg');
    if (!svg) return;

    const tooltip = document.getElementById('chart-tooltip');

    const startX = 60;
    const endX = 640;
    const chartHeight = 155;
    const topY = 30;
    const bottomY = topY + chartHeight;

    const maxTime = 24; // minutes
    const maxRiskVal = 100; // percent

    let pathD = '';
    let areaD = '';

    const coords = points.map((pt, idx) => {
      const x = startX + (pt.minute / maxTime) * (endX - startX);
      const y = bottomY - (pt.risk / maxRiskVal) * chartHeight;
      return { x, y, ...pt };
    });

    // Build smooth curve path
    coords.forEach((c, idx) => {
      if (idx === 0) {
        pathD += `M ${c.x} ${c.y}`;
        areaD += `M ${c.x} ${bottomY} L ${c.x} ${c.y}`;
      } else {
        const prev = coords[idx - 1];
        const cpX1 = prev.x + (c.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (c.x - prev.x) / 2;
        const cpY2 = c.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
        areaD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
      }
    });

    const lastCoord = coords[coords.length - 1];
    areaD += ` L ${lastCoord.x} ${bottomY} Z`;

    const areaEl = document.getElementById('risk-chart-area');
    if (areaEl) areaEl.setAttribute('d', areaD);

    const strokeEl = document.getElementById('risk-chart-line');
    if (strokeEl) strokeEl.setAttribute('d', pathD);

    // Create interactive hover dots
    const dotsGroup = document.getElementById('risk-chart-dots');
    if (dotsGroup) {
      dotsGroup.innerHTML = '';
      coords.forEach((c) => {
        const isWarn = c.risk > 35;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', c.x);
        circle.setAttribute('cy', c.y);
        circle.setAttribute('r', isWarn ? '6' : '5');
        circle.setAttribute('fill', isWarn ? '#EF4444' : '#D4A017');
        circle.setAttribute('stroke', '#050505');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        circle.style.transition = 'transform 0.15s ease, r 0.15s ease';

        circle.addEventListener('mouseenter', (e) => {
          circle.setAttribute('r', '8');
          if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${c.x - 35}px`;
            tooltip.style.top = `${c.y - 45}px`;
            tooltip.innerHTML = `<strong>${c.minute} min (${c.time})</strong><br>Risk: <span style="font-weight:800;color:${isWarn ? '#EF4444' : '#050505'}">${c.risk}%</span>`;
          }
        });

        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('r', isWarn ? '6' : '5');
          if (tooltip) tooltip.style.display = 'none';
        });

        dotsGroup.appendChild(circle);
      });
    }
  }

  // 6. EVENT TIMELINE
  renderEventTimeline() {
    const listEl = document.getElementById('safety-event-timeline-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    const events = this.tripData.eventTimeline || [];
    events.forEach((ev, idx) => {
      const isLast = idx === events.length - 1;
      const isWarn = ev.type === 'warning';
      const isCrit = ev.type === 'critical';

      const dotClass = isCrit ? 'critical' : (isWarn ? 'warning' : 'safe');

      const item = document.createElement('div');
      item.className = `vt-event-item ${isLast ? 'last' : ''}`;
      item.innerHTML = `
        <div class="vt-time-col">${ev.time}</div>
        <div class="vt-track-col">
          <span class="vt-dot ${dotClass}"></span>
          ${!isLast ? '<span class="vt-line"></span>' : ''}
        </div>
        <div class="vt-info-col">
          <h4 class="vt-title">${ev.title}</h4>
          <p class="vt-desc">${ev.desc}</p>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // 7. ALERT & WARNING SUMMARY
  renderAlertSummary() {
    const visEl = document.getElementById('val-vis-warnings');
    if (visEl) visEl.textContent = this.tripData.visualWarningsCount;

    const audEl = document.getElementById('val-aud-alerts');
    if (audEl) audEl.textContent = this.tripData.audioAlertsCount;

    const highEl = document.getElementById('val-high-alerts');
    if (highEl) highEl.textContent = this.tripData.highRiskCount;

    const critEl = document.getElementById('val-crit-alerts');
    if (critEl) critEl.textContent = this.tripData.criticalCount;

    const sosEl = document.getElementById('val-sos-events');
    if (sosEl) sosEl.textContent = this.tripData.sosEventsCount;
  }

  // 8. CRITICAL SECTION & SOS SECTION
  renderCriticalSection() {
    const critContainer = document.getElementById('critical-events-card');
    if (!critContainer) return;

    if (this.tripData.criticalCount === 0) {
      critContainer.innerHTML = `
        <div class="calm-safe-card-inner">
          <div class="calm-icon-box"><i data-lucide="shield-check"></i></div>
          <div class="calm-info">
            <h3>✓ No Critical Events</h3>
            <p>WideEYE did not detect a critical safety event during this trip. All risk indicators remained below the critical threshold.</p>
          </div>
        </div>
      `;
    } else {
      critContainer.innerHTML = `
        <div class="critical-alarm-card-inner">
          <div class="crit-icon-box"><i data-lucide="alert-octagon"></i></div>
          <div class="crit-info">
            <h3 style="color:#EF4444;">🚨 Critical Events Detected</h3>
            <p>A high-severity driver safety event was detected during this trip and escalated to Emergency Triage.</p>
          </div>
        </div>
      `;
    }
  }

  // 9. DRIVER & PASSENGER SAFETY CARDS
  renderDriverAndPassengerCards() {
    const dr = this.tripData.driver;
    const ps = this.tripData.passenger;

    // Driver card
    const dName = document.getElementById('driver-name-text');
    if (dName) dName.textContent = dr.name;
    const dStar = document.getElementById('driver-star-text');
    if (dStar) dStar.textContent = `★ ${dr.rating}`;
    const dVeh = document.getElementById('driver-veh-text');
    if (dVeh) dVeh.textContent = `${dr.vehicle} · ${dr.vehicleNumber}`;
    const dDur = document.getElementById('driver-mon-dur');
    if (dDur) dDur.textContent = dr.monitoringDuration;
    const dMax = document.getElementById('driver-max-risk');
    if (dMax) dMax.textContent = `${this.tripData.maxRisk}%`;

    // Passenger card
    const pContacts = document.getElementById('pass-contacts-count');
    if (pContacts) pContacts.textContent = `${ps.emergencyContactsCount} contacts (Priya Sharma, Arjun Mehta)`;
  }

  // 10. COLLAPSIBLE TRIP DETAILS
  renderTripDetails() {
    const t = this.tripData;
    const fields = {
      'td-trip-id': t.tripId,
      'td-pickup': t.pickup,
      'td-dest': t.destination,
      'td-dist': `${t.distanceKm} km`,
      'td-dur': `${t.durationMin} min`,
      'td-fare': `₹${t.fare}`,
      'td-type': t.rideType,
      'td-driver': t.driver.name,
      'td-veh': t.driver.vehicleNumber,
      'td-payment': t.paymentMethod
    };

    for (const [id, val] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  // 11. SAFETY HIGHLIGHTS
  renderSafetyHighlights() {
    const container = document.getElementById('safety-highlights-list');
    if (!container) return;

    const highlights = [
      { text: "Driver identity & background verified", icon: "check" },
      { text: "WideEYE optical monitoring active throughout trip", icon: "check" },
      { text: "Zero critical safety events recorded", icon: "check" },
      { text: "24/7 Emergency response & triage available", icon: "check" },
      { text: "Trip completed and safe arrival confirmed", icon: "check" }
    ];

    container.innerHTML = highlights.map(h => `
      <div class="highlight-chip">
        <span class="chk-lemon-circle"><i data-lucide="${h.icon}"></i></span>
        <span>${h.text}</span>
      </div>
    `).join('');
  }

  // 12. RIDE HISTORY & FILTERING
  renderRideHistory() {
    const listEl = document.getElementById('ride-history-cards-container');
    if (!listEl) return;

    listEl.innerHTML = '';

    let filtered = this.pastTrips;
    if (this.currentFilter === 'safe') {
      filtered = this.pastTrips.filter(t => t.safetyStatus === 'SAFE' && t.warnings === 0);
    } else if (this.currentFilter === 'warnings') {
      filtered = this.pastTrips.filter(t => t.warnings > 0);
    } else if (this.currentFilter === 'critical') {
      filtered = this.pastTrips.filter(t => t.critical > 0);
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-history-box">
          <i data-lucide="inbox"></i>
          <h4>No completed trips match this filter</h4>
          <p>Your WideEYE safety reports will appear here as you take rides.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    filtered.forEach(trip => {
      const card = document.createElement('div');
      card.className = `ride-history-item-card ${trip.isCurrent ? 'current-active-card' : ''}`;
      
      const isWarn = trip.warnings > 0;
      const statusPillClass = trip.safetyStatus === 'SAFE' ? 'safe' : 'warning';

      card.innerHTML = `
        <div class="rh-head-row">
          <div class="rh-dest-box">
            <div class="rh-dest-title">${trip.destination}</div>
            <div class="rh-meta">${trip.rideType} · ${trip.distance} · ${trip.duration}</div>
          </div>
          <span class="rh-status-pill ${statusPillClass}">${trip.safetyStatus === 'SAFE' ? '✓ SAFE' : '⚠ WARNING'}</span>
        </div>

        <div class="rh-metrics-row">
          <div class="rh-met"><span>Max Risk:</span> <strong>${trip.maxRisk}%</strong></div>
          <div class="rh-met"><span>Alerts:</span> <strong>${trip.warnings} warn, ${trip.critical} crit</strong></div>
          <div class="rh-met"><span>Safety Score:</span> <strong class="lemon">${trip.safetyScore}/100</strong></div>
        </div>

        <div class="rh-foot-row">
          <span class="rh-date">${trip.date}</span>
          <button class="btn btn-secondary btn-sm" onclick="window.safetyDashboard.openPastTripDetail('${trip.id}')">
            <span>View Full Report</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </div>
      `;
      listEl.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  setHistoryFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.btn-filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderRideHistory();
  }

  openPastTripDetail(tripId) {
    this.showToast(`Loading Report ${tripId}`, "Opening trip safety telemetry details.");
  }

  // 13. SHARE SAFETY SUMMARY MODAL
  openShareModal() {
    const modal = document.getElementById('share-summary-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  closeShareModal() {
    const modal = document.getElementById('share-summary-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  copyShareLink() {
    const input = document.getElementById('share-summary-link-input');
    if (input) {
      input.select();
      document.execCommand('copy');
      this.showToast("Link Copied ✓", "Safety summary link copied to clipboard.");
    }
  }

  executeShare() {
    this.closeShareModal();
    this.showToast("Safety summary shared ✓", "Trip safety summary sent via WhatsApp/SMS.");
  }

  // 14. TOAST NOTIFICATION
  showToast(title, msg) {
    const toast = document.getElementById('dash-toast');
    if (!toast) return;

    const tTitle = toast.querySelector('.toast-title');
    const tMsg = toast.querySelector('.toast-msg');
    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = msg;

    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  setupEventListeners() {
    // Collapsible Trip Details toggle
    const toggleBtn = document.getElementById('trip-details-toggle-btn');
    const body = document.getElementById('collapsible-trip-details-body');
    const chevron = document.getElementById('td-chevron');
    if (toggleBtn && body) {
      toggleBtn.addEventListener('click', () => {
        body.classList.toggle('collapsed');
        if (chevron) chevron.classList.toggle('rotate-180');
      });
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.safetyDashboard = new WideEyeSafetyDashboard();
});
