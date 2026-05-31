import inquirer from 'inquirer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { select, Separator } from '@inquirer/prompts';
//TODO: What are the initial questions
//1. AI Provided(OpenAI, Claude, Gemini, Groq)
//2. API Key(if not present in the env)
//3. Prompt
//4. Extra questions(If AI has any)
//5. What kind of output they want(descriptive, ....)
//6. Output Format (terminal, copy to clipboard, .md file)
//async function run() {
// const answers = await askQuestions();

//const prompt = buildPrompt(answers);

//const result = await ai.generate(prompt);

//const md = toMarkdown(answers, result);

//saveFile(md);
//console.log(chalk.green("Done! Output saved to output.md"));
//}
export async function run() {
  console.log(chalk.cyan.bold("\n--- Welcome to My CLI Tool ---\n"));

  const answer = await select({
    message: 'Select a package manager',
    choices: [
      {
        name: 'npm',
        value: 'npm',
        description: 'npm is the most popular package manager',
      },
      {
        name: 'yarn',
        value: 'yarn',
        description: 'yarn is an awesome package manager',
      },
      new Separator(),
      {
        name: 'jspm',
        value: 'jspm',
        disabled: true,
      },
      {
        name: 'pnpm',
        value: 'pnpm',
        disabled: '(pnpm is not available)',
      },
    ],
  });
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
      choices: [
        { name: 'TypeScript', value: 'ts' },
        { name: 'JavaScript', value: 'js' },
        { name: 'CoffeeScript (wait, why?)', value: 'coffee' },
      ],
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
