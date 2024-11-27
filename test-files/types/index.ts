export interface Command {
  id: string;
  title: string;
  handler: () => Promise<void>;
}
