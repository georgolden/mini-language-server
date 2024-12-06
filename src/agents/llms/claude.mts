import OpenAI from 'openai';
import { EmbeddingService, EnhancedAgent, Message, OpenAIEmbedding } from './agent.mts';
import Anthropic from "@anthropic-ai/sdk";

const initClaude = async () => {
  const anthropic = new Anthropic({
    apiKey: ''
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

export class ClaudeEnhancedAgent extends EnhancedAgent {
  private client: Anthropic;

  constructor(
    systemPrompt: string,
    client: Anthropic,
    embeddingService: EmbeddingService,
    memoryWindow: number = 10,
    similarityThreshold: number = 0.7
  ) {
    super(systemPrompt, embeddingService, memoryWindow, similarityThreshold);
    this.client = client;
  }

  formatMessages(messages: Message[]): any {
    return {
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: messages.map(({ role, content }) => ({
        role,
        content
      }))
    };
  }

  protected override async sendToLLM(formattedMessages: any): Promise<string> {
    const response = await this.client.messages.create(formattedMessages);
    return response.content[0].text;
  }
}

const openAIClient = new OpenAI({
  apiKey: ''
});
const embeddingService = new OpenAIEmbedding(openAIClient);
const claudeClient = new Anthropic({
  apiKey: '',
});

const agent = new ClaudeEnhancedAgent(
  "Be a helpful AI assistant",
  claudeClient,
  embeddingService
);

async function chat() {
  const response = await agent.sendMessage("Tell me about cats!");
  console.log(response);
}

chat()
