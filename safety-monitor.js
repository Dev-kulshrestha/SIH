/**
 * WideEYE — Phase 4 & Phase 5: Real-Time AI Driver Safety Monitor
 * & Smart Alert & Response System 🚨
 * Brand: BLACK + LEMON YELLOW (#D4A017) + WHITE (#FFFFFF)
 */

// ALERT CONFIGURATION CONSTANTS (Centralized & Configurable)
const ALERT_CONFIG = {
  WARNING_THRESHOLD: 31,
  HIGH_RISK_THRESHOLD: 61,
  CRITICAL_THRESHOLD: 91,

  WARNING_PERSISTENCE_MS: 1200,   // Must remain > 30% for 1.2s before warning
  HIGH_RISK_PERSISTENCE_MS: 1800, // Must remain > 60% for 1.8s before high-risk
  CRITICAL_PERSISTENCE_MS: 2000,  // Must remain > 90% for 2.0s before critical

  AUDIO_COOLDOWN_MS: 6000,        // 6s cooldown between repeated sounds at same level
  SMOOTHING_ALPHA: 0.08           // EMA smoothing factor (0.08 for natural transitions)
};

class WideEyeSafetyMonitor {
  constructor(config = {}) {
    this.videoElement = document.getElementById(config.videoId || 'driver-webcam');
    this.canvasElement = document.getElementById(config.canvasId || 'face-canvas');
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;

    // Real-Time Risk Graph Canvas
    this.graphCanvas = document.getElementById('realtime-risk-graph');
    this.graphCtx = this.graphCanvas ? this.graphCanvas.getContext('2d') : null;

    // Operational Modes: 'idle' | 'calibrating' | 'monitoring' | 'paused' | 'simulation'
    this.mode = 'idle';
    this.isSimulation = false;
    this.audioEnabled = true;

    // 1. Adaptive Calibration & Baselines (Target: 75 valid consecutive face frames ~5 seconds)
    this.TARGET_CALIBRATION_FRAMES = 75;
    this.calibrationSamples = [];
    this.calibrationMissedFrames = 0;
    this.lastFaceDetectedTime = null;

    // Calibrated Personalized Baselines (Default fallbacks before calibration)
    this.baselineEAR = 0.290;
    this.baselineLeftEAR = 0.290;
    this.baselineRightEAR = 0.290;
    this.baselineMAR = 0.180;
    this.baselinePitch = 0.48; // Vertical ratio of nose-to-forehead vs chin-to-forehead
    this.baselineYaw = 0;
    this.baselineRoll = 0;
    this.isCalibrated = false;

    // 2. Real-Time Biometric Measurements
    this.metrics = {
      leftEAR: 0.29,
      rightEAR: 0.29,
      avgEAR: 0.29,
      mar: 0.18,
      blinkCount: 0,
      blinkRate: 14, // Blinks per minute (rolling window)
      yawnCount: 0,
      headPose: 'STABLE', // 'STABLE' | 'HEAD DOWN (NODDING)' | 'LOOKING LEFT' | 'LOOKING RIGHT' | 'HEAD TILT'
      confidence: 0,
      faceStatus: 'WAITING FOR FACE...',
      eyesStatus: '--',
      mouthStatus: '--',
      eyeClosureDuration: 0, // seconds eyes currently closed
      maxClosureDuration: 0,
      rawRiskScore: 15,
      smoothedRiskScore: 15,
      driverStatus: 'DRIVER ATTENTIVE',
      riskLevel: 'SAFE' // 'SAFE' (0-30%) | 'WARNING' (31-60%) | 'HIGH RISK' (61-90%) | 'CRITICAL' (91-100%)
    };

    // 3. Temporal State, Rolling Windows & History
    this.lastFrameTime = performance.now();
    this.eyeClosedStartTime = null;
    this.yawnStartTime = null;
    this.isBlinking = false;
    this.isYawning = false;
    this.blinkTimestamps = []; // Timestamps of blinks in last 60s
    this.sessionStartTime = null;
    this.sessionInterval = null;

    // Rolling 30s Risk History for Graph: [ { time: Date.now(), score: 15, event: null } ]
    this.riskHistory = [];
    this.graphRenderInterval = null;

    // MediaPipe / Camera Streams
    this.stream = null;
    this.animationFrameId = null;
    this.faceMesh = null;
    this.isProcessingFrame = false;

    // Phase 5 Smart Alert Manager Instance
    this.alertManager = new AlertManager(this);

    // Bind UI elements
    this.bindDomElements();
    this.initRiskGraph();
  }

  // 1. DOM REFERENCES BINDING
  bindDomElements() {
    this.dom = {
      // Permission & Camera Overlays
      permissionOverlay: document.getElementById('camera-permission-overlay'),
      permMainHeading: document.getElementById('perm-main-heading'),
      permMainDesc: document.getElementById('perm-main-desc'),
      permIconBox: document.getElementById('perm-icon-box'),
      permActionsRow: document.getElementById('perm-actions-row'),

      // Calibration Overlay & Face Lost Modal
      calibrationOverlay: document.getElementById('calibration-overlay'),
      calibProgressFill: document.getElementById('calib-progress-fill'),
      calibCountdown: document.getElementById('calib-countdown-text'),
      calibSamplesText: document.getElementById('calib-samples-text'),
      faceNotDetectedModal: document.getElementById('face-not-detected-modal'),
      calibSpinner: document.getElementById('calib-spinner'),

      // Video HUD & Monitor View
      activeMonitorView: document.getElementById('active-monitor-view'),
      simModeBadge: document.getElementById('sim-mode-badge'),
      hudLiveBadge: document.getElementById('hud-live-badge'),
      hudLiveText: document.getElementById('hud-live-tag-text'),
      cameraAlertBadge: document.getElementById('camera-alert-badge'),

      // Metrics Displays
      riskScoreVal: document.getElementById('risk-score-value'),
      riskLevelVal: document.getElementById('risk-level-value'),
      riskDescText: document.getElementById('risk-desc-text'),
      riskMeterCircle: document.getElementById('risk-meter-circle'),
      driverStatusPill: document.getElementById('driver-status-pill'),
      driverStatusText: document.getElementById('driver-status-text'),

      // Detailed Telemetry Values
      valAvgEAR: document.getElementById('metric-avg-ear'),
      valLeftEAR: document.getElementById('metric-left-ear'),
      valRightEAR: document.getElementById('metric-right-ear'),
      valBaseEAR: document.getElementById('metric-base-ear'),
      valBlinkRate: document.getElementById('metric-blink-rate'),
      valBlinks: document.getElementById('metric-blinks'),
      valMAR: document.getElementById('metric-mar'),
      valBaseMAR: document.getElementById('metric-base-mar'),
      valYawns: document.getElementById('metric-yawns'),
      valHeadPose: document.getElementById('metric-head-pose'),
      valConfidence: document.getElementById('metric-confidence'),
      valFaceStatus: document.getElementById('metric-face-status'),
      valEyesStatus: document.getElementById('metric-eyes-status'),
      valMouthStatus: document.getElementById('metric-mouth-status'),
      valClosureDuration: document.getElementById('metric-closure-sec'),

      // Graph Badge
      graphDataBadge: document.getElementById('graph-data-badge'),

      // Status Bar & Controls
      sessionTimer: document.getElementById('session-timer-text'),
      statusDot: document.getElementById('top-status-dot'),
      statusText: document.getElementById('top-status-text'),
      soundToggleBtn: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      soundLabel: document.getElementById('sound-label')
    };

    this.updateMonitoringControlButtons();
  }

  toggleSound() {
    this.audioEnabled = !this.audioEnabled;
    this.alertManager.audioEnabled = this.audioEnabled;
    if (this.dom.soundLabel) {
      this.dom.soundLabel.textContent = this.audioEnabled ? 'Sound On' : 'Sound Off';
    }
    if (this.dom.soundIcon) {
      this.dom.soundIcon.setAttribute('data-lucide', this.audioEnabled ? 'volume-2' : 'volume-x');
      if (window.lucide) window.lucide.createIcons();
    }
    this.alertManager.logAlertEvent('AUDIO_TOGGLE', Math.round(this.metrics.smoothedRiskScore), this.audioEnabled ? 'Audio alerts enabled' : 'Audio alerts muted');
  }

  // 2. CAMERA ACCESS & LIFECYCLE
  async startLiveCamera() {
    this.isSimulation = false;
    if (this.dom.simModeBadge) this.dom.simModeBadge.classList.add('hidden');
    if (this.dom.hudLiveText) this.dom.hudLiveText.textContent = '● AI MONITORING ACTIVE';
    if (this.dom.graphDataBadge) {
      this.dom.graphDataBadge.textContent = 'LIVE TELEMETRY';
      this.dom.graphDataBadge.style.color = '#10B981';
      this.dom.graphDataBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    // Set Loading State
    if (this.dom.permMainHeading) this.dom.permMainHeading.textContent = 'Starting camera...';
    if (this.dom.permMainDesc) this.dom.permMainDesc.textContent = 'Requesting camera stream and initializing MediaPipe Face Landmarker...';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera access via getUserMedia.');
      }

      this.alertManager.logAlertEvent('INFO', 0, 'Requesting camera stream...');
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      this.alertManager.logAlertEvent('INFO', 0, 'Camera active · MediaPipe Face Landmarker running locally');
      if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.add('hidden');
      if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.remove('hidden');

      // Initialize MediaPipe FaceMesh & Start Calibration
      this.initMediaPipe();
      this.startCalibration();

      this.updateMonitoringControlButtons();
    } catch (err) {
      console.warn('Camera access unavailable or denied:', err);
      this.alertManager.logAlertEvent('WARNING', 0, 'Camera error: ' + err.message);
      this.renderCameraErrorState(err.message);
    }
  }

  renderCameraErrorState(errMsg) {
    if (this.dom.permMainHeading) this.dom.permMainHeading.textContent = 'Camera access required';
    if (this.dom.permMainDesc) {
      this.dom.permMainDesc.textContent = 'WideEYE was unable to connect to your webcam. Please allow camera permissions in your browser or launch Simulation Mode.';
    }
    if (this.dom.permIconBox) {
      this.dom.permIconBox.style.background = '#EF4444';
      this.dom.permIconBox.innerHTML = '<i data-lucide="video-off"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
    if (this.dom.permActionsRow) {
      this.dom.permActionsRow.innerHTML = `
        <button class="btn btn-primary btn-lg" onclick="window.safetyMonitor.startLiveCamera()">
          <i data-lucide="rotate-ccw"></i>
          <span>Try Again</span>
        </button>
        <button class="btn btn-secondary" onclick="window.safetyMonitor.startSimulationMode()">
          <span>Start Simulation Mode</span>
        </button>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.remove('hidden');
    if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.add('hidden');
  }

  startSimulationMode() {
    this.isSimulation = true;
    this.mode = 'simulation';

    if (this.dom.faceNotDetectedModal) this.dom.faceNotDetectedModal.classList.remove('active', 'show');
    if (this.dom.simModeBadge) this.dom.simModeBadge.classList.remove('hidden');
    if (this.dom.hudLiveText) this.dom.hudLiveText.textContent = 'SIMULATION MODE';
    if (this.dom.graphDataBadge) {
      this.dom.graphDataBadge.textContent = 'DEMO DATA';
      this.dom.graphDataBadge.style.color = '#D4A017';
      this.dom.graphDataBadge.style.borderColor = 'rgba(212, 160, 23, 0.4)';
    }
    if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.add('hidden');
    if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.remove('hidden');

    this.alertManager.logAlertEvent('INFO', 0, 'Simulation Mode activated (SIH Demo Fallback)');
    this.updateMonitoringControlButtons();
    this.startCalibration();
  }

  stopMonitoring() {
    this.mode = 'idle';
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = null;
    }
    if (this.graphRenderInterval) {
      clearInterval(this.graphRenderInterval);
      this.graphRenderInterval = null;
    }
    this.alertManager.resetAlertState();
    if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.remove('hidden');
    if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.add('hidden');
    if (this.dom.calibrationOverlay) this.dom.calibrationOverlay.classList.add('hidden');
    if (this.dom.faceNotDetectedModal) this.dom.faceNotDetectedModal.classList.remove('active', 'show');
    this.alertManager.logAlertEvent('INFO', 0, 'AI Monitoring stopped');
    this.updateMonitoringControlButtons();
  }

  handleMonitoringToggle() {
    if (this.mode === 'idle') {
      this.startLiveCamera();
    } else {
      this.stopMonitoring();
    }
  }

  updateMonitoringControlButtons() {
    const isMonitoring = this.mode === 'monitoring' || this.mode === 'simulation' || this.mode === 'calibrating';
    
    // 1. Top Navbar Toggle Button
    const topBtn = document.getElementById('btn-toggle-monitoring');
    const topText = document.getElementById('toggle-monitor-text');
    const topIcon = document.getElementById('toggle-monitor-icon');
    if (topBtn && topText) {
      if (isMonitoring) {
        topBtn.classList.remove('stopped');
        topText.textContent = 'Stop Monitoring';
        if (topIcon) topIcon.setAttribute('data-lucide', 'square');
      } else {
        topBtn.classList.add('stopped');
        topText.textContent = 'Start Monitoring';
        if (topIcon) topIcon.setAttribute('data-lucide', 'play');
      }
    }

    // 2. HUD Button on Video
    const hudBtn = document.getElementById('hud-stop-monitor-btn');
    if (hudBtn) {
      if (isMonitoring) {
        hudBtn.style.display = 'inline-flex';
        hudBtn.innerHTML = '<i data-lucide="square"></i><span>Stop Monitoring</span>';
      } else {
        hudBtn.style.display = 'inline-flex';
        hudBtn.innerHTML = '<i data-lucide="play"></i><span>Start Monitoring</span>';
      }
    }

    // 3. Sidebar Card Button
    const cardBtn = document.getElementById('btn-stop-card');
    const cardText = document.getElementById('card-toggle-text');
    const cardIcon = document.getElementById('card-toggle-icon');
    if (cardBtn && cardText) {
      if (isMonitoring) {
        cardBtn.classList.remove('stopped');
        cardText.textContent = 'Stop Monitoring';
        if (cardIcon) cardIcon.setAttribute('data-lucide', 'square');
      } else {
        cardBtn.classList.add('stopped');
        cardText.textContent = 'Start Monitoring';
        if (cardIcon) cardIcon.setAttribute('data-lucide', 'play');
      }
    }

    // 4. Top status text & indicator
    if (this.dom.statusText) {
      this.dom.statusText.textContent = isMonitoring
        ? (this.isSimulation ? 'WIDEEYE SAFETY MONITOR · SIMULATION ACTIVE' : 'WIDEEYE SAFETY MONITOR · ACTIVE')
        : 'WIDEEYE SAFETY MONITOR · STANDBY';
    }
    if (this.dom.statusDot) {
      this.dom.statusDot.className = isMonitoring ? 'pulse-lemon-dot' : 'pulse-gray-dot';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // 3. ADAPTIVE CALIBRATION SEQUENCE (COLLECTS 75 VALID REAL FRAMES)
  startCalibration() {
    this.mode = 'calibrating';
    this.calibrationSamples = [];
    this.calibrationMissedFrames = 0;
    this.isCalibrated = false;

    if (this.dom.calibrationOverlay) this.dom.calibrationOverlay.classList.remove('hidden');
    if (this.dom.faceNotDetectedModal) this.dom.faceNotDetectedModal.classList.remove('active', 'show');
    if (this.dom.calibProgressFill) this.dom.calibProgressFill.style.width = '0%';
    if (this.dom.calibCountdown) this.dom.calibCountdown.textContent = '5s remaining';
    if (this.dom.calibSamplesText) this.dom.calibSamplesText.textContent = 'Look straight ahead and keep eyes open naturally';

    this.alertManager.logAlertEvent('CALIBRATION', 0, 'Starting 5s adaptive driver calibration · Waiting for real face');

    this.startRenderLoop();
  }

  onCalibrationFaceLost() {
    if (this.mode === 'calibrating') {
      this.mode = 'paused';
      if (this.dom.faceNotDetectedModal) this.dom.faceNotDetectedModal.classList.add('active');
      this.alertManager.logAlertEvent('WARNING', 0, 'Calibration paused: Face not clearly detected');
    }
  }

  retryCalibration() {
    if (this.dom.faceNotDetectedModal) this.dom.faceNotDetectedModal.classList.remove('active', 'show');
    this.startCalibration();
  }

  finishCalibration() {
    this.mode = 'monitoring';
    this.isCalibrated = true;

    if (this.calibrationSamples.length >= 20) {
      const sumAvgEAR = this.calibrationSamples.reduce((acc, s) => acc + s.avgEAR, 0);
      const sumLeftEAR = this.calibrationSamples.reduce((acc, s) => acc + s.leftEAR, 0);
      const sumRightEAR = this.calibrationSamples.reduce((acc, s) => acc + s.rightEAR, 0);
      const sumMAR = this.calibrationSamples.reduce((acc, s) => acc + s.mar, 0);
      const sumPitch = this.calibrationSamples.reduce((acc, s) => acc + (s.pitchRatio || 0.48), 0);
      const sumYaw = this.calibrationSamples.reduce((acc, s) => acc + (s.yawDiff || 0), 0);

      this.baselineEAR = Math.max(0.20, Math.min(0.38, sumAvgEAR / this.calibrationSamples.length));
      this.baselineLeftEAR = Math.max(0.20, Math.min(0.38, sumLeftEAR / this.calibrationSamples.length));
      this.baselineRightEAR = Math.max(0.20, Math.min(0.38, sumRightEAR / this.calibrationSamples.length));
      this.baselineMAR = Math.max(0.10, Math.min(0.28, sumMAR / this.calibrationSamples.length));
      this.baselinePitch = sumPitch / this.calibrationSamples.length;
      this.baselineYaw = sumYaw / this.calibrationSamples.length;
    } else {
      this.baselineEAR = 0.290;
      this.baselineMAR = 0.180;
    }

    if (this.dom.valBaseEAR) this.dom.valBaseEAR.textContent = this.baselineEAR.toFixed(2);
    if (this.dom.valBaseMAR) this.dom.valBaseMAR.textContent = this.baselineMAR.toFixed(2);

    if (this.dom.calibSamplesText) {
      this.dom.calibSamplesText.textContent = `✓ Personalized baseline established: EAR ${this.baselineEAR.toFixed(2)} · MAR ${this.baselineMAR.toFixed(2)}`;
    }

    setTimeout(() => {
      if (this.dom.calibrationOverlay) this.dom.calibrationOverlay.classList.add('hidden');
    }, 500);

    this.startSessionTimer();
    this.addRiskEvent('CALIBRATION');
    this.alertManager.logAlertEvent('CALIBRATION', 12, `Calibration complete ✓ Baseline EAR: ${this.baselineEAR.toFixed(2)} | MAR: ${this.baselineMAR.toFixed(2)}`);
    this.alertManager.logAlertEvent('INFO', 12, 'WideEYE Real-Time AI Safety Monitoring active');
  }

  startSessionTimer() {
    this.sessionStartTime = Date.now();
    if (this.sessionInterval) clearInterval(this.sessionInterval);

    this.sessionInterval = setInterval(() => {
      if (this.mode !== 'monitoring' && this.mode !== 'simulation') return;
      const totalSec = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      if (this.dom.sessionTimer) {
        this.dom.sessionTimer.textContent = `${hrs}:${mins}:${secs}`;
      }
    }, 1000);
  }

  // 4. MEDIAPIPE INITIALIZATION
  initMediaPipe() {
    if (!this.faceMesh && window.FaceMesh) {
      this.faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results) => this.onFaceMeshResults(results));
    }
  }

  // 5. MATHEMATICAL COMPUTER VISION CALCULATIONS
  calculateEyeAspect(p1, p2, p3, p4, p5, p6) {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const vertical1 = dist(p2, p6);
    const vertical2 = dist(p3, p5);
    const horizontal = dist(p1, p4);
    if (horizontal === 0) return 0.29;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  calculateMouthAspect(left, right, top, bottom) {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const vertical = dist(top, bottom);
    const horizontal = dist(left, right);
    if (horizontal === 0) return 0.18;
    return vertical / horizontal;
  }

  onFaceMeshResults(results) {
    this.isProcessingFrame = false;
    if (!this.canvasCtx || !this.canvasElement) return;

    const ctx = this.canvasCtx;
    const canvas = this.canvasElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // A. NO FACE DETECTED
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.metrics.faceStatus = 'FACE NOT DETECTED';
      this.metrics.eyesStatus = '--';
      this.metrics.mouthStatus = '--';
      this.metrics.confidence = 0;

      if (this.mode === 'calibrating') {
        this.calibrationMissedFrames++;
        if (this.calibrationMissedFrames >= 15) { // ~0.8s without face
          this.onCalibrationFaceLost();
        }
      }

      this.updateUI();
      return;
    }

    // B. MULTIPLE FACES DETECTED
    if (results.multiFaceLandmarks.length > 1) {
      this.metrics.faceStatus = 'MULTIPLE FACES DETECTED';
      this.metrics.confidence = 45;
      this.metrics.eyesStatus = '--';
      this.metrics.mouthStatus = '--';
      this.updateUI();
      return;
    }

    // C. EXACTLY ONE FACE DETECTED
    this.calibrationMissedFrames = 0;
    this.lastFaceDetectedTime = performance.now();
    this.metrics.faceStatus = '✓ FACE DETECTED';
    this.metrics.confidence = 94;

    const landmarks = results.multiFaceLandmarks[0];
    this.drawFacialLandmarks(ctx, canvas, landmarks);

    // 1. Calculate Real EAR for Left and Right Eyes
    const leftEAR = this.calculateEyeAspect(
      landmarks[33], landmarks[160], landmarks[158],
      landmarks[133], landmarks[153], landmarks[144]
    );

    const rightEAR = this.calculateEyeAspect(
      landmarks[362], landmarks[385], landmarks[387],
      landmarks[263], landmarks[373], landmarks[380]
    );

    const avgEAR = (leftEAR + rightEAR) / 2.0;

    // Glasses & Eye Visibility Verification
    if (leftEAR < 0.08 && rightEAR < 0.08) {
      this.metrics.eyesStatus = 'LIMITED EYE VISIBILITY';
    } else {
      this.metrics.eyesStatus = 'DETECTED ✓';
    }

    // 2. Calculate Real MAR
    const mar = this.calculateMouthAspect(
      landmarks[61], landmarks[291], landmarks[13], landmarks[14]
    );
    this.metrics.mouthStatus = 'DETECTED ✓';

    // 3. Calculate 3D Head Pose Vectors
    const nose = landmarks[1];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    let headPose = 'STABLE';
    const yawDiff = (nose.x - leftCheek.x) - (rightCheek.x - nose.x);
    const pitchRatio = (nose.y - forehead.y) / Math.max(0.01, chin.y - forehead.y);
    const rollAngle = Math.atan2(landmarks[263].y - landmarks[33].y, landmarks[263].x - landmarks[33].x);

    if (pitchRatio > (this.baselinePitch * 1.25) || (chin.y - nose.y < 0.10)) {
      headPose = 'HEAD DOWN (NODDING)';
    } else if (yawDiff > 0.08) {
      headPose = 'LOOKING RIGHT';
    } else if (yawDiff < -0.08) {
      headPose = 'LOOKING LEFT';
    } else if (Math.abs(rollAngle) > 0.09) {
      headPose = 'HEAD TILT';
    }

    // 4. If in Calibration Mode, accumulate valid face samples
    if (this.mode === 'calibrating') {
      this.calibrationSamples.push({ leftEAR, rightEAR, avgEAR, mar, pitchRatio, yawDiff, rollAngle, headPose });
      const progress = Math.min(1, this.calibrationSamples.length / this.TARGET_CALIBRATION_FRAMES);

      if (this.dom.calibProgressFill) {
        this.dom.calibProgressFill.style.width = `${(progress * 100).toFixed(0)}%`;
      }
      const remainingSec = Math.max(1, Math.ceil((1 - progress) * 5));
      if (this.dom.calibCountdown) {
        this.dom.calibCountdown.textContent = `${remainingSec}s remaining`;
      }
      if (this.dom.calibSamplesText) {
        this.dom.calibSamplesText.textContent = `Gathering biometric baseline (${Math.round(progress * 100)}%)`;
      }

      if (this.calibrationSamples.length >= this.TARGET_CALIBRATION_FRAMES) {
        this.finishCalibration();
      }

      this.metrics.leftEAR = leftEAR;
      this.metrics.rightEAR = rightEAR;
      this.metrics.avgEAR = avgEAR;
      this.metrics.mar = mar;
      this.metrics.headPose = headPose;
      this.updateUI();
      return;
    }

    // 5. If in Active Monitoring, process signals
    if (this.mode === 'monitoring') {
      this.processSignals(leftEAR, rightEAR, mar, headPose);
    }
  }

  drawFacialLandmarks(ctx, canvas, landmarks) {
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 160, 23, 0.45)';
    ctx.fillStyle = '#D4A017';
    ctx.lineWidth = 1.3;

    const leftEyeIdx = [33, 160, 158, 133, 153, 144, 33];
    const rightEyeIdx = [362, 385, 387, 263, 373, 380, 362];
    const mouthIdx = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];

    const drawContour = (indices) => {
      ctx.beginPath();
      indices.forEach((idx, i) => {
        const pt = landmarks[idx];
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawContour(leftEyeIdx);
    drawContour(rightEyeIdx);
    drawContour(mouthIdx);

    // Iris center points & Nose tip
    [468, 473, 1].forEach(idx => {
      if (landmarks[idx]) {
        const pt = landmarks[idx];
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // 6. TIME-SERIES SIGNAL PROCESSING & DROWSINESS RISK ENGINE
  processSignals(leftEAR, rightEAR, mar, headPose) {
    const now = performance.now();
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    this.metrics.leftEAR = leftEAR;
    this.metrics.rightEAR = rightEAR;
    this.metrics.avgEAR = avgEAR;
    this.metrics.mar = mar;
    this.metrics.headPose = headPose;

    // A. Real Blink & Prolonged Eye Closure Tracking
    const earThreshold = this.baselineEAR * 0.72; // Relative to personalized driver baseline
    if (avgEAR < earThreshold) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.eyeClosedStartTime = now;
      }
      this.metrics.eyeClosureDuration = (now - this.eyeClosedStartTime) / 1000;
      if (this.metrics.eyeClosureDuration > this.metrics.maxClosureDuration) {
        this.metrics.maxClosureDuration = this.metrics.eyeClosureDuration;
      }
    } else {
      if (this.isBlinking) {
        const closureDur = (now - this.eyeClosedStartTime) / 1000;
        if (closureDur >= 0.08 && closureDur < 0.45) {
          // Normal brief blink
          this.metrics.blinkCount++;
          this.blinkTimestamps.push(now);
          this.addRiskEvent('BLINK');
          if (this.metrics.blinkCount % 5 === 0) {
            this.alertManager.logAlertEvent('BLINK', Math.round(this.metrics.smoothedRiskScore), `Blink count: ${this.metrics.blinkCount} (Rate: ${this.metrics.blinkRate}/min)`);
          }
        } else if (closureDur >= 1.2) {
          this.addRiskEvent('CLOSURE');
          this.alertManager.logAlertEvent('WARNING', Math.round(this.metrics.smoothedRiskScore), `Prolonged eye closure detected (${closureDur.toFixed(1)}s)`);
        }
        this.isBlinking = false;
        this.metrics.eyeClosureDuration = 0;
      }
    }

    // B. Rolling Blink Rate Calculation (Blinks in last 60 seconds)
    this.blinkTimestamps = this.blinkTimestamps.filter(t => now - t <= 60000);
    const sessionAgeMs = this.sessionStartTime ? (Date.now() - this.sessionStartTime) : 60000;
    const factor = sessionAgeMs < 45000 ? (60000 / Math.max(10000, sessionAgeMs)) : 1;
    this.metrics.blinkRate = Math.min(45, Math.round(this.blinkTimestamps.length * factor));

    // C. Yawn Detection (MAR > threshold for > 1.2s)
    const marThreshold = Math.max(0.38, this.baselineMAR * 2.0);
    if (mar > marThreshold) {
      if (!this.isYawning) {
        this.isYawning = true;
        this.yawnStartTime = now;
      } else if ((now - this.yawnStartTime) > 1200) {
        this.metrics.yawnCount++;
        this.addRiskEvent('YAWN');
        this.alertManager.logAlertEvent('YAWN', Math.round(this.metrics.smoothedRiskScore), `Yawn event logged (Total: ${this.metrics.yawnCount})`);
        this.isYawning = false;
      }
    } else {
      this.isYawning = false;
    }

    // D. Multi-Signal Time-Series Risk Model Calculation (0–100%)
    let rawRisk = 12; // Baseline alertness

    // 1. Eye closure penalty
    if (this.metrics.eyeClosureDuration > 0.5) {
      rawRisk += Math.min(75, this.metrics.eyeClosureDuration * 36);
    } else if (avgEAR < earThreshold) {
      rawRisk += 18;
    }

    // 2. Yawning penalty
    if (this.metrics.yawnCount > 0) {
      rawRisk += Math.min(24, this.metrics.yawnCount * 7);
    }
    if (this.isYawning) {
      rawRisk += 16;
    }

    // 3. Head pose & nodding penalty
    if (headPose === 'HEAD DOWN (NODDING)') rawRisk += 25;
    else if (headPose === 'HEAD TILT') rawRisk += 12;
    else if (headPose !== 'STABLE') rawRisk += 10;

    // 4. Abnormal blink rate penalty (very slow < 6/min or rapid flutter > 28/min)
    if (this.metrics.blinkRate > 0 && this.metrics.blinkRate < 7) rawRisk += 10;
    else if (this.metrics.blinkRate > 30) rawRisk += 12;

    // 5. Confidence scaling
    if (this.metrics.confidence < 70) {
      rawRisk = rawRisk * (this.metrics.confidence / 100);
    }

    rawRisk = Math.max(0, Math.min(100, Math.round(rawRisk)));
    this.metrics.rawRiskScore = rawRisk;

    // Exponential Moving Average (EMA) Smoothing
    this.metrics.smoothedRiskScore = (ALERT_CONFIG.SMOOTHING_ALPHA * rawRisk) + ((1 - ALERT_CONFIG.SMOOTHING_ALPHA) * this.metrics.smoothedRiskScore);

    // Update Driver Status String & Pill
    const smoothed = Math.round(this.metrics.smoothedRiskScore);
    if (smoothed >= 91) {
      this.metrics.driverStatus = '🚨 CRITICAL DROWSINESS';
      this.metrics.riskLevel = 'CRITICAL';
    } else if (smoothed >= 61) {
      this.metrics.driverStatus = '⚠ HIGH RISK FATIGUE';
      this.metrics.riskLevel = 'HIGH RISK';
    } else if (smoothed >= 31) {
      this.metrics.driverStatus = '● DROWSINESS DETECTED';
      this.metrics.riskLevel = 'WARNING';
    } else {
      this.metrics.driverStatus = '● DRIVER ATTENTIVE';
      this.metrics.riskLevel = 'SAFE';
    }

    // Record sample to Risk Graph Timeline
    this.recordRiskSample(smoothed);

    // Pass Smoothed Score to Smart Alert Manager
    this.alertManager.evaluateRisk(this.metrics.smoothedRiskScore, this.metrics.confidence);

    this.updateUI();
  }

  // 7. REAL-TIME RISK TIMELINE GRAPH
  initRiskGraph() {
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      this.riskHistory.push({
        time: now - (i * 1000),
        score: 15,
        event: null
      });
    }

    if (this.graphCanvas) {
      this.drawRiskGraph();
    }
  }

  recordRiskSample(score) {
    const now = Date.now();
    const last = this.riskHistory[this.riskHistory.length - 1];
    if (!last || (now - last.time) >= 800) {
      this.riskHistory.push({
        time: now,
        score,
        event: null
      });
      if (this.riskHistory.length > 36) {
        this.riskHistory.shift();
      }
      this.drawRiskGraph();
    }
  }

  addRiskEvent(eventType) {
    if (this.riskHistory.length > 0) {
      this.riskHistory[this.riskHistory.length - 1].event = eventType;
      this.drawRiskGraph();
    }
  }

  drawRiskGraph() {
    if (!this.graphCtx || !this.graphCanvas) return;

    const ctx = this.graphCtx;
    const w = this.graphCanvas.width;
    const h = this.graphCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle Grid lines (30%, 60%, 90%)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    [0.3, 0.6, 0.9].forEach(level => {
      const y = h - (level * (h - 20)) - 10;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    if (this.riskHistory.length < 2) return;

    const pad = 10;
    const graphW = w - (pad * 2);
    const graphH = h - (pad * 2);
    const step = graphW / (this.riskHistory.length - 1);

    // Gradient Fill Under Line
    const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
    const currentScore = this.riskHistory[this.riskHistory.length - 1].score;
    if (currentScore >= 61) {
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    } else if (currentScore >= 31) {
      grad.addColorStop(0, 'rgba(212, 160, 23, 0.35)');
      grad.addColorStop(1, 'rgba(212, 160, 23, 0.0)');
    } else {
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    }

    ctx.beginPath();
    ctx.moveTo(pad, h - pad);

    this.riskHistory.forEach((sample, i) => {
      const x = pad + (i * step);
      const y = h - pad - ((sample.score / 100) * graphH);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.lineTo(pad + graphW, h - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line Plot
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = currentScore >= 61 ? '#EF4444' : (currentScore >= 31 ? '#D4A017' : '#10B981');

    this.riskHistory.forEach((sample, i) => {
      const x = pad + (i * step);
      const y = h - pad - ((sample.score / 100) * graphH);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Event Markers on Graph
    this.riskHistory.forEach((sample, i) => {
      if (sample.event) {
        const x = pad + (i * step);
        const y = h - pad - ((sample.score / 100) * graphH);

        ctx.beginPath();
        if (sample.event === 'BLINK') {
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#60A5FA';
          ctx.fill();
        } else if (sample.event === 'YAWN') {
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#F59E0B';
          ctx.fill();
        } else if (sample.event === 'CLOSURE') {
          ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#EF4444';
          ctx.fill();
        }
      }
    });

    // Current Leading Dot
    const lastX = pad + graphW;
    const lastY = h - pad - ((currentScore / 100) * graphH);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = currentScore >= 61 ? '#EF4444' : (currentScore >= 31 ? '#D4A017' : '#10B981');
    ctx.fill();
  }

  // 8. UI UPDATE ENGINE
  updateUI() {
    const m = this.metrics;
    const score = Math.round(m.smoothedRiskScore);

    if (this.dom.valAvgEAR) this.dom.valAvgEAR.textContent = m.avgEAR.toFixed(2);
    if (this.dom.valLeftEAR) this.dom.valLeftEAR.textContent = m.leftEAR.toFixed(2);
    if (this.dom.valRightEAR) this.dom.valRightEAR.textContent = m.rightEAR.toFixed(2);
    if (this.dom.valMAR) this.dom.valMAR.textContent = m.mar.toFixed(2);
    if (this.dom.valBlinkRate) this.dom.valBlinkRate.textContent = `${m.blinkRate}/min`;
    if (this.dom.valBlinks) this.dom.valBlinks.textContent = m.blinkCount;
    if (this.dom.valYawns) this.dom.valYawns.textContent = m.yawnCount;
    if (this.dom.valHeadPose) this.dom.valHeadPose.textContent = m.headPose;
    if (this.dom.valConfidence) this.dom.valConfidence.textContent = `${m.confidence}%`;
    if (this.dom.valFaceStatus) {
      this.dom.valFaceStatus.textContent = m.faceStatus;
      this.dom.valFaceStatus.style.color = m.faceStatus.includes('✓') ? '#10B981' : (m.faceStatus.includes('WAITING') ? '#888888' : '#EF4444');
    }
    if (this.dom.valEyesStatus) {
      this.dom.valEyesStatus.textContent = m.eyesStatus;
      this.dom.valEyesStatus.style.color = m.eyesStatus.includes('✓') ? '#10B981' : (m.eyesStatus.includes('LIMITED') ? '#D4A017' : '#888888');
    }
    if (this.dom.valMouthStatus) {
      this.dom.valMouthStatus.textContent = m.mouthStatus;
      this.dom.valMouthStatus.style.color = m.mouthStatus.includes('✓') ? '#10B981' : '#888888';
    }
    if (this.dom.valClosureDuration) {
      this.dom.valClosureDuration.textContent = m.eyeClosureDuration > 0 ? `${m.eyeClosureDuration.toFixed(1)}s` : '0.0s';
    }

    // Driver Status Pill
    if (this.dom.driverStatusText) this.dom.driverStatusText.textContent = m.driverStatus;
    if (this.dom.driverStatusPill) {
      const cls = score >= 91 ? 'status-critical' : (score >= 61 ? 'status-high-risk' : (score >= 31 ? 'status-warning' : 'status-attentive'));
      this.dom.driverStatusPill.className = `driver-status-banner-pill ${cls}`;
    }

    // Circular Risk Meter UI
    if (this.dom.riskScoreVal) this.dom.riskScoreVal.textContent = `${score}%`;
    if (this.dom.riskLevelVal) this.dom.riskLevelVal.textContent = this.alertManager.currentLevel;

    if (this.dom.riskMeterCircle) {
      const offset = 283 - (283 * (score / 100));
      this.dom.riskMeterCircle.style.strokeDashoffset = offset;
      this.dom.riskMeterCircle.style.stroke = this.alertManager.getLevelColor(this.alertManager.currentLevel);
    }

    if (this.dom.riskLevelVal) {
      this.dom.riskLevelVal.className = `risk-badge-tag ${this.alertManager.currentLevel.toLowerCase().replace(' ', '-')}`;
    }
    if (this.dom.riskDescText) {
      this.dom.riskDescText.textContent = this.alertManager.getLevelDescription(this.alertManager.currentLevel);
    }
  }

  startRenderLoop() {
    if (this.animationFrameId) return;

    const loop = async () => {
      if (this.mode === 'idle') {
        this.animationFrameId = null;
        return;
      }

      if (this.isSimulation) {
        this.stepSimulationFrame();
      } else if (this.faceMesh && this.videoElement && this.videoElement.readyState >= 2) {
        if (!this.isProcessingFrame) {
          this.isProcessingFrame = true;
          try {
            await this.faceMesh.send({ image: this.videoElement });
          } catch (e) {
            this.isProcessingFrame = false;
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stepSimulationFrame() {
    if (this.mode === 'calibrating') {
      const simEAR = 0.29 + (Math.random() - 0.5) * 0.02;
      const simMAR = 0.18 + (Math.random() - 0.5) * 0.01;
      this.calibrationSamples.push({ leftEAR: simEAR, rightEAR: simEAR, avgEAR: simEAR, mar: simMAR, pitchRatio: 0.48, yawDiff: 0, headPose: 'STABLE' });
      const progress = Math.min(1, this.calibrationSamples.length / this.TARGET_CALIBRATION_FRAMES);

      if (this.dom.calibProgressFill) this.dom.calibProgressFill.style.width = `${(progress * 100).toFixed(0)}%`;
      const remainingSec = Math.max(1, Math.ceil((1 - progress) * 5));
      if (this.dom.calibCountdown) this.dom.calibCountdown.textContent = `${remainingSec}s remaining`;
      if (this.dom.calibSamplesText) this.dom.calibSamplesText.textContent = `Gathering biometric baseline (${Math.round(progress * 100)}%)`;

      if (this.calibrationSamples.length >= this.TARGET_CALIBRATION_FRAMES) {
        this.finishCalibration();
      }

      this.metrics.faceStatus = '✓ FACE DETECTED';
      this.metrics.eyesStatus = 'DETECTED ✓';
      this.metrics.mouthStatus = 'DETECTED ✓';
      this.metrics.confidence = 94;
      this.metrics.avgEAR = simEAR;
      this.metrics.mar = simMAR;
      this.updateUI();
      if (this.canvasCtx && this.canvasElement) this.drawSimulatedFace(this.canvasCtx, this.canvasElement);
      return;
    }

    const jitter = (Math.random() - 0.5) * 0.02;
    let simEAR = Math.max(0.08, Math.min(0.38, this.metrics.avgEAR + jitter));
    let simMAR = Math.max(0.12, Math.min(0.48, this.metrics.mar + (Math.random() - 0.5) * 0.01));

    this.metrics.faceStatus = '✓ FACE DETECTED';
    this.metrics.eyesStatus = 'DETECTED ✓';
    this.metrics.mouthStatus = 'DETECTED ✓';
    this.metrics.confidence = 94;

    this.processSignals(simEAR, simEAR, simMAR, this.metrics.headPose);

    if (this.canvasCtx && this.canvasElement) {
      this.drawSimulatedFace(this.canvasCtx, this.canvasElement);
    }
  }

  drawSimulatedFace(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 160, 23, 0.4)';
    ctx.fillStyle = '#D4A017';
    ctx.lineWidth = 1.5;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 120, 0, 0, 2 * Math.PI);
    ctx.stroke();

    const eyeOpening = (this.metrics.avgEAR / 0.29) * 8;
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy - 20, 16, Math.max(1, eyeOpening), 0, 0, 2 * Math.PI);
    ctx.ellipse(cx + 35, cy - 20, 16, Math.max(1, eyeOpening), 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - 35, cy - 20, 3, 0, 2 * Math.PI);
    ctx.arc(cx + 35, cy - 20, 3, 0, 2 * Math.PI);
    ctx.fill();

    const mouthHeight = (this.metrics.mar / 0.18) * 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 45, 24, Math.max(2, mouthHeight), 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  // Preset Trigger for SIH Judges
  setPresetRisk(level) {
    this.alertManager.logAlertEvent('PRESET', level === 'SAFE' ? 18 : level === 'WARNING' ? 48 : level === 'HIGH_RISK' ? 78 : 96, `SIH Demo Controller: Force preset triggered [${level}]`);
    if (level === 'SAFE') {
      this.metrics.avgEAR = 0.29;
      this.metrics.leftEAR = 0.29;
      this.metrics.rightEAR = 0.29;
      this.metrics.mar = 0.18;
      this.metrics.headPose = 'STABLE';
      this.metrics.eyeClosureDuration = 0;
      this.metrics.rawRiskScore = 15;
    } else if (level === 'WARNING') {
      this.metrics.avgEAR = 0.21;
      this.metrics.mar = 0.28;
      this.metrics.headPose = 'LOOKING LEFT';
      this.metrics.eyeClosureDuration = 0.8;
      this.metrics.rawRiskScore = 48;
    } else if (level === 'HIGH_RISK') {
      this.metrics.avgEAR = 0.13;
      this.metrics.mar = 0.42;
      this.metrics.headPose = 'HEAD DOWN (NODDING)';
      this.metrics.eyeClosureDuration = 1.8;
      this.metrics.rawRiskScore = 78;
    } else if (level === 'CRITICAL') {
      this.metrics.avgEAR = 0.07;
      this.metrics.mar = 0.46;
      this.metrics.headPose = 'HEAD DOWN (NODDING)';
      this.metrics.eyeClosureDuration = 3.2;
      this.metrics.rawRiskScore = 96;
    }
  }
}

// ==========================================================================
// PHASE 5: SMART ALERT MANAGER & RESPONSE ENGINE 🚨
// ==========================================================================

class AlertManager {
  constructor(monitor) {
    this.monitor = monitor;
    this.audioEnabled = true;

    // Escalation State
    this.currentLevel = 'SAFE'; // 'SAFE' | 'WARNING' | 'HIGH RISK' | 'CRITICAL'
    this.previousLevel = 'SAFE';
    this.levelStartTime = performance.now();
    this.isAcknowledged = false;
    this.isSosActive = false;

    // Audio & Cooldowns
    this.audioContext = null;
    this.lastAudioTime = 0;
    this.currentPlayingType = null;
    this.audioOscillator = null;

    // SOS Countdown
    this.sosCountdownSeconds = 5;
    this.sosCountdownInterval = null;

    // Alert Event History Log
    this.alertHistory = [];

    // Bind DOM
    this.bindAlertDom();
    this.initAudioContext();
  }

  bindAlertDom() {
    this.dom = {
      // Banner & Screen Alerts
      warningBanner: document.getElementById('warning-banner'),
      warningBannerText: document.getElementById('warning-banner-text'),
      warningActionHint: document.getElementById('warning-action-hint'),
      warningSosBtn: document.getElementById('warning-sos-btn'),
      warningImAlertBtn: document.getElementById('warning-imalert-btn'),
      cameraAlertOverlay: document.getElementById('camera-alert-overlay'),
      cameraAlertBadge: document.getElementById('camera-alert-badge'),

      // Critical Modal Dialog
      criticalModal: document.getElementById('critical-alert-modal'),
      criticalScoreVal: document.getElementById('critical-score-val'),
      criticalDriverVal: document.getElementById('critical-driver-val'),
      criticalVehVal: document.getElementById('critical-veh-val'),

      // I'm Alert Confirmation Dialog
      imAlertConfirmModal: document.getElementById('imalert-confirm-modal'),

      // SOS Countdown Modal
      sosCountdownModal: document.getElementById('sos-countdown-modal'),
      sosCountdownNum: document.getElementById('sos-countdown-number'),
      sosProgressCircle: document.getElementById('sos-countdown-circle'),
      sosCountdownSecText: document.getElementById('sos-countdown-sec-text'),

      // SOS Activated Screen
      sosActivatedModal: document.getElementById('sos-activated-modal'),

      // Passenger Alert Card
      passengerAlertBox: document.getElementById('passenger-alert-box'),
      passengerAlertScore: document.getElementById('passenger-alert-score'),

      // Event Timeline List
      eventsList: document.getElementById('events-timeline-list')
    };
  }

  initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API not supported.', e);
    }
  }

  // 1. STATEFUL RISK EVALUATION (WITH TEMPORAL PERSISTENCE & RECOVERY)
  evaluateRisk(smoothedScore, confidence) {
    const score = Math.round(smoothedScore);
    const now = performance.now();

    // Determine target candidate level
    let candidateLevel = 'SAFE';
    if (score >= ALERT_CONFIG.CRITICAL_THRESHOLD) candidateLevel = 'CRITICAL';
    else if (score >= ALERT_CONFIG.HIGH_RISK_THRESHOLD) candidateLevel = 'HIGH RISK';
    else if (score >= ALERT_CONFIG.WARNING_THRESHOLD) candidateLevel = 'WARNING';
    else candidateLevel = 'SAFE';

    // Temporal Persistence Filter (Prevent single-frame jitter)
    if (candidateLevel !== this.currentLevel) {
      const durationInCurrent = now - this.levelStartTime;

      // Escalation requirements
      if (candidateLevel === 'CRITICAL' && durationInCurrent < ALERT_CONFIG.CRITICAL_PERSISTENCE_MS && this.currentLevel !== 'HIGH RISK') {
        return; // wait for persistence
      }
      if (candidateLevel === 'HIGH RISK' && durationInCurrent < ALERT_CONFIG.HIGH_RISK_PERSISTENCE_MS && this.currentLevel !== 'WARNING') {
        return;
      }
      if (candidateLevel === 'WARNING' && durationInCurrent < ALERT_CONFIG.WARNING_PERSISTENCE_MS) {
        return;
      }

      // Transition approved!
      this.transitionToLevel(candidateLevel, score, confidence);
    } else {
      // If remaining in Warning/High Risk/Critical, evaluate recurring audio
      if (this.currentLevel !== 'SAFE' && !this.isAcknowledged) {
        this.maybePlayAudioAlert(this.currentLevel);
      }
    }
  }

  // 2. STATE TRANSITIONS & DISPATCH
  transitionToLevel(newLevel, score, confidence) {
    const fromLevel = this.currentLevel;
    this.previousLevel = fromLevel;
    this.currentLevel = newLevel;
    this.levelStartTime = performance.now();
    this.isAcknowledged = false; // Reset driver acknowledgment on level change

    this.logAlertEvent(newLevel, score, `Risk level transitioned: ${fromLevel} ➔ ${newLevel} (${score}%)`);

    // A. Audio Alerts
    if (newLevel === 'SAFE') {
      this.stopAudio();
      this.dismissCriticalModal();
      this.dismissSosCountdown();
    } else if (newLevel === 'WARNING') {
      this.playWarningTone();
      this.dismissCriticalModal();
    } else if (newLevel === 'HIGH RISK') {
      this.playHighRiskTone();
      this.dismissCriticalModal();
    } else if (newLevel === 'CRITICAL') {
      this.playCriticalAlarm();
      this.showCriticalModal(score);
      this.showPassengerAlert(score);
    }

    // B. Update Screen & Camera Overlays
    this.updateVisualAlerts(newLevel, score);
  }

  // 3. VISUAL ALERTS & SCREEN EFFECTS
  updateVisualAlerts(level, score) {
    const body = document.body;
    body.classList.remove('alert-level-safe', 'alert-level-warning', 'alert-level-high', 'alert-level-critical');
    body.classList.add(`alert-level-${level.toLowerCase().replace(' ', '-')}`);

    // Camera Overlay Status
    if (this.dom.cameraAlertBadge) {
      if (level === 'SAFE') {
        this.dom.cameraAlertBadge.className = 'cam-alert-pill safe';
        this.dom.cameraAlertBadge.innerHTML = `<span class="pulse-green-dot"></span><span>● SAFE</span>`;
      } else if (level === 'WARNING') {
        this.dom.cameraAlertBadge.className = 'cam-alert-pill warning';
        this.dom.cameraAlertBadge.innerHTML = `<i data-lucide="alert-triangle"></i><span>⚠ WARNING</span>`;
      } else if (level === 'HIGH RISK') {
        this.dom.cameraAlertBadge.className = 'cam-alert-pill high-risk';
        this.dom.cameraAlertBadge.innerHTML = `<i data-lucide="alert-circle"></i><span>⚠ HIGH RISK</span>`;
      } else if (level === 'CRITICAL') {
        this.dom.cameraAlertBadge.className = 'cam-alert-pill critical';
        this.dom.cameraAlertBadge.innerHTML = `<i data-lucide="alert-octagon"></i><span>🚨 CRITICAL</span>`;
      }
      if (window.lucide) window.lucide.createIcons();
    }

    // Warning Banner in Header
    if (this.dom.warningBanner) {
      if (level === 'SAFE') {
        this.dom.warningBanner.classList.add('hidden');
      } else {
        this.dom.warningBanner.classList.remove('hidden');
        this.dom.warningBanner.className = `warning-alert-banner ${level.toLowerCase().replace(' ', '-')}`;

        let bannerText = "⚠ Signs of fatigue detected · Please stay alert.";
        let actionHint = "Please stay focused on the road.";

        if (level === 'HIGH RISK') {
          bannerText = "⚠ HIGH DROWSINESS RISK · Driver fatigue indicators increasing.";
          actionHint = "Recommended: Please take a break or stop vehicle safely.";
        } else if (level === 'CRITICAL') {
          bannerText = "🚨 CRITICAL DROWSINESS DETECTED · Immediate attention required.";
          actionHint = "Driver may be unable to continue safely.";
        }

        if (this.dom.warningBannerText) this.dom.warningBannerText.textContent = bannerText;
        if (this.dom.warningActionHint) this.dom.warningActionHint.textContent = actionHint;

        // Show/Hide action buttons in banner
        if (this.dom.warningSosBtn) {
          this.dom.warningSosBtn.style.display = (level === 'CRITICAL' || level === 'HIGH RISK') ? 'inline-flex' : 'none';
        }
        if (this.dom.warningImAlertBtn) {
          this.dom.warningImAlertBtn.style.display = (level === 'CRITICAL') ? 'inline-flex' : 'none';
        }
      }
    }
  }

  // 4. SYNTHESIZED WEB AUDIO ALERT GENERATOR
  maybePlayAudioAlert(level) {
    const now = performance.now();
    if (now - this.lastAudioTime < ALERT_CONFIG.AUDIO_COOLDOWN_MS) return;

    if (level === 'WARNING') this.playWarningTone();
    else if (level === 'HIGH RISK') this.playHighRiskTone();
    else if (level === 'CRITICAL') this.playCriticalAlarm();
  }

  playWarningTone() {
    if (!this.audioEnabled || !this.audioContext) return;
    this.resumeAudioContext();
    this.lastAudioTime = performance.now();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(554, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  playHighRiskTone() {
    if (!this.audioEnabled || !this.audioContext) return;
    this.resumeAudioContext();
    this.lastAudioTime = performance.now();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(659, ctx.currentTime);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.24, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }

  playCriticalAlarm() {
    if (!this.audioEnabled || !this.audioContext) return;
    this.resumeAudioContext();
    this.lastAudioTime = performance.now();

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dual-tone urgent repeating alarm
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.36);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  }

  // Realistic Synthesized Web Audio Siren Pulse
  playEmergencySirenPulse(secondsRemaining) {
    if (!this.audioEnabled) return;
    this.resumeAudioContext();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      const baseFreq = secondsRemaining === 1 ? 880 : (640 + (5 - secondsRemaining) * 45);
      const peakFreq = secondsRemaining === 1 ? 1300 : baseFreq + 360;
      const duration = secondsRemaining === 1 ? 0.42 : 0.32;

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.linearRampToValueAtTime(peakFreq, now + (duration * 0.45));
      osc1.frequency.linearRampToValueAtTime(baseFreq, now + duration);

      osc2.frequency.setValueAtTime(baseFreq * 0.5, now);
      osc2.frequency.linearRampToValueAtTime(peakFreq * 0.5, now + (duration * 0.45));
      osc2.frequency.linearRampToValueAtTime(baseFreq * 0.5, now + duration);

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
      console.warn('Audio notice:', e);
    }
  }

  playFinalSosActivatedSiren() {
    if (!this.audioEnabled) return;
    this.resumeAudioContext();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

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
      try { this.audioOscillator.stop(); } catch(e) {}
      this.audioOscillator = null;
    }
  }

  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // 5. DRIVER INTERVENTION: "I'M ALERT" CHALLENGE
  handleImAlertClick() {
    if (this.dom.imAlertConfirmModal) {
      this.dom.imAlertConfirmModal.classList.add('active');
    }
  }

  confirmDriverIsAlert() {
    this.isAcknowledged = true;
    this.stopAudio();
    this.dismissCriticalModal();
    if (this.dom.imAlertConfirmModal) {
      this.dom.imAlertConfirmModal.classList.remove('active');
    }
    this.logAlertEvent('DRIVER_RESPONSE', Math.round(this.monitor.metrics.smoothedRiskScore), "Driver confirmed alertness [I'm Alert]. Resumed active monitoring.");
  }

  cancelImAlertConfirm() {
    if (this.dom.imAlertConfirmModal) {
      this.dom.imAlertConfirmModal.classList.remove('active');
    }
  }

  // 6. EMERGENCY SOS COUNTDOWN & ACTIVATION
  startSosCountdown() {
    this.dismissCriticalModal();
    this.sosCountdownSeconds = 5;

    if (this.dom.sosCountdownModal) {
      this.dom.sosCountdownModal.classList.add('active');
      if (this.dom.sosCountdownNum) {
        this.dom.sosCountdownNum.textContent = '5';
        this.dom.sosCountdownNum.style.animation = 'none';
        void this.dom.sosCountdownNum.offsetWidth;
        this.dom.sosCountdownNum.style.animation = 'sos-num-tick 0.35s ease-out';
      }
      if (this.dom.sosCountdownSecText) {
        this.dom.sosCountdownSecText.textContent = '5 seconds';
      }
      if (this.dom.sosProgressCircle) {
        this.dom.sosProgressCircle.style.strokeDashoffset = '0';
      }
    }

    this.logAlertEvent('SOS_COUNTDOWN', Math.round(this.monitor.metrics.smoothedRiskScore), 'Emergency assistance countdown started (5s)...');
    this.playEmergencySirenPulse(5);

    if (this.sosCountdownInterval) clearInterval(this.sosCountdownInterval);

    this.sosCountdownInterval = setInterval(() => {
      this.sosCountdownSeconds--;

      if (this.dom.sosCountdownNum) {
        this.dom.sosCountdownNum.textContent = String(this.sosCountdownSeconds);
        this.dom.sosCountdownNum.style.animation = 'none';
        void this.dom.sosCountdownNum.offsetWidth;
        this.dom.sosCountdownNum.style.animation = 'sos-num-tick 0.35s ease-out';
      }

      if (this.dom.sosCountdownSecText) {
        this.dom.sosCountdownSecText.textContent = `${this.sosCountdownSeconds} second${this.sosCountdownSeconds === 1 ? '' : 's'}`;
      }

      if (this.dom.sosProgressCircle) {
        const circumference = 402.12;
        const progress = this.sosCountdownSeconds / 5;
        const offset = circumference * (1 - progress);
        this.dom.sosProgressCircle.style.strokeDashoffset = offset;
      }

      if (this.sosCountdownSeconds > 0) {
        this.playEmergencySirenPulse(this.sosCountdownSeconds);
      }

      if (this.sosCountdownSeconds <= 0) {
        clearInterval(this.sosCountdownInterval);
        this.completeSosActivation();
      }
    }, 1000);
  }

  cancelSosCountdown() {
    if (this.sosCountdownInterval) clearInterval(this.sosCountdownInterval);
    if (this.dom.sosCountdownModal) {
      this.dom.sosCountdownModal.classList.remove('active');
    }
    this.logAlertEvent('SOS_CANCELLED', Math.round(this.monitor.metrics.smoothedRiskScore), 'Emergency SOS countdown cancelled by user.');
  }

  completeSosActivation() {
    this.isSosActive = true;
    if (this.dom.sosCountdownModal) {
      this.dom.sosCountdownModal.classList.remove('active');
    }
    if (this.dom.sosActivatedModal) {
      this.dom.sosActivatedModal.classList.add('active');
    }
    this.playFinalSosActivatedSiren();
    this.logAlertEvent('SOS_ACTIVATED', Math.round(this.monitor.metrics.smoothedRiskScore), '🚨 EMERGENCY SOS ACTIVATED · Triage dispatch signal transmitted.');
  }

  closeSosActivatedModal() {
    if (this.dom.sosActivatedModal) {
      this.dom.sosActivatedModal.classList.remove('active');
    }
  }

  // 7. PASSENGER ALERT NOTIFICATION
  showPassengerAlert(score) {
    if (this.dom.passengerAlertBox) {
      this.dom.passengerAlertBox.classList.remove('hidden');
      if (this.dom.passengerAlertScore) {
        this.dom.passengerAlertScore.textContent = `${score}% (Critical)`;
      }
    }
  }

  dismissPassengerAlert() {
    if (this.dom.passengerAlertBox) {
      this.dom.passengerAlertBox.classList.add('hidden');
    }
  }

  showCriticalModal(score) {
    if (this.dom.criticalModal && !this.isAcknowledged) {
      this.dom.criticalModal.classList.add('active');
      if (this.dom.criticalScoreVal) this.dom.criticalScoreVal.textContent = `${score}%`;
    }
  }

  dismissCriticalModal() {
    if (this.dom.criticalModal) {
      this.dom.criticalModal.classList.remove('active');
    }
  }

  dismissSosCountdown() {
    if (this.sosCountdownInterval) clearInterval(this.sosCountdownInterval);
    if (this.dom.sosCountdownModal) {
      this.dom.sosCountdownModal.classList.remove('active');
    }
  }

  resetAlertState() {
    this.currentLevel = 'SAFE';
    this.previousLevel = 'SAFE';
    this.isAcknowledged = false;
    this.isSosActive = false;
    this.stopAudio();
    this.dismissCriticalModal();
    this.dismissSosCountdown();
    this.dismissPassengerAlert();
    this.updateVisualAlerts('SAFE', 18);
  }

  // 8. ALERT EVENT LOGGING
  logAlertEvent(level, score, message) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    this.alertHistory.unshift({ time: timeStr, level, score, text: message });
    if (this.alertHistory.length > 25) this.alertHistory.pop();

    if (this.dom.eventsList) {
      this.dom.eventsList.innerHTML = this.alertHistory
        .map(e => `
          <li class="timeline-event-item ${e.level.toLowerCase().replace(' ', '-')}">
            <span class="event-time">${e.time}</span>
            <span class="event-tag">${e.level}</span>
            <span class="event-text">${e.text}</span>
          </li>
        `)
        .join('');
    }
  }

  getLevelColor(level) {
    if (level === 'WARNING') return '#FBBF24';
    if (level === 'HIGH RISK') return '#F97316';
    if (level === 'CRITICAL') return '#EF4444';
    return '#10B981';
  }

  getLevelDescription(level) {
    if (level === 'WARNING') return '⚠ Early signs of fatigue or eyelid flutter detected.';
    if (level === 'HIGH RISK') return '⚠ High drowsiness risk · Sustained eye closure or yawning.';
    if (level === 'CRITICAL') return '🚨 CRITICAL DROWSINESS DETECTED · Immediate attention required.';
    return 'Driver appears alert and attentive.';
  }
}

// Global initialization
window.WideEyeSafetyMonitor = WideEyeSafetyMonitor;
window.AlertManager = AlertManager;
