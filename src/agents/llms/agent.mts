import OpenAI from "openai";

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VectorizedMessage extends Message {
  embedding?: number[];
  relevanceScore?: number;
}

export abstract class Agent {
  protected systemPrompt: string;
  protected memoryWindow: number;
  protected conversationHistory: Message[] = [];

  constructor(systemPrompt: string, memoryWindow: number = 10) {
    this.systemPrompt = systemPrompt;
    this.memoryWindow = memoryWindow;
  }

  protected addMessage(role: Message['role'], content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    });
  }

  protected getRecentMessages(): Message[] {
    return this.conversationHistory.slice(-this.memoryWindow);
  }

  abstract formatMessages(messages: Message[]): unknown;

  abstract sendMessage(message: string): Promise<string>;

  clearMemory(): void {
    this.conversationHistory = [];
  }

  updateSystemPrompt(newPrompt: string): void {
    this.systemPrompt = newPrompt;
  }
}


export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
}

// OpenAI implementation example
export class OpenAIEmbedding implements EmbeddingService {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    return response.data[0].embedding;
  }
}

// Our enhanced agent with injectable embedding service
export abstract class EnhancedAgent extends Agent {
  protected vectorizedHistory: VectorizedMessage[] = [];
  private embeddingService: EmbeddingService;
  private similarityThreshold: number;

  constructor(
    systemPrompt: string,
    embeddingService: EmbeddingService,
    memoryWindow: number = 10,
    similarityThreshold: number = 0.7,
  ) {
    super(systemPrompt, memoryWindow);
    this.embeddingService = embeddingService;
    this.similarityThreshold = similarityThreshold;
  }

  protected async vectorizeMessage(message: Message): Promise<VectorizedMessage> {
    const embedding = await this.embeddingService.embed(message.content);
    return { ...message, embedding };
  }

  protected override async addMessage(role: Message['role'], content: string): Promise<void> {
    const vectorizedMessage = await this.vectorizeMessage({ role, content, timestamp: new Date() });
    this.vectorizedHistory.push(vectorizedMessage);
  }

  protected async getRelevantMessages(query: string): Promise<Message[]> {
    const queryEmbedding = await this.embeddingService.embed(query);

    // Calculate similarity scores
    const scoredMessages = this.vectorizedHistory.map(msg => ({
      ...msg,
      relevanceScore: msg.embedding
        ? this.cosineSimilarity(queryEmbedding, msg.embedding)
        : 0
    }));

    // Filter by threshold and sort by relevance
    return scoredMessages
      .filter(msg => msg.relevanceScore! > this.similarityThreshold)
      .sort((a, b) => (b.relevanceScore! - a.relevanceScore!))
      .slice(0, this.memoryWindow);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async sendMessage(message: string): Promise<string> {
    await this.addMessage('user', message);

    // Get relevant context based on the current message
    const relevantMessages = await this.getRelevantMessages(message);
    const formattedMessages = this.formatMessages(relevantMessages);

    const response = await this.sendToLLM(formattedMessages);
    await this.addMessage('assistant', response);

    return response;
  }

  protected abstract sendToLLM(formattedMessages: unknown): Promise<string>;
}


