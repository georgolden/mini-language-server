Decoupling - abstract from communication layer - make ws layer tiny shit
Clean Architecture - Code Structure - you can also ask Claude provide files and mention for code refactoring 
 - follow clean code best practices 
 - or implement separation of concern principle 
 - or use layered architecture and specify how
ADD DOCUMENTATION for this code - ask Claude provide files

Core features Georg edition:

1. MCP Tools to able to extract files source code or for optimization code cunks
2. Prompt and automation to analyze project and get it's structure, depndencies and generate some root context
3. Tools to connect tasks to the project for e.g. GitHub Project will be nice to have
4. Chat to add additional context like discussions fragments or other requirements related to task and to add task description
5. I want to be able to reason about the possible implementations and ask and expect questions not only code generation
 - I need to explicitely ask about code generation and project modifications related to task
6. Tools to run tests, build, lint.
7. For tests:
 - run tests if ok do nothing
 - if failed - add debugging messages to the part related to failures and run tests again and ask llm to fix and apply fixes without commit
8. Ability to undo session completely and start from scratch.
9. Track documentation and test coverage
