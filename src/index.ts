import inquirer from 'inquirer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

export async function run() {
  console.log(chalk.cyan.bold("\n--- Welcome to My CLI Tool ---\n"));

  const answers = await inquirer.prompt([
    {
      type: 'prompt',
      name: 'Initial Prompt',
      message: 'Enter the Initial Prompt',
      default: '',
      validate: (input) => input.length > 0 ? true : 'Project name cannot be empty.'
    },
    {
      type: 'list',
      name: 'language',
      message: 'Which language do you prefer?',
      choices: ['TypeScript', 'JavaScript', 'CoffeeScript (wait, why?)'],
    },
    {
      type: 'confirm',
      name: 'gitInit',
      message: 'Would you like to initialize a git repository?',
      default: true
    }
  ]);

  // Using the results
  console.log(chalk.green(`\n🚀 Setting up ${chalk.bold(answers.projectName)}...`));

  if (answers.language === 'TypeScript') {
    console.log(chalk.blue("Good choice! TypeScript is awesome."));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
