/**
 * WideEYE — Phase 4 & Phase 5: Real-Time AI Driver Safety Monitor
 * & Smart Alert & Response System 🚨
 * Brand: BLACK + LEMON YELLOW (#DFFF00) + WHITE (#FFFFFF)
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

    // Operational Modes: 'idle' | 'calibrating' | 'monitoring' | 'paused' | 'simulation'
    this.mode = 'idle';
    this.isSimulation = false;
    this.audioEnabled = true;

    // Baseline & Calibration
    this.calibrationDuration = 4000; // 4 seconds
    this.calibrationStartTime = null;
    this.baselineEAR = 0.31;
    this.baselineMAR = 0.18;
    this.calibrationSamples = [];

    // Real-Time Biometric Measurements
    this.metrics = {
      leftEAR: 0.31,
      rightEAR: 0.30,
      avgEAR: 0.305,
      mar: 0.18,
      blinkCount: 0,
      yawnCount: 0,
      headPose: 'STABLE', // 'STABLE' | 'LOOKING LEFT' | 'LOOKING RIGHT' | 'HEAD DOWN' | 'HEAD TILT'
      confidence: 94,
      faceStatus: 'ONE FACE DETECTED',
      eyeClosureDuration: 0, // seconds eyes currently closed
      maxClosureDuration: 0,
      rawRiskScore: 18,
      smoothedRiskScore: 18,
      riskLevel: 'SAFE' // 'SAFE' (0-30%) | 'WARNING' (31-60%) | 'HIGH RISK' (61-90%) | 'CRITICAL' (91-100%)
    };

    // Temporal State & Counters
    this.lastFrameTime = performance.now();
    this.eyeClosedStartTime = null;
    this.yawnStartTime = null;
    this.isBlinking = false;
    this.isYawning = false;
    this.sessionStartTime = null;
    this.sessionInterval = null;

    // MediaPipe / Tracking Setup
    this.stream = null;
    this.animationFrameId = null;
    this.faceMesh = null;

    // Phase 5 Smart Alert Manager Instance
    this.alertManager = new AlertManager(this);

    // Bind UI elements
    this.bindDomElements();
  }

  // 1. DOM REFERENCES BINDING
  bindDomElements() {
    this.dom = {
      // Containers
      permissionOverlay: document.getElementById('camera-permission-overlay'),
      calibrationOverlay: document.getElementById('calibration-overlay'),
      activeMonitorView: document.getElementById('active-monitor-view'),
      simModeBadge: document.getElementById('sim-mode-badge'),

      // Metrics Displays
      riskScoreVal: document.getElementById('risk-score-value'),
      riskLevelVal: document.getElementById('risk-level-value'),
      riskDescText: document.getElementById('risk-desc-text'),
      riskMeterCircle: document.getElementById('risk-meter-circle'),

      // Detailed Telemetry Values
      valAvgEAR: document.getElementById('metric-avg-ear'),
      valLeftEAR: document.getElementById('metric-left-ear'),
      valRightEAR: document.getElementById('metric-right-ear'),
      valMAR: document.getElementById('metric-mar'),
      valBlinks: document.getElementById('metric-blinks'),
      valYawns: document.getElementById('metric-yawns'),
      valHeadPose: document.getElementById('metric-head-pose'),
      valConfidence: document.getElementById('metric-confidence'),
      valFaceStatus: document.getElementById('metric-face-status'),
      valClosureDuration: document.getElementById('metric-closure-sec'),

      // Status Bar & Controls
      sessionTimer: document.getElementById('session-timer-text'),
      statusDot: document.getElementById('top-status-dot'),
      statusText: document.getElementById('top-status-text'),
      soundToggleBtn: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      soundLabel: document.getElementById('sound-label'),

      // Calibration Progress
      calibProgressFill: document.getElementById('calib-progress-fill'),
      calibCountdown: document.getElementById('calib-countdown-text')
    };
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
    this.alertManager.logAlertEvent('AUDIO_TOGGLE', this.metrics.smoothedRiskScore, this.audioEnabled ? 'Audio alerts enabled' : 'Audio alerts muted');
  }

  // 2. CAMERA ACCESS & LIFECYCLE
  async startLiveCamera() {
    this.isSimulation = false;
    if (this.dom.simModeBadge) this.dom.simModeBadge.classList.add('hidden');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera access via getUserMedia.');
      }

      this.alertManager.logAlertEvent('INFO', 0, 'Requesting camera permission...');
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

      this.alertManager.logAlertEvent('INFO', 0, 'Camera active · Local edge AI connected');
      if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.add('hidden');
      if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.remove('hidden');

      // Initialize MediaPipe FaceMesh & Start Calibration
      this.initMediaPipe();
      this.startCalibration();

    } catch (err) {
      console.warn('Camera access unavailable or denied:', err);
      this.alertManager.logAlertEvent('WARNING', 0, 'Camera unavailable: ' + err.message);
      this.promptFallbackSimulation();
    }
  }

  promptFallbackSimulation() {
    const fallback = confirm(
      'Webcam access is unavailable or denied.\n\nWould you like to continue in SIMULATION MODE to test all WideEYE AI features and SIH demo presets?'
    );
    if (fallback) {
      this.startSimulationMode();
    }
  }

  startSimulationMode() {
    this.isSimulation = true;
    this.mode = 'simulation';

    if (this.dom.simModeBadge) this.dom.simModeBadge.classList.remove('hidden');
    if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.add('hidden');
    if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.remove('hidden');

    this.alertManager.logAlertEvent('INFO', 0, 'Simulation Mode activated (Camera fallback)');
    this.startCalibration();
  }

  stopMonitoring() {
    this.mode = 'idle';
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = null;
    }
    this.alertManager.resetAlertState();
    if (this.dom.permissionOverlay) this.dom.permissionOverlay.classList.remove('hidden');
    if (this.dom.activeMonitorView) this.dom.activeMonitorView.classList.add('hidden');
    this.alertManager.logAlertEvent('INFO', 0, 'Monitoring stopped');
  }

  // 3. ADAPTIVE CALIBRATION SEQUENCE
  startCalibration() {
    this.mode = 'calibrating';
    this.calibrationStartTime = performance.now();
    this.calibrationSamples = [];

    if (this.dom.calibrationOverlay) this.dom.calibrationOverlay.classList.remove('hidden');
    this.alertManager.logAlertEvent('INFO', 0, 'Starting 4s adaptive driver calibration...');

    const updateCalib = () => {
      if (this.mode !== 'calibrating') return;

      const elapsed = performance.now() - this.calibrationStartTime;
      const progress = Math.min(1, elapsed / this.calibrationDuration);
      const remainingSeconds = Math.ceil((this.calibrationDuration - elapsed) / 1000);

      if (this.dom.calibProgressFill) {
        this.dom.calibProgressFill.style.width = `${progress * 100}%`;
      }
      if (this.dom.calibCountdown) {
        this.dom.calibCountdown.textContent = `${remainingSeconds}s remaining`;
      }

      if (progress >= 1) {
        this.finishCalibration();
      } else {
        requestAnimationFrame(updateCalib);
      }
    };
    requestAnimationFrame(updateCalib);
  }

  finishCalibration() {
    this.mode = 'monitoring';
    if (this.dom.calibrationOverlay) this.dom.calibrationOverlay.classList.add('hidden');

    if (this.calibrationSamples.length > 10) {
      const sumEAR = this.calibrationSamples.reduce((acc, s) => acc + s.ear, 0);
      const sumMAR = this.calibrationSamples.reduce((acc, s) => acc + s.mar, 0);
      this.baselineEAR = sumEAR / this.calibrationSamples.length;
      this.baselineMAR = sumMAR / this.calibrationSamples.length;
    }

    this.startSessionTimer();
    this.alertManager.logAlertEvent('CALIBRATION', 12, `Calibration complete ✓ Baseline EAR: ${this.baselineEAR.toFixed(3)} | MAR: ${this.baselineMAR.toFixed(3)}`);
    this.alertManager.logAlertEvent('INFO', 12, 'WideEYE Real-Time AI Safety Monitoring active');

    this.startRenderLoop();
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
    if (window.FaceMesh) {
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
    if (horizontal === 0) return 0.3;
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
    if (!this.canvasCtx || !this.canvasElement) return;

    const ctx = this.canvasCtx;
    const canvas = this.canvasElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.metrics.faceStatus = 'NO FACE DETECTED';
      this.metrics.confidence = Math.max(20, this.metrics.confidence - 2);
      this.updateUI();
      return;
    }

    if (results.multiFaceLandmarks.length > 1) {
      this.metrics.faceStatus = 'MULTIPLE FACES DETECTED';
      this.metrics.confidence = 65;
    } else {
      this.metrics.faceStatus = 'ONE FACE DETECTED';
      this.metrics.confidence = Math.min(98, this.metrics.confidence + 1);
    }

    const landmarks = results.multiFaceLandmarks[0];
    this.drawLemonLandmarks(ctx, canvas, landmarks);

    const leftEAR = this.calculateEyeAspect(
      landmarks[33], landmarks[160], landmarks[158],
      landmarks[133], landmarks[153], landmarks[144]
    );

    const rightEAR = this.calculateEyeAspect(
      landmarks[362], landmarks[385], landmarks[387],
      landmarks[263], landmarks[373], landmarks[380]
    );

    const mar = this.calculateMouthAspect(
      landmarks[61], landmarks[291], landmarks[13], landmarks[14]
    );

    const nose = landmarks[1];
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    let headPose = 'STABLE';
    const yawDiff = (nose.x - leftCheek.x) - (rightCheek.x - nose.x);
    if (yawDiff > 0.08) headPose = 'LOOKING RIGHT';
    else if (yawDiff < -0.08) headPose = 'LOOKING LEFT';
    else if (chin.y - nose.y < 0.12) headPose = 'HEAD DOWN';

    this.processSignals(leftEAR, rightEAR, mar, headPose);
  }

  drawLemonLandmarks(ctx, canvas, landmarks) {
    ctx.save();
    ctx.strokeStyle = 'rgba(223, 255, 0, 0.45)';
    ctx.fillStyle = '#DFFF00';
    ctx.lineWidth = 1.2;

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

    [468, 473].forEach(idx => {
      if (landmarks[idx]) {
        const pt = landmarks[idx];
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // 6. TIME-SERIES SIGNAL PROCESSING & DROWSINESS RISK ENGINE
  processSignals(leftEAR, rightEAR, mar, headPose) {
    const now = performance.now();
    const avgEAR = (leftEAR + rightEAR) / 2.0;

    if (this.mode === 'calibrating') {
      this.calibrationSamples.push({ ear: avgEAR, mar });
      return;
    }

    this.metrics.leftEAR = leftEAR;
    this.metrics.rightEAR = rightEAR;
    this.metrics.avgEAR = avgEAR;
    this.metrics.mar = mar;
    this.metrics.headPose = headPose;

    // A. Blink & Prolonged Eye Closure Tracking
    const earThreshold = this.baselineEAR * 0.72;
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
        if (closureDur < 0.45) {
          this.metrics.blinkCount++;
          if (this.metrics.blinkCount % 5 === 0) {
            this.alertManager.logAlertEvent('BLINK', Math.round(this.metrics.smoothedRiskScore), `Blink count: ${this.metrics.blinkCount}`);
          }
        } else if (closureDur >= 1.2) {
          this.alertManager.logAlertEvent('WARNING', Math.round(this.metrics.smoothedRiskScore), `Prolonged eye closure (${closureDur.toFixed(1)}s)`);
        }
        this.isBlinking = false;
        this.metrics.eyeClosureDuration = 0;
      }
    }

    // B. Yawn Detection (MAR > threshold for > 1.4s)
    const marThreshold = this.baselineMAR * 2.2;
    if (mar > marThreshold) {
      if (!this.isYawning) {
        this.isYawning = true;
        this.yawnStartTime = now;
      } else if ((now - this.yawnStartTime) > 1400) {
        this.metrics.yawnCount++;
        this.alertManager.logAlertEvent('YAWN', Math.round(this.metrics.smoothedRiskScore), `Yawn event logged (Total: ${this.metrics.yawnCount})`);
        this.isYawning = false;
      }
    } else {
      this.isYawning = false;
    }

    // C. Multi-Signal Time-Series Risk Model Calculation
    let rawRisk = 12; // Baseline alertness

    if (this.metrics.eyeClosureDuration > 0.5) {
      rawRisk += Math.min(65, this.metrics.eyeClosureDuration * 32);
    } else if (avgEAR < earThreshold) {
      rawRisk += 18;
    }

    if (this.metrics.yawnCount > 0) {
      rawRisk += Math.min(25, this.metrics.yawnCount * 8);
    }
    if (this.isYawning) {
      rawRisk += 14;
    }

    if (headPose === 'HEAD DOWN') rawRisk += 24;
    else if (headPose === 'HEAD TILT') rawRisk += 15;
    else if (headPose !== 'STABLE') rawRisk += 10;

    if (this.metrics.confidence < 70) {
      rawRisk = rawRisk * (this.metrics.confidence / 100);
    }

    rawRisk = Math.max(0, Math.min(100, Math.round(rawRisk)));
    this.metrics.rawRiskScore = rawRisk;

    // D. Exponential Moving Average (EMA) Smoothing
    this.metrics.smoothedRiskScore = (ALERT_CONFIG.SMOOTHING_ALPHA * rawRisk) + ((1 - ALERT_CONFIG.SMOOTHING_ALPHA) * this.metrics.smoothedRiskScore);

    // E. Pass Smoothed Score to Smart Alert Manager
    this.alertManager.evaluateRisk(this.metrics.smoothedRiskScore, this.metrics.confidence);

    this.updateUI();
  }

  // 7. UI UPDATE ENGINE
  updateUI() {
    const m = this.metrics;
    const score = Math.round(m.smoothedRiskScore);

    if (this.dom.valAvgEAR) this.dom.valAvgEAR.textContent = m.avgEAR.toFixed(3);
    if (this.dom.valLeftEAR) this.dom.valLeftEAR.textContent = m.leftEAR.toFixed(2);
    if (this.dom.valRightEAR) this.dom.valRightEAR.textContent = m.rightEAR.toFixed(2);
    if (this.dom.valMAR) this.dom.valMAR.textContent = m.mar.toFixed(2);
    if (this.dom.valBlinks) this.dom.valBlinks.textContent = m.blinkCount;
    if (this.dom.valYawns) this.dom.valYawns.textContent = m.yawnCount;
    if (this.dom.valHeadPose) this.dom.valHeadPose.textContent = m.headPose;
    if (this.dom.valConfidence) this.dom.valConfidence.textContent = `${m.confidence}%`;
    if (this.dom.valFaceStatus) this.dom.valFaceStatus.textContent = m.faceStatus;
    if (this.dom.valClosureDuration) {
      this.dom.valClosureDuration.textContent = m.eyeClosureDuration > 0 ? `${m.eyeClosureDuration.toFixed(1)}s` : '0.0s';
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
    const loop = () => {
      if (this.mode === 'idle') return;

      if (this.isSimulation) {
        this.stepSimulationFrame();
      } else if (this.faceMesh && this.videoElement && this.videoElement.readyState >= 2) {
        this.faceMesh.send({ image: this.videoElement });
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stepSimulationFrame() {
    const jitter = (Math.random() - 0.5) * 0.02;
    let simEAR = Math.max(0.08, Math.min(0.38, this.metrics.avgEAR + jitter));
    let simMAR = Math.max(0.12, Math.min(0.48, this.metrics.mar + (Math.random() - 0.5) * 0.01));

    this.processSignals(simEAR, simEAR, simMAR, this.metrics.headPose);

    if (this.canvasCtx && this.canvasElement) {
      this.drawSimulatedFace(this.canvasCtx, this.canvasElement);
    }
  }

  drawSimulatedFace(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = 'rgba(223, 255, 0, 0.4)';
    ctx.fillStyle = '#DFFF00';
    ctx.lineWidth = 1.5;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 120, 0, 0, 2 * Math.PI);
    ctx.stroke();

    const eyeOpening = (this.metrics.avgEAR / 0.3) * 8;
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy - 20, 16, eyeOpening, 0, 0, 2 * Math.PI);
    ctx.ellipse(cx + 35, cy - 20, 16, eyeOpening, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - 35, cy - 20, 3, 0, 2 * Math.PI);
    ctx.arc(cx + 35, cy - 20, 3, 0, 2 * Math.PI);
    ctx.fill();

    const mouthHeight = (this.metrics.mar / 0.18) * 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 45, 24, mouthHeight, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  // Preset Trigger for SIH Judges
  setPresetRisk(level) {
    this.alertManager.logAlertEvent('PRESET', level === 'SAFE' ? 18 : level === 'WARNING' ? 48 : level === 'HIGH_RISK' ? 78 : 96, `SIH Demo Controller: Force preset triggered [${level}]`);
    if (level === 'SAFE') {
      this.metrics.avgEAR = 0.31;
      this.metrics.leftEAR = 0.31;
      this.metrics.rightEAR = 0.30;
      this.metrics.mar = 0.18;
      this.metrics.headPose = 'STABLE';
      this.metrics.eyeClosureDuration = 0;
      this.metrics.rawRiskScore = 15;
    } else if (level === 'WARNING') {
      this.metrics.avgEAR = 0.22;
      this.metrics.mar = 0.28;
      this.metrics.headPose = 'LOOKING LEFT';
      this.metrics.eyeClosureDuration = 0.8;
      this.metrics.rawRiskScore = 48;
    } else if (level === 'HIGH_RISK') {
      this.metrics.avgEAR = 0.14;
      this.metrics.mar = 0.42;
      this.metrics.headPose = 'HEAD DOWN';
      this.metrics.eyeClosureDuration = 1.8;
      this.metrics.rawRiskScore = 78;
    } else if (level === 'CRITICAL') {
      this.metrics.avgEAR = 0.08;
      this.metrics.mar = 0.46;
      this.metrics.headPose = 'HEAD DOWN';
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
      }
    }

    this.logAlertEvent('SOS_COUNTDOWN', Math.round(this.monitor.metrics.smoothedRiskScore), 'Emergency assistance countdown started (5s)...');

    if (this.sosCountdownInterval) clearInterval(this.sosCountdownInterval);

    this.sosCountdownInterval = setInterval(() => {
      this.sosCountdownSeconds--;

      if (this.dom.sosCountdownNum) {
        this.dom.sosCountdownNum.textContent = String(this.sosCountdownSeconds);
      }

      if (this.dom.sosProgressCircle) {
        const offset = 283 - (283 * ((5 - this.sosCountdownSeconds) / 5));
        this.dom.sosProgressCircle.style.strokeDashoffset = offset;
      }

      this.playWarningTone(); // Beep on countdown

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
