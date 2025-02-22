import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Member {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  systemPrompt: string;

  @Field(() => [String])
  tools: string[];

  @Field()
  hasHistoryEnabled: boolean;

  @Field()
  createdAt: Date;
}
