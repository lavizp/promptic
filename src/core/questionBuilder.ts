import inquirer from "inquirer";
import { select } from '@inquirer/prompts';
import { envStore } from "../config/envConfig/envConfig.ts"
import type { Question } from "../core/types.ts";
import { configQuestions } from "../utils/question.ts";
import { EnvStore } from "../config/envConfig/envStore.ts";
export const askQuestions = async (questions: Question[]): Promise<Record<string, string>> => {

  const answer: Record<string, string> = {}

  for (const q of questions) {
    if (q.type === 'input') {
      if (q.when && !q.when({ answers: answer, env: envStore })) {
        continue;
      }
      const res = await inquirer.prompt([
        {
          type: q.type,
          message: q.question,
          name: q.key,
        }
      ])
      answer[q.key] = res[q.key]
      if (q.then) q.then({ value: res[q.key] })
    } else {
      const res = await select({
        message: q.question,
        choices: q.choices
      })
      answer[q.key] = res
      if (q.then) q.then({ value: res })
    }
  }
  return answer
}

export const askConfigQuestions = async () => {
  const answer: Record<string, string> = {};


  const envToCheck =
    { has: () => false }

  for (const q of configQuestions) {
    if (q.type === 'input') {
      if (q.when && !q.when({ answers: answer, env: envToCheck as any })) {
        continue;
      }
      const res = await inquirer.prompt([
        {
          type: q.type,
          message: q.question,
          name: q.key,
        }
      ]);
      answer[q.key] = res[q.key];
      if (q.then) q.then({ value: res[q.key] });

    } else {
      if (q.when && !q.when({ answers: answer, env: envToCheck as any })) {
        continue;
      }

      const res = await select({
        message: q.question,
        choices: q.choices
      });
      answer[q.key] = res;
      if (q.then) q.then({ value: res });
    }
  }
};
