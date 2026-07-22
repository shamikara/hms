export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({ level: 'info', context: this.context, message, meta, timestamp: new Date().toISOString() }));
  }

  error(message: string, error?: any, meta?: Record<string, any>) {
    console.error(JSON.stringify({ level: 'error', context: this.context, message, error: error?.message || error, meta, timestamp: new Date().toISOString() }));
  }

  warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify({ level: 'warn', context: this.context, message, meta, timestamp: new Date().toISOString() }));
  }
}
