// Frontend: do not bundle OpenTelemetry packages in production build.
// Logs are batched and forwarded to the backend via `/api/logs/batch`.
const isDevelopment = import.meta.env.DEV;
let otelEnabled = false;

// Logger utility class
class Logger {
  constructor() {
    this.isAzure = false;
    this.isDevelopment = isDevelopment;
    this.serviceName = 'rms-list-of-values-frontend';
    this.currentUser = null;

    // Batch logs to send to backend (appears in docker-compose logs)
    this.logQueue = [];
    this.batchSize = 20; // Send after 20 logs (reduced network overhead)
    this.batchInterval = 5000; // Send every 5 seconds (was 2s)
    this.batchTimer = null;

    // Start batch timer
    this.startBatchTimer();
  }

  // Start timer to flush logs periodically
  startBatchTimer() {
    this.batchTimer = setInterval(() => {
      this.flushLogs();
    }, this.batchInterval);
  }

  // Send queued logs to backend (non-blocking)
  flushLogs() {
    if (this.logQueue.length === 0) {
      return;
    }

    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    const payload = JSON.stringify({ logs: logsToSend });

    // Use sendBeacon for zero-blocking, guaranteed delivery
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/logs/batch', blob);
      return;
    }

    // Fallback to fetch for older browsers (don't await - fire and forget)
    fetch('/api/logs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {
      // Silently ignore errors - logging failures shouldn't break app
    });
  }

  // Queue log for backend shipping
  // eslint-disable-next-line no-underscore-dangle
  _queueLog(level, message, properties = {}) {
    const timestamp = new Date().toISOString();
    const mergedProps = { ...(this.currentUser ? { user: this.currentUser } : {}), ...properties };

    this.logQueue.push({
      level,
      message,
      properties: mergedProps,
      timestamp,
    });

    // Flush immediately if batch size reached
    if (this.logQueue.length >= this.batchSize) {
      this.flushLogs();
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  _log(level, message, properties = {}) {
    const timestamp = new Date().toISOString();

    // Queue log for backend (docker-compose logs)
    // eslint-disable-next-line no-underscore-dangle
    this._queueLog(level, message, properties);

    // Add log event to active span if OTEL is enabled
    // Frontend does not record span events here; logs are forwarded to backend.

    // Console output disabled - all logs go to docker-compose logs via backend API
    // If you need browser console logs for debugging, set VITE_ENABLE_CONSOLE_LOGS=true
    // (Browser console logs are not persisted and clutter DevTools)
  }

  // Log info messages
  info(message, properties = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('info', message, properties);
  }

  // Log debug messages
  debug(message, properties = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('debug', message, properties);
  }

  // Log warnings
  warn(message, properties = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('warn', message, properties);
  }

  // Log errors
  error(message, error = null, properties = {}) {
    // Build complete error message including stack trace
    let fullMessage = message;

    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    // Append stack trace to main message for Azure KQL visibility
    if (errorDetails && errorDetails.stack) {
      fullMessage = `${message}\n${errorDetails.stack}`;
    } else if (errorDetails && errorDetails.message) {
      fullMessage = `${message}\nError: ${errorDetails.message}`;
    }

    // eslint-disable-next-line no-underscore-dangle
    this._log('error', fullMessage, { error: errorDetails, ...properties });

    // Frontend does not record span exceptions here; logs are forwarded to backend.
  }

  // Track custom events (user actions)
  trackEvent(name, properties = {}) {
    this.debug(`Event: ${name}`, properties);

    // Event tracing is handled server-side; frontend only logs the event.
  }

  // Track metrics (performance, counts)
  trackMetric(name, value, properties = {}) {
    this.debug(`Metric: ${name}: ${value}`, properties);

    // Metrics are recorded server-side when logs are consumed.
  }

  // Track API calls
  trackAPICall(endpoint, method, duration, success, statusCode, error = null) {
    this.info(`API ${method} ${endpoint} - ${statusCode} (${duration}ms)`, {
      endpoint,
      method,
      duration,
      success,
      statusCode,
    });

    // Detailed tracing handled server-side.

    // Track metric for API duration
    this.trackMetric('APICallDuration', duration, { endpoint, method });

    // Track event
    this.trackEvent(`API_${method}`, {
      endpoint,
      success: String(success),
      statusCode: String(statusCode),
      duration: String(duration),
    });
  }

  // Track page views
  trackPageView(name, url = window.location.href, properties = {}) {
    this.info(`Page View: ${name}`, { url, ...properties });

    // Pageview tracing handled server-side.
  }

  // Set user context
  setUser(userId, accountId = null) {
    this.currentUser = { id: userId, accountId };
    this.debug(`Set user context: ${userId}`, { accountId });
  }

  // Clear user context
  clearUser() {
    this.debug('Cleared user context');
  }

  // Helper to flatten properties for span attributes (must be primitives)
  // eslint-disable-next-line class-methods-use-this, no-underscore-dangle
  _flattenProperties(properties) {
    const flattened = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = String(value);
      }
    });
    return flattened;
  }

  // Cleanup: flush remaining logs and stop timer
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushLogs();
  }
}

export const logger = new Logger();
export default logger;

// Flush logs on page unload to avoid losing logs
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.flushLogs();
  });
}
