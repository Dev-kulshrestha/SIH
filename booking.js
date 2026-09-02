/**
 * WideEYE — Phase 2 Ride Booking System Script
 * Brand Design: BLACK + LEMON YELLOW (#D4A017) + WHITE (#FFFFFF)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Ride options data config
  const RIDE_DATA = {
    Bike: {
      type: 'Bike',
      price: '₹58',
      priceRange: '₹50–₹70',
      eta: '2 min',
      passengers: '1 passenger',
      speed: 'Fastest',
      driverArrival: '2 min away'
    },
    Auto: {
      type: 'Auto',
      price: '₹96',
      priceRange: '₹80–₹110',
      eta: '3 min',
      passengers: '3 passengers',
      speed: 'Comfort',
      driverArrival: '3 min away'
    },
    Cab: {
      type: 'Cab',
      price: '₹178',
      priceRange: '₹150–₹200',
      eta: '5 min',
      passengers: '4 passengers',
      speed: 'AC Premier',
      driverArrival: '5 min away'
    }
  };

  let selectedRide = 'Auto';
  let activeInputField = null;
  let matchingTimeout = null;
  let driverMoveInterval = null;

  // 1. DOM Elements
  const inputPickup = document.getElementById('input-pickup');
  const inputDest = document.getElementById('input-dest');
  const btnSwap = document.getElementById('btn-swap');
  const btnQuickCurrentLoc = document.getElementById('btn-quick-current-loc');
  const btnUseCurrLoc = document.getElementById('btn-use-curr-loc');
  const locationSuggestions = document.getElementById('location-suggestions');
  const suggestionItems = document.querySelectorAll('.suggestion-item');

  // Summaries
  const summaryFare = document.getElementById('summary-fare');
  const summaryDriverArrival = document.getElementById('summary-driver-arrival');

  // State Containers
  const stateSelectRide = document.getElementById('state-select-ride');
  const stateMatching = document.getElementById('state-matching');
  const stateConfirmed = document.getElementById('state-confirmed');

  // Buttons
  const btnBookRide = document.getElementById('btn-book-ride');
  const btnCancelMatching = document.getElementById('btn-cancel-matching');

  // Matching specs elements
  const matchPickupVal = document.getElementById('match-pickup-val');
  const matchDestVal = document.getElementById('match-dest-val');
  const matchVehVal = document.getElementById('match-veh-val');
  const matchFareVal = document.getElementById('match-fare-val');

  // Confirmed elements
  const confPickup = document.getElementById('conf-pickup');
  const confDest = document.getElementById('conf-dest');
  const confFare = document.getElementById('conf-fare');
  const driverVehType = document.getElementById('driver-veh-type');
  const activeDriverMarker = document.getElementById('active-driver-marker');
  const driverMapTag = document.getElementById('driver-map-tag');
  const confirmedEtaCountdown = document.getElementById('confirmed-eta-countdown');

  // Check if redirected from a cancelled ride
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('cancelled') === '1') {
    setTimeout(() => {
      showBookingToast("Ride cancelled successfully.");
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 400);
  }

  // 2. Location Input & Suggestions Handlers
  function showSuggestions(targetInput) {
    activeInputField = targetInput;
    if (locationSuggestions) {
      locationSuggestions.classList.add('active');
    }
  }

  if (inputPickup) {
    inputPickup.addEventListener('focus', () => showSuggestions(inputPickup));
    inputPickup.addEventListener('click', () => showSuggestions(inputPickup));
  }

  if (inputDest) {
    inputDest.addEventListener('focus', () => showSuggestions(inputDest));
    inputDest.addEventListener('click', () => showSuggestions(inputDest));
  }

  // Suggestion Item Click
  suggestionItems.forEach(item => {
    item.addEventListener('click', () => {
      const address = item.getAttribute('data-address');
      if (activeInputField) {
        activeInputField.value = address;
      } else if (inputDest) {
        inputDest.value = address;
      }
      if (locationSuggestions) {
        locationSuggestions.classList.remove('active');
      }
      // Update destination pin tooltip on map
      const destPinAddr = document.querySelector('.destination-pin .pin-addr');
      if (destPinAddr && address) {
        destPinAddr.textContent = address.split('(')[0].trim();
      }
    });
  });

  // Close suggestions if clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.location-input-card')) {
      if (locationSuggestions) {
        locationSuggestions.classList.remove('active');
      }
    }
  });

  // Swap Locations
  if (btnSwap) {
    btnSwap.addEventListener('click', () => {
      const temp = inputPickup.value;
      inputPickup.value = inputDest.value;
      inputDest.value = temp;

      // Animate swap icon
      btnSwap.style.transform = 'rotate(180deg)';
      setTimeout(() => {
        btnSwap.style.transform = 'rotate(0deg)';
      }, 300);
    });
  }

  // Use Current Location Buttons
  function setCurrentLocation() {
    if (inputPickup) {
      inputPickup.value = 'Current Location';
    }
  }

  if (btnQuickCurrentLoc) btnQuickCurrentLoc.addEventListener('click', setCurrentLocation);
  if (btnUseCurrLoc) btnUseCurrLoc.addEventListener('click', setCurrentLocation);

  // 3. Vehicle / Ride Tier Selection
  window.selectBookingRide = function(rideType) {
    selectedRide = rideType;
    const data = RIDE_DATA[rideType];
    if (!data) return;

    // Update active class on cards
    document.querySelectorAll('.ride-option-card').forEach(card => {
      const cType = card.getAttribute('data-type');
      if (cType === rideType) {
        card.classList.add('active');
        const badge = card.querySelector('.badge-text');
        if (badge) badge.textContent = `${rideType.toUpperCase()} ✓`;
      } else {
        card.classList.remove('active');
        const badge = card.querySelector('.badge-text');
        if (badge) badge.textContent = 'Select';
      }
    });

    // Update Summary Card
    if (summaryFare) summaryFare.textContent = data.price;
    if (summaryDriverArrival) {
      summaryDriverArrival.innerHTML = `<span class="pulse-indicator-yellow"></span> Driver arrival: <strong>${data.driverArrival}</strong>`;
    }
  };

  // 4. Booking Action & Driver Matching Simulation
  if (btnBookRide) {
    btnBookRide.addEventListener('click', () => {
      startDriverMatching();
    });
  }

  function startDriverMatching() {
    const pickupVal = inputPickup ? inputPickup.value : 'Current Location';
    const destVal = inputDest ? inputDest.value : 'City Centre';
    const data = RIDE_DATA[selectedRide];

    // Populate matching screen data
    if (matchPickupVal) matchPickupVal.textContent = pickupVal;
    if (matchDestVal) matchDestVal.textContent = destVal;
    if (matchVehVal) matchVehVal.textContent = selectedRide;
    if (matchFareVal) matchFareVal.textContent = data.price;

    // Switch view states
    if (stateSelectRide) stateSelectRide.classList.add('hidden');
    if (stateConfirmed) stateConfirmed.classList.add('hidden');
    if (stateMatching) stateMatching.classList.remove('hidden');

    // Scroll sidebar to top for smooth viewing
    const sidebar = document.getElementById('booking-sidebar');
    if (sidebar) sidebar.scrollTop = 0;

    // 2.5s Simulation Timer -> Driver Found & Confirmed
    matchingTimeout = setTimeout(() => {
      driverMatched(pickupVal, destVal, data);
    }, 2500);
  }

  function resetToSelectionState() {
    if (stateMatching) stateMatching.classList.add('hidden');
    if (stateConfirmed) stateConfirmed.classList.add('hidden');
    if (stateSelectRide) stateSelectRide.classList.remove('hidden');

    if (activeDriverMarker) {
      activeDriverMarker.classList.remove('assigned-active');
      activeDriverMarker.style.top = '48%';
      activeDriverMarker.style.left = '34%';
    }
    if (driverMoveInterval) clearInterval(driverMoveInterval);
  }

  // 5. Driver Matched & Confirmed State
  function driverMatched(pickup, dest, rideData) {
    if (stateMatching) stateMatching.classList.add('hidden');
    if (stateSelectRide) stateSelectRide.classList.add('hidden');
    if (stateConfirmed) stateConfirmed.classList.remove('hidden');

    // Re-initialize icons in newly revealed container
    if (window.lucide) window.lucide.createIcons();

    // Populate confirmation card
    if (confPickup) confPickup.textContent = pickup;
    if (confDest) confDest.textContent = dest;
    if (confFare) confFare.textContent = rideData.price;
    if (driverVehType) driverVehType.textContent = selectedRide;

    // Animate Driver Marker on Map towards Pickup Point
    if (activeDriverMarker) {
      activeDriverMarker.classList.add('assigned-active');
      if (driverMapTag) {
        driverMapTag.textContent = `Rahul is arriving · 3 min`;
      }
      simulateDriverMovement();
    }

    const sidebar = document.getElementById('booking-sidebar');
    if (sidebar) sidebar.scrollTop = 0;
  }

  // Simulate smooth driver marker moving toward pickup
  function simulateDriverMovement() {
    let progress = 0;
    const startX = 34; // %
    const startY = 48; // %
    const targetX = 25; // %
    const targetY = 57; // %

    if (driverMoveInterval) clearInterval(driverMoveInterval);

    driverMoveInterval = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        progress = 1;
        clearInterval(driverMoveInterval);
        if (confirmedEtaCountdown) confirmedEtaCountdown.textContent = '1 min (Approaching)';
        if (driverMapTag) driverMapTag.textContent = 'Rahul has arrived at Pickup';
      } else {
        const curX = startX + (targetX - startX) * progress;
        const curY = startY + (targetY - startY) * progress;
        if (activeDriverMarker) {
          activeDriverMarker.style.left = `${curX}%`;
          activeDriverMarker.style.top = `${curY}%`;
        }
        if (progress > 0.5 && confirmedEtaCountdown) {
          confirmedEtaCountdown.textContent = '2 min';
        }
      }
    }, 300);
  }

  // Toast Notification Helper
  function showBookingToast(message) {
    const toast = document.getElementById('booking-toast');
    const toastText = document.getElementById('booking-toast-text');
    if (!toast) return;

    if (toastText && message) toastText.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  // Cancel Matching (Searching State)
  window.cancelSearchingForDriver = function() {
    if (matchingTimeout) clearTimeout(matchingTimeout);
    resetToSelectionState();
    showBookingToast("Search cancelled.");
  };

  if (btnCancelMatching) {
    btnCancelMatching.addEventListener('click', () => {
      window.cancelSearchingForDriver();
    });
  }

  // Cancel Ride Modal Handlers (Matched / Confirmed State)
  window.promptCancelRide = function() {
    const modal = document.getElementById('cancel-ride-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.closeCancelRideModal = function() {
    const modal = document.getElementById('cancel-ride-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  window.confirmCancelRide = function() {
    window.closeCancelRideModal();
    if (matchingTimeout) clearTimeout(matchingTimeout);
    resetToSelectionState();
    showBookingToast("Ride cancelled successfully.");
  };

  window.cancelBookedRide = function() {
    window.promptCancelRide();
  };

  window.simulateLiveRideView = function() {
    alert('WideEYE Live Trip Mode:\n• Driver: Rahul Kumar (UP32 AB 1234)\n• Vehicle: Auto\n• WideEYE Safety Camera: Connected & Real-time Monitoring Active\n• Driver Status: SAFE (18% fatigue risk index)\n• Emergency Assistance: Ready');
  };

  // 6. Map Zoom / Controls Simulation
  window.simulateMapZoom = function(delta) {
    const mapCanvas = document.getElementById('map-canvas');
    if (!mapCanvas) return;
    let currentScale = parseFloat(mapCanvas.getAttribute('data-scale') || '1');
    currentScale = Math.max(0.85, Math.min(1.35, currentScale + delta * 0.1));
    mapCanvas.setAttribute('data-scale', currentScale);
    mapCanvas.style.transform = `scale(${currentScale})`;
  };

  window.recenterMap = function() {
    const mapCanvas = document.getElementById('map-canvas');
    if (mapCanvas) {
      mapCanvas.setAttribute('data-scale', '1');
      mapCanvas.style.transform = 'scale(1)';
    }
  };

});
