import chalk from 'chalk';

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString().slice(11, 19);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    
    let levelTag:  string;
    let coloredMessage: string;

    switch (level) {
      case 'info':
        levelTag = chalk.blue('[INFO]');
        coloredMessage = message;
        break;
      case 'success':
        levelTag = chalk.green('[OK]');
        coloredMessage = chalk.green(message);
        break;
      case 'warn': 
        levelTag = chalk.yellow('[WARN]');
        coloredMessage = chalk.yellow(message);
        break;
      case 'error':
        levelTag = chalk.red('[ERROR]');
        coloredMessage = chalk. red(message);
        break;
      case 'debug': 
        levelTag = chalk.magenta('[DEBUG]');
        coloredMessage = chalk.gray(message);
        break;
    }

    console.log(`${timestamp} ${levelTag} ${coloredMessage}`);
    
    if (data && process.env.NODE_ENV === 'development') {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  info(message: string, data?: any): void {
    this.formatMessage('info', message, data);
  }

  success(message: string, data?: any): void {
    this.formatMessage('success', message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.formatMessage('error', message, data);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.formatMessage('debug', message, data);
    }
  }

  // Bot işlemleri için özel log
  bot(username: string, action: string, result:  'success' | 'fail' = 'success'): void {
    const icon = result === 'success' ?  '✅' : '❌';
    const color = result === 'success' ?  chalk.green : chalk.red;
    console.log(
      chalk. gray(`[${this.getTimestamp()}]`),
      chalk.cyan(`[${username}]`),
      color(`${icon} ${action}`)
    );
  }
}

export const logger = new Logger();