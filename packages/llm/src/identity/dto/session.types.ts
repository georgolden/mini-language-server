import { Field, Int, ObjectType } from '@nestjs/graphql';
import { User } from './user.types';

@ObjectType()
export class Session {
  @Field(() => Int)
  id: number;

  @Field()
  token: string;

  @Field({ nullable: true })
  ip?: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field(() => User)
  user: User;

  @Field(() => Int)
  userId: number;

  @Field()
  createdAt: Date;
}
