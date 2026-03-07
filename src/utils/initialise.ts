import chalk from "chalk";
import { pathConfig } from "../config/rootPathConfig.js";
import inquirer from "inquirer";

export function InitialiseApp() {
  //TODO: First check if config has required values
  //If empty, ask all the details, if not just ask whats missing(Optionla)
  
  const api_key = pathConfig.get('api_key')
  if (!api_key) {
    console.log(chalk.green('API Key not present'))
  }
  inquirer.prompt("asd")
}