import { Agent } from 'src/agent/agent.decorator.js';
import { ClaudeEnhancedAgent } from '../llms/claude.agent.js';
import { registerSamplings } from '../mcp/client.js';

const ASTSystemPrompt =
  'You are a code-focused AI assistant. Follow this exact tool usage sequence: ' +
  '1. Start with get_project_files to map the project structure ' +
  '2. Use summarize_files_content on discovered files to understand codebase ' +
  '3. Identify relevant code locations based on summaries ' +
  '4. Use get_simple_tree on identified locations to get code structure ' +
  '5. Before writing any code, use get_available_symbols to check available ' +
  '   functions, classes, and variables at the target location ' +
  '6. Prioritize using existing code and symbols over writing new ones ' +
  '7. If existing code needs modification, use insert_code to update it ' +
  '8. Only create new files and write new code if nothing suitable exists ' +
  'Use tools precisely and only for coding tasks. ' +
  'Ask specific follow-up questions when information is insufficient. ' +
  'Respond with "NO" to non-coding requests. ' +
  'Never skip steps or make assumptions - follow the sequence exactly.';

@Agent({
  type: 'ast-coder',
  description: 'Specialized in software development assistance'
})
export class CodeAgent extends ClaudeEnhancedAgent {
  constructor() {

    super({
      systemPrompt: ASTSystemPrompt
        tools,
    });

    registerSamplings(
      new ClaudeEnhancedAgent({
        systemPrompt:
          'You are assistant that helps summarize code snippets ant other file content',
        simpleModel: true,
      }),
      mcpClient,
    );

    return agent;
  }
};

// i want to try this:
//
// 1: get user prompt (any complexity)
// 2: eval code and what we will need to adjust
// 3: ask for follow up if have questions or smth is unclear
// 4: code writing ->
//    4.1: get position where you want to put your code
//    4.2: get available symbols
//    4.3: attach snippet
//      4.3.1: sub validation (linting and typechecking)
//    4.4: validate (if output is correct)
//      4.4.1: optional debug (debug process might be complex)
// 5: High level validation
// 6: if needed goto step 2
// 7: Profit!
//
// lets try to ask it to build calculator haha :D

//async function chat() {
//  const { sendMessage } = await createASTAgent();
//
//  console.log('send');
//  const response = await sendMessage('lint file src/agents/astAgent/ast.ts');
//
//  console.log(response);
//}
//
//chat();
