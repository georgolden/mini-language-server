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
    "query GetAllChats { \n  chats {\n    id\n    title\n  }\n}": types.GetAllChatsDocument,
    "\nquery GetChatWithMessages($chatId: Int!) {\n  chat(id: $chatId) {\n    id\n    title\n    type\n    createdAt\n    messages {\n      id\n      content\n      role\n      timestamp\n    }\n  }\n}\n": types.GetChatWithMessagesDocument,
    "\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n": types.CreateChatDocument,
    "\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n": types.OnMessageCreatedDocument,
    "\n  mutation SendMessage($chatId: Int!, $content: String!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n": types.SendMessageDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "query GetAllChats { \n  chats {\n    id\n    title\n  }\n}"): (typeof documents)["query GetAllChats { \n  chats {\n    id\n    title\n  }\n}"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\nquery GetChatWithMessages($chatId: Int!) {\n  chat(id: $chatId) {\n    id\n    title\n    type\n    createdAt\n    messages {\n      id\n      content\n      role\n      timestamp\n    }\n  }\n}\n"): (typeof documents)["\nquery GetChatWithMessages($chatId: Int!) {\n  chat(id: $chatId) {\n    id\n    title\n    type\n    createdAt\n    messages {\n      id\n      content\n      role\n      timestamp\n    }\n  }\n}\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n"): (typeof documents)["\nmutation CreateChat($title: String!, $type: String!) {\n  createChat(title: $title, type: $type) {\n    id\n    title\n    type\n    createdAt\n    metadata\n  }\n}\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n"): (typeof documents)["\n  subscription OnMessageCreated($chatId: Int!) {\n    messageCreated(chatId: $chatId) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SendMessage($chatId: Int!, $content: String!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n"): (typeof documents)["\n  mutation SendMessage($chatId: Int!, $content: String!, $role: String!) {\n    sendMessage(chatId: $chatId, content: $content, role: $role) {\n      id\n      content\n      role\n      timestamp\n      chatId\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;