/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
const documents = {
    "query Test {\n  chats {\n    id\n    title\n    metadata\n  }\n}": types.TestDocument,
    "\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n": types.MeDocument,
    "\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      id\n      email\n      name\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($email: String!, $password: String!, $name: String!) {\n    signUp(email: $email, password: $password, name: $name) {\n      id\n      email\n      name\n    }\n  }\n": types.SignUpDocument,
    "\n  mutation Logout {\n    logout\n  }\n": types.LogoutDocument,
    "\n  query GithubAuth($input: SocialAuthInput!) {\n    githubAuth(input: $input) {\n      id\n      email\n      name\n    }\n  }\n": types.GithubAuthDocument,
    "query GetAllChats { \n  chats {\n    id\n    title\n  }\n}": types.GetAllChatsDocument,
    "\n  query GetChatWithMessages($chatId: Int!) {\n    chat(id: $chatId) {\n      id\n      title\n      type\n      createdAt\n      messages {\n        id\n        content {\n          type\n          text\n          content\n          input\n          name\n          id\n        }\n        role\n        timestamp\n      }\n    }\n  }\n": types.GetChatWithMessagesDocument,
    "\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n": types.CreateChatDocument,
    "\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content {\n        type\n        text\n        content\n        input\n        name\n        id\n      }\n      role\n      timestamp\n      chatId\n    }\n  }\n": types.OnMessageCreatedDocument,
    "\n  mutation SendMessage($chatId: Int!, $content: ContentItemInput!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role)\n  }\n": types.SendMessageDocument,
    "\n  mutation RemoveChat($id: Int!) {\n    removeChat(id: $id)\n  }\n": types.RemoveChatDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Test {\n  chats {\n    id\n    title\n    metadata\n  }\n}"): (typeof documents)["query Test {\n  chats {\n    id\n    title\n    metadata\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      id\n      email\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation SignIn($email: String!, $password: String!) {\n    signIn(email: $email, password: $password) {\n      id\n      email\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignUp($email: String!, $password: String!, $name: String!) {\n    signUp(email: $email, password: $password, name: $name) {\n      id\n      email\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation SignUp($email: String!, $password: String!, $name: String!) {\n    signUp(email: $email, password: $password, name: $name) {\n      id\n      email\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout {\n    logout\n  }\n"): (typeof documents)["\n  mutation Logout {\n    logout\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GithubAuth($input: SocialAuthInput!) {\n    githubAuth(input: $input) {\n      id\n      email\n      name\n    }\n  }\n"): (typeof documents)["\n  query GithubAuth($input: SocialAuthInput!) {\n    githubAuth(input: $input) {\n      id\n      email\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetAllChats { \n  chats {\n    id\n    title\n  }\n}"): (typeof documents)["query GetAllChats { \n  chats {\n    id\n    title\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetChatWithMessages($chatId: Int!) {\n    chat(id: $chatId) {\n      id\n      title\n      type\n      createdAt\n      messages {\n        id\n        content {\n          type\n          text\n          content\n          input\n          name\n          id\n        }\n        role\n        timestamp\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetChatWithMessages($chatId: Int!) {\n    chat(id: $chatId) {\n      id\n      title\n      type\n      createdAt\n      messages {\n        id\n        content {\n          type\n          text\n          content\n          input\n          name\n          id\n        }\n        role\n        timestamp\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n"): (typeof documents)["\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content {\n        type\n        text\n        content\n        input\n        name\n        id\n      }\n      role\n      timestamp\n      chatId\n    }\n  }\n"): (typeof documents)["\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content {\n        type\n        text\n        content\n        input\n        name\n        id\n      }\n      role\n      timestamp\n      chatId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendMessage($chatId: Int!, $content: ContentItemInput!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role)\n  }\n"): (typeof documents)["\n  mutation SendMessage($chatId: Int!, $content: ContentItemInput!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveChat($id: Int!) {\n    removeChat(id: $id)\n  }\n"): (typeof documents)["\n  mutation RemoveChat($id: Int!) {\n    removeChat(id: $id)\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;