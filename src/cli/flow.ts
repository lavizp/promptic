
import inquirer from "inquirer";
import { questions } from "./question.ts";

import { select } from '@inquirer/prompts';
import { envStore } from "../config/envConfig/envConfig.ts"
export const askQuestions = async (): Promise<Record<string, string>> => {

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
