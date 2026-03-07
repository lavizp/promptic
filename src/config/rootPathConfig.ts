import Conf from "conf"
import { envConfig } from "./envConfig.js"

export const pathConfig = new Conf({projectName: envConfig.get('PROJECT_NAME')})