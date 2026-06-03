import Conf from 'conf';

export class EnvStore {
  private config: Conf<Record<string, string>>;

  constructor() {
    this.config = new Conf<Record<string, string>>({
      projectName: 'prompt-enhancer',
    });
  }

  get(key: string): string | undefined {
    return this.config.get(key);
  }

  set(key: string, value: string): void {
    this.config.set(key, value);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.config.delete(key);
  }

  getAll(): Record<string, string> {
    return this.config.store;
  }
  getStore(): Conf<Record<string, string>> { return this.config }
}
