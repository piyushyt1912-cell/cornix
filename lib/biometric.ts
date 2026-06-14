// Biometric Fingerprint Scanner WebSocket Bridge Service
// Connects to a local Python/native bridge running on ws://localhost:8765

// ── Incoming message types from the bridge ──────────────────────────────────
export interface ScanMessage {
  type: 'scan';
  fingerprintId: string;
  timestamp: number;
}

export interface DeviceStatusMessage {
  type: 'device_status';
  status: 'ready' | 'error' | 'busy';
}

export interface EnrollmentCompleteMessage {
  type: 'enrollment_complete';
  fingerprintId: string;
  personId: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type BridgeMessage =
  | ScanMessage
  | DeviceStatusMessage
  | EnrollmentCompleteMessage
  | ErrorMessage;

// ── Outgoing message types to the bridge ────────────────────────────────────
export interface StartEnrollmentMessage {
  type: 'start_enrollment';
  personId: string;
  personType: string;
}

export interface CancelEnrollmentMessage {
  type: 'cancel_enrollment';
}

export type OutgoingMessage = StartEnrollmentMessage | CancelEnrollmentMessage;

// ── Callback signatures ─────────────────────────────────────────────────────
export type ScanCallback = (fingerprintId: string, timestamp: number) => void;
export type StatusCallback = (status: string) => void;
export type ErrorCallback = (error: Error) => void;
export type EnrollmentCallback = (fingerprintId: string, personId: string) => void;

// ── Connection status ───────────────────────────────────────────────────────
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

// ── Default config ──────────────────────────────────────────────────────────
const DEFAULT_WS_URL = 'ws://localhost:8765';
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;

// ── BiometricService (singleton) ────────────────────────────────────────────
class BiometricService {
  private static instance: BiometricService | null = null;

  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private simulationMode: boolean = false;

  private scanCallbacks: ScanCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private enrollmentCallbacks: EnrollmentCallback[] = [];

  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private currentUrl: string = DEFAULT_WS_URL;

  constructor() {
    if (BiometricService.instance) {
      return BiometricService.instance;
    }
    BiometricService.instance = this;
  }

  // ── Connection methods ──────────────────────────────────────────────────

  /**
   * Connect to the biometric bridge WebSocket server.
   * No-ops when running server-side (Next.js SSR safety).
   */
  connect(url: string = DEFAULT_WS_URL): void {
    if (typeof window === 'undefined') {
      return; // SSR – WebSocket not available
    }

    if (this.simulationMode) {
      return; // simulation mode overrides real connection
    }

    if (this.status === 'connected' || this.status === 'connecting') {
      return; // already connected or in-progress
    }

    this.currentUrl = url;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
        this.setStatus('connected');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (event: Event) => {
        const error = new Error(
          `WebSocket error on ${url}: ${event.type || 'unknown error'}`
        );
        this.notifyError(error);
        // onclose will fire after onerror, which handles status + reconnect
      };
    } catch (err) {
      this.setStatus('disconnected');
      this.notifyError(
        err instanceof Error ? err : new Error(String(err))
      );
      this.scheduleReconnect();
    }
  }

  /**
   * Cleanly disconnect from the bridge.
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.ws) {
      // Remove handlers so the onclose doesn't trigger auto-reconnect
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Return the current connection status.
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Boolean shorthand for connected state.
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  // ── Event registration ──────────────────────────────────────────────────

  /**
   * Register a callback that fires on every fingerprint scan.
   */
  onScan(callback: ScanCallback): void {
    this.scanCallbacks.push(callback);
  }

  /**
   * Register a callback that fires when the device status changes.
   */
  onDeviceStatus(callback: StatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Register a callback that fires on errors.
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Register a callback that fires when enrollment completes.
   */
  onEnrollmentComplete(callback: EnrollmentCallback): void {
    this.enrollmentCallbacks.push(callback);
  }

  /**
   * Remove every registered listener.
   */
  removeAllListeners(): void {
    this.scanCallbacks = [];
    this.statusCallbacks = [];
    this.errorCallbacks = [];
    this.enrollmentCallbacks = [];
  }

  // ── Outgoing messages ───────────────────────────────────────────────────

  /**
   * Ask the bridge to begin fingerprint enrollment for a person.
   */
  startEnrollment(personId: string, personType: string): void {
    this.send({
      type: 'start_enrollment',
      personId,
      personType,
    });
  }

  /**
   * Cancel an in-progress enrollment.
   */
  cancelEnrollment(): void {
    this.send({ type: 'cancel_enrollment' });
  }

  // ── Simulation mode ─────────────────────────────────────────────────────

  /**
   * Enable simulation mode – fakes a connected state without a real device.
   */
  enableSimulation(): void {
    this.simulationMode = true;

    // Tear down any real connection
    if (this.ws) {
      this.disconnect();
    }

    this.setStatus('connected');
  }

  /**
   * Disable simulation mode and revert to disconnected.
   */
  disableSimulation(): void {
    this.simulationMode = false;
    this.setStatus('disconnected');
  }

  /**
   * Produce a fake scan event (useful for dev / demo).
   */
  simulateScan(fingerprintId: string): void {
    if (!this.simulationMode) {
      return;
    }

    const timestamp = Date.now();
    for (const cb of this.scanCallbacks) {
      try {
        cb(fingerprintId, timestamp);
      } catch (err) {
        console.error('[BiometricService] Scan callback threw:', err);
      }
    }
  }

  /**
   * Check whether the service is running in simulation mode.
   */
  isSimulation(): boolean {
    return this.simulationMode;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;

    for (const cb of this.statusCallbacks) {
      try {
        cb(next);
      } catch (err) {
        console.error('[BiometricService] Status callback threw:', err);
      }
    }
  }

  private notifyError(error: Error): void {
    if (this.errorCallbacks.length === 0) {
      console.error('[BiometricService]', error.message);
      return;
    }

    for (const cb of this.errorCallbacks) {
      try {
        cb(error);
      } catch (err) {
        console.error('[BiometricService] Error callback threw:', err);
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    let data: BridgeMessage;

    try {
      data = JSON.parse(event.data as string) as BridgeMessage;
    } catch {
      this.notifyError(new Error(`Invalid JSON from bridge: ${event.data}`));
      return;
    }

    switch (data.type) {
      case 'scan': {
        const { fingerprintId, timestamp } = data;
        for (const cb of this.scanCallbacks) {
          try {
            cb(fingerprintId, timestamp);
          } catch (err) {
            console.error('[BiometricService] Scan callback threw:', err);
          }
        }
        break;
      }

      case 'device_status': {
        for (const cb of this.statusCallbacks) {
          try {
            cb(data.status);
          } catch (err) {
            console.error('[BiometricService] Status callback threw:', err);
          }
        }
        break;
      }

      case 'enrollment_complete': {
        for (const cb of this.enrollmentCallbacks) {
          try {
            cb(data.fingerprintId, data.personId);
          } catch (err) {
            console.error('[BiometricService] Enrollment callback threw:', err);
          }
        }
        break;
      }

      case 'error': {
        this.notifyError(new Error(data.message));
        break;
      }

      default: {
        console.warn(
          '[BiometricService] Unknown message type:',
          (data as Record<string, unknown>).type
        );
      }
    }
  }

  private send(message: OutgoingMessage): void {
    if (this.simulationMode) {
      console.info('[BiometricService][SIM] Would send:', message);
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.notifyError(
        new Error('Cannot send message: WebSocket is not connected')
      );
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (err) {
      this.notifyError(
        err instanceof Error
          ? err
          : new Error(`Failed to send message: ${String(err)}`)
      );
    }
  }

  private scheduleReconnect(): void {
    if (this.simulationMode) return;
    if (this.reconnectInterval) return; // already scheduled
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.notifyError(
        new Error(
          `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Call connect() to retry.`
        )
      );
      return;
    }

    // Exponential back-off: 1s → 2s → 4s → 8s → 16s
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts += 1;

    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.connect(this.currentUrl);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────
export const biometricService = new BiometricService();
export { BiometricService };
