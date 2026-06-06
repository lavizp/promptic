import { Command } from 'commander';
import { askConfigQuestions } from './core/questionBuilder.ts';
import { runAction } from './cli/index.ts';

const program = new Command();

program
  .name('promptic')
  .version('1.0.0');

program
  .command('run')
  .option('--web')
  .action(() => runAction('web'))
program
  .command('config')
  .action(askConfigQuestions);

program.parse();

