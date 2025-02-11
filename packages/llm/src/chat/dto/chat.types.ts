import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

enum ContentItemType {
  TEXT = 'text',
  TOOL_USE = 'tool_use',
  TOOL_RESULT = 'tool_result',
}

registerEnumType(ContentItemType, {
  name: 'ContentItemType',
});

@ObjectType()
export class ContentItem {
  @Field(() => ContentItemType)
  type: ContentItemType;

  @Field(() => String, { nullable: true })
  text?: string;

  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  input?: string;

  @Field(() => String, { nullable: true })
  content?: string;
}

@InputType()
export class ContentItemInput {
  @Field(() => ContentItemType)
  type: ContentItemType;

  @Field(() => String, { nullable: true })
  text?: string;

  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  input?: string;

  @Field(() => String, { nullable: true })
  content?: string;
}

@ObjectType()
export class Message {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  chatId: number;

  @Field(() => [ContentItem])
  content: ContentItem[];

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

  @Field(() => Int)
  userId: number;

  @Field()
  metadata: string;

  @Field()
  modelName: string;

  @Field()
  provider: string;

  @Field()
  createdAt: Date;

  @Field(() => [Message])
  messages: Message[];
}
