import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { MembersService } from './members.service.js';
import { Member } from './members.model.js';
import { CreateMemberInput } from './members.input.js';

@Resolver(() => Member)
export class MembersResolver {
  constructor(private MembersService: MembersService) {}

  @Query(() => [Member])
  async members() {
    return this.MembersService.findAll();
  }

  @Query(() => Member)
  async member(@Args('id') id: string) {
    return this.MembersService.findOne(id);
  }

  @Mutation(() => Member)
  async createMember(@Args('input') input: CreateMemberInput) {
    return this.MembersService.createMember(input);
  }

  @Mutation(() => Member)
  async updateMemberTools(
    @Args('id') id: string,
    @Args('tools', { type: () => [String] }) tools: string[],
  ) {
    return this.MembersService.updateMemberTools(id, tools);
  }

  @Mutation(() => Member)
  async toggleMemberHistory(
    @Args('id') id: string,
    @Args('enabled') enabled: boolean,
  ) {
    return this.MembersService.toggleHistory(id, enabled);
  }

  @Mutation(() => Member)
  async updateMemberSystemPrompt(
    @Args('id') id: string,
    @Args('systemPrompt') systemPrompt: string,
  ) {
    return this.MembersService.updateSystemPrompt(id, systemPrompt);
  }
}
