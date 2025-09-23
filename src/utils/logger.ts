import chalk from 'chalk';

export class Logger {
  static info(message: string, ...args: any[]) {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  static success(message: string, ...args: any[]) {
    console.log(chalk.green('✅'), message, ...args);
  }

  static warning(message: string, ...args: any[]) {
    console.log(chalk.yellow('⚠️'), message, ...args);
  }

  static error(message: string, error?: Error) {
    console.log(chalk.red('❌'), message);
    if (error) {
      console.log(chalk.red('   Error:'), error.message);
      if (process.env.NODE_ENV === 'development') {
        console.log(chalk.gray(error.stack));
      }
    }
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  static box(title: string, content?: string[]) {
    const width = 60;
    const titleLine = `║ ${title.padEnd(width - 4)} ║`;

    console.log(chalk.blue('╔' + '═'.repeat(width - 2) + '╗'));
    console.log(chalk.blue(titleLine));

    if (content && content.length > 0) {
      console.log(chalk.blue('╠' + '═'.repeat(width - 2) + '╣'));
      content.forEach(line => {
        const contentLine = `║ ${line.padEnd(width - 4)} ║`;
        console.log(chalk.blue(contentLine));
      });
    }

    console.log(chalk.blue('╚' + '═'.repeat(width - 2) + '╝'));
  }
}