import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetUserInput {
  @Field(() => String)
  userPermalink: string;
}

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  bio?: string;
}
