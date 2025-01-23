import { useLoadableQuery, useMutation, useSubscription, useSuspenseQuery } from '@apollo/client';

import { gql } from '../../__generated__/gql';
import { useState } from 'react';

const READ_CHATS = gql(/* GraphQL */ `query GetAllChats { 
  chats {
    id
    title
  }
}`);

export const SELECT_CHAT = gql(/* GraphQL */ `
  query GetChatWithMessages($chatId: Int!) {
    chat(id: $chatId) {
      id
      title
      type
      createdAt
      messages {
        id
        content {
          type
          text
          content
          input
          name
          id
        }
        role
        timestamp
      }
    }
  }
`);

const CREATE_CHAT = gql(/* GraphQL */ `
mutation CreateChat($title: String!, $type: String!) {
  createChat(title: $title, type: $type) {
    id
    title
    type
    createdAt
    metadata
  }
}
`);

const MESSAGE_SUBSCRIPTION = gql(/* GraphQL */ `
  subscription OnMessageCreated($chatId: Int!) {
    messageCreated(chatId: $chatId) {
      id
      content {
        type
        text
        content
        input
        name
        id
      }
      role
      timestamp
      chatId
    }
  }
`);

const SEND_MESSAGE_MUTATION = gql(/* GraphQL */ `
  mutation SendMessage($chatId: Int!, $content: ContentItemInput!, $role: String!) {
    sendMessage(chatId: $chatId, content: $content, role: $role) {
      id
      content {
        type
        text
        content
        input
        name
        id
      }
      role
      timestamp
      chatId
    }
  }
`);

export const useReadChats = () => {
  const { data } = useSuspenseQuery(READ_CHATS);

  return { chats: data?.chats ?? [] };
};

export const useSelectChat = () => {
  const [loadData, queryRef] = useLoadableQuery(SELECT_CHAT);
  const selectChat = (id: number) => {
    loadData({ chatId: id });
  };

  return { queryRef, selectChat };
};

export const useSubscribeChat = ({ chatId, onCompleted, defaultMessages }) => {
  const [messages, setMessages] = useState<any[]>(defaultMessages);

  const { error: subError } = useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { chatId },
    onError: (error) => console.error('Subscription failed:', error),
    onData: ({ data }) => {
      if (data?.data?.messageCreated) {
        setMessages((prev) => [...prev, data?.data?.messageCreated]);
      }
    },
  });

  const [sendMessage, { error: mutationError }] = useMutation(SEND_MESSAGE_MUTATION, {
    onError: (error) => console.error('Message send failed:', error),
    onCompleted,
  });

  return { sendMessage, messages };
};

export const useCreateChat = () => {
  const [createChat] = useMutation(CREATE_CHAT, { onError: console.error });

  return { createChat };
};
