import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Message {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  chatId: number;

  @Field()
  content: string;

  @Field()
  role: string;

  @Field()
  timestamp: Date;
}

@ObjectType()
export class Chat {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field()
  type: string;

  @Field()
  metadata: string;

  @Field()
  createdAt: Date;

  @Field(() => [Message])
  messages: Message[];
}
