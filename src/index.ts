import { Command } from 'commander';
import { askConfigQuestions } from './core/questionBuilder.ts';

const program = new Command();

program
  .name('promptic')
  .version('1.0.0');


program
  .command('config')
  .action(askConfigQuestions);

program.parse();

