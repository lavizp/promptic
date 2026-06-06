import { Command } from 'commander';
import { askConfigQuestions } from './core/questionBuilder.ts';
import { runAction } from './cli/index.ts';
import { runMain } from 'node:module';

const program = new Command();

program
  .name('promptic')
  .version('1.0.0');
program
  .command('runa')
  .option('--web', 'Run in web mode')
  .action((_, cmd) => {
    console.log(_)
    //runAction(options.web ? 'web' : 'normal');
  });
program
  .command('run')
  .option('--web', 'Run in web mode')
  .action((options) => {
    console.log(options)
    runAction(options.web ? 'web' : 'normal')
  });
program
  .command('config')
  .action(askConfigQuestions);

program.parse();

