import { Agent } from './agent';
import Anthropic from "@anthropic-ai/sdk";

const initClaude = async () => {
  const anthropic = new Anthropic({
  });

  const msg = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2048,
    system:
      ['Prompt'].join(
        '\n',
      ),
    messages: [{ role: 'user', content: 'Hello, Claude' }],
  })

  console.log(msg)
}

initClaude()


export class ClaudeAgent extends Agent {
  private client: Anthropic;

  constructor(
    systemPrompt: string,
    client: Anthropic,
    memoryWindow: number = 10
  ) {
    super(systemPrompt, memoryWindow);
    this.client = client;
  }

  formatMessages(messages: Message[]): any {
    return {
      model: "claude-3-opus-20240229",
      messages: [
        { role: "system", content: this.systemPrompt },
        ...messages.map(({ role, content }) => ({
          role,
          content
        }))
      ]
    };
  }

  async sendMessage(message: string): Promise<string> {
    this.addMessage('user', message);
    
    const formattedMessages = this.formatMessages(this.getRecentMessages());
    const response = await this.client.messages.create(formattedMessages);
    
    this.addMessage('assistant', response.content);
    return response.content;
  }
}
