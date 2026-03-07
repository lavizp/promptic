interface EnvSchema{
  PROJECT_NAME: string
}
export class EnvConfig{
  private static instance: EnvConfig
  private readonly values: EnvSchema
  
  private constructor() {
    this.values = this.validateAndLoad()
  }
  private validateAndLoad(): EnvSchema {
      const required: (keyof EnvSchema)[] = ['PROJECT_NAME'];
      const loadedConfig = {} as EnvSchema;
  
      for (const key of required) {
        const value = process.env[key];
  
        if (!value) {
          console.error(`\x1b[31m[FATAL]: Missing Env Var: ${key}\x1b[0m`);
          process.exit(1); 
        }
  
        loadedConfig[key] = value as any; 
      }
  
      return Object.freeze(loadedConfig);
    }
    public static getInstance(): EnvConfig {
        if (!EnvConfig.instance) {
          EnvConfig.instance = new EnvConfig();
        }
        return EnvConfig.instance;
    }
  public get<K extends keyof EnvSchema>(key: K): EnvSchema[K]{
      return this.values[key]
    }
}
export const envConfig = EnvConfig.getInstance()