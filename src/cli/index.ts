import 'dotenv/config';
import { questions } from '../utils/question.ts';
import { askQuestions } from '../core/questionBuilder.ts';
const answers = await askQuestions(questions)
