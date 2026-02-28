import { LoggerService, LogLevel } from '@nestjs/common';

export class JsonLoggerService implements LoggerService {
  log(message: any, context?: string) {
    this.writeLog('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeLog('error', message, context, { trace });
  }

  warn(message: any, context?: string) {
    this.writeLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.writeLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.writeLog('verbose', message, context);
  }

  setLogLevels(_levels: LogLevel[]) {
    // no-op
  }

  private writeLog(level: string, message: any, context?: string, extra?: Record<string, any>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...extra,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}
