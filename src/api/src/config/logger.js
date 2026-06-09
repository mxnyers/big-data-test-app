import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);

const isDevelopment = process.env.NODE_ENV !== 'production';

// Set resource attributes via environment variables (OTEL standard)
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'nyte-dawg-poc-api';
process.env.OTEL_SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || '0.1.0';

// Initialize OpenTelemetry with OTLP (ADOT) for AWS or local collector
let sdk;
try {
  const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.AWS_ADOT_COLLECTOR_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_HTTP_ENDPOINT || 'http://host.docker.internal:4318/v1/traces';

  // Log intent
  console.info('Initializing OpenTelemetry (OTLP) with exporter URL:', collectorUrl);

  // Create OTLP exporter for traces (ADOT/collector)
  const traceExporter = new OTLPTraceExporter({ url: collectorUrl });

  // Build Node SDK with auto-instrumentations
  sdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
  });

  // Start SDK; handle both sync and async starts safely
  try {
    const startResult = sdk.start && sdk.start();
    if (startResult && typeof startResult.then === 'function') {
      startResult.then(() => console.info('OpenTelemetry started, exporter:', collectorUrl))
        .catch((err) => console.error('OpenTelemetry failed to start (async):', err && err.stack ? err.stack : err));
    } else {
      console.info('OpenTelemetry started (sync), exporter:', collectorUrl);
    }
  } catch (startErr) {
    console.error('OpenTelemetry SDK start failed:', startErr && startErr.stack ? startErr.stack : startErr);
    // best-effort: leave sdk assigned but note failures in logs
  }
} catch (err) {
  // Non-fatal: log the error and continue running the API without tracing
  console.error('OpenTelemetry initialization skipped/failed', err && err.stack ? err.stack : err);
  sdk = undefined;
}

// Get tracer instance
const tracer = trace.getTracer('nyte-dawg-poc-api', process.env.npm_package_version || '0.1.0');

// Logger class to maintain compatibility with existing code
class Logger {
  constructor() {
    this.serviceName = 'nyte-dawg-poc-api';
    // ensure log directory exists and open a file for append
    try {
      const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      this.logFile = path.join(logDir, 'api.log');
    } catch (e) {
      // fallback - if file access fails, leave undefined and continue
      this.logFile = undefined;
    }
  }

   
  _log(level, message, attributes = {}) {
    const span = trace.getActiveSpan();
    const timestamp = new Date().toISOString();
    
    // Format log message for console
    const logData = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...attributes,
    };
    // Persist structured log to file when available
    try {
      if (this.logFile) {
        fs.appendFile(this.logFile, JSON.stringify(logData) + '\n', (err) => {
          // swallow errors to avoid affecting request flow
        });
      } else if (isDevelopment) {
        // last-resort fallback to console in development
        console.log(`${timestamp} [${level.toUpperCase()}] ${message}`, attributes);
      }
    } catch (e) {
      if (isDevelopment) console.error('Failed to write log file', e);
    }

    // Add event to active span if exists
    if (span) {
      const flattenedAttrs = {};
      Object.entries(attributes).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          flattenedAttrs[key] = JSON.stringify(value);
        } else if (value !== undefined && value !== null) {
          flattenedAttrs[key] = String(value);
        }
      });
      span.addEvent(`log.${level}`, {
        'log.message': message,
        'log.level': level,
        ...flattenedAttrs,
      });
    }
  }

  debug(message, attributes = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('debug', message, attributes);
  }

  info(message, attributes = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('info', message, attributes);
  }

  warn(message, attributes = {}) {
    // eslint-disable-next-line no-underscore-dangle
    this._log('warn', message, attributes);
  }

  error(data, message = '') {
    // Support both error(message, attributes) and error({ err }, message) patterns
    let attributes = {};
    let msg = message;

    if (typeof data === 'object' && data.err) {
      attributes = { ...data };
      const { err } = data;
      if (err instanceof Error) {
        // Include full stack trace in main message for Azure KQL visibility
        msg = message ? `${message}\n${err.stack || err.message}` : err.stack || err.message;
        attributes.error = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
      }
    } else if (typeof data === 'string') {
      msg = data;
      if (typeof message === 'object') {
        attributes = message;
        // Check if attributes contain an error
        if (attributes.error instanceof Error) {
          msg = `${data}\n${attributes.error.stack || attributes.error.message}`;
          attributes.error = {
            name: attributes.error.name,
            message: attributes.error.message,
            stack: attributes.error.stack,
          };
        }
      }
    }

    // eslint-disable-next-line no-underscore-dangle
    this._log('error', msg, attributes);

    // Record error in active span
    const span = trace.getActiveSpan();
    if (span && attributes.err instanceof Error) {
      span.recordException(attributes.err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: msg });
    } else if (span && attributes.error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: msg });
    }
  }

  // Maintain pino-http compatibility
  // eslint-disable-next-line no-unused-vars
  child(bindings) {
    return this;
  }
}

export const logger = new Logger();

// Custom function to track events
export function trackEvent(name, properties = {}) {
  const span = tracer.startSpan(`event.${name}`, {
    attributes: {
      'event.name': name,
      ...properties,
    },
  });
  
  logger.info(`Event: ${name}`, { event: name, ...properties });
  
  span.end();
}

// Custom function to track metrics
export function trackMetric(name, value, properties = {}) {
  logger.info(`Metric: ${name}`, { metric: name, value, ...properties });
  
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(`metric.${name}`, value);
    Object.entries(properties).forEach(([key, val]) => {
      span.setAttribute(`metric.${name}.${key}`, val);
    });
  }
}

// Custom function to track dependencies
export function trackDependency(name, data, duration, resultCode, success) {
  const span = tracer.startSpan(`dependency.${name}`, {
    attributes: {
      'dependency.name': name,
      'dependency.data': data,
      'dependency.duration': duration,
      'dependency.resultCode': resultCode,
      'dependency.success': success,
    },
  });

  logger.debug(`Dependency: ${name}`, { dependency: name, duration, resultCode, success });

  if (!success) {
    span.setStatus({ code: SpanStatusCode.ERROR });
  }

  span.end();
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (sdk) {
    await sdk.shutdown();
  }
});

// Expose a safe shutdown helper for external callers
export async function shutdownTracing() {
  if (sdk && typeof sdk.shutdown === 'function') {
    try {
      await sdk.shutdown();
    } catch (e) {
      // Best-effort shutdown; don't throw
      console.warn('Error shutting down OpenTelemetry SDK', e && e.message ? e.message : e);
    }
  }
}

export { tracer, context, trace };
export default logger;
