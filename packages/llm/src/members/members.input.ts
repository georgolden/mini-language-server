import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateMemberInput {
  @Field()
  name: string;

  @Field()
  systemPrompt: string;

  @Field(() => [String])
  tools: string[];

  @Field({ defaultValue: true })
  hasHistoryEnabled?: boolean;
}
