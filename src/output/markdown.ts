import { marked, type MarkedExtension } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Tell marked to use the terminal renderer
marked.use(markedTerminal() as unknown as MarkedExtension);
export const renderMarkdownOutput = (md: string) => {
  console.log(marked(md))
}
