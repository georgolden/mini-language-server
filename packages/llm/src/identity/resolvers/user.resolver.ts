import { Resolver, Query, Context, Args, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../dto/user.types';
import { AuthGuard } from '../guards/auth.guard';
import { GetUserInput, UpdateUserInput } from '../dto/user.input';
import { Context as RequestContext } from '../types/context.types';

@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => User)
  async updateUser(
    @Args('input') input: UpdateUserInput,
    @Context() context: RequestContext,
  ) {
    return this.userService.updateById(context.req.user.id, input);
  }

  @Query(() => [User])
  async users() {
    return this.userService.findAll();
  }

  @Query(() => User, { nullable: true })
  async me(@Context() context: RequestContext) {
    if (!context.req.user) return null;
    return this.userService.findById(context.req.user.id);
  }

  @Query(() => User, { nullable: true })
  async user(@Args('input') input: GetUserInput) {
    return this.userService.findByPermalink(input.userPermalink);
  }
}
