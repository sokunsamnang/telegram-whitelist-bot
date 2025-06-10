const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile = './data/bot.log') {
    this.logFile = logFile;
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    const logString = `[${timestamp}] ${level}: ${message}${data ? ` - ${JSON.stringify(data)}` : ''}\n`;
    
    // Console output with colors
    const colors = {
      INFO: '\x1b[36m',  // Cyan
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      SUCCESS: '\x1b[32m', // Green
      RESET: '\x1b[0m'
    };

    console.log(`${colors[level] || ''}${logString.trim()}${colors.RESET}`);

    // File output
    try {
      fs.appendFileSync(this.logFile, logString);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  success(message, data = null) {
    this.log('SUCCESS', message, data);
  }

  clearLog() {
    try {
      fs.writeFileSync(this.logFile, '');
      this.info('Log file cleared');
    } catch (error) {
      this.error('Failed to clear log file', error);
    }
  }
}

module.exports = Logger; 