import { useLoadableQuery, useMutation, useSubscription, useSuspenseQuery } from '@apollo/client';
import { useEffect, useState } from 'react';

import type {
  GetAllChatsQuery,
  GetChatWithMessagesQuery,
  CreateChatMutation,
  OnMessageCreatedSubscription,
  SendMessageMutation,
  Message,
} from '../../gql/graphql';
import { graphql } from '../../gql';

const READ_CHATS = graphql(`query GetAllChats { 
  chats {
    id
    title
  }
}`);

export const SELECT_CHAT = graphql(/* GraphQL */ `
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

const CREATE_CHAT = graphql(/* GraphQL */ `
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

const MESSAGE_SUBSCRIPTION = graphql(/* GraphQL */ `
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

const SEND_MESSAGE_MUTATION = graphql(/* GraphQL */ `
  mutation SendMessage($chatId: Int!, $content: ContentItemInput!, $role: String!) {
    sendMessage(chatId: $chatId, content: $content, role: $role)
  }
`);

const DELETE_CHAT = graphql(/* GraphQL */ `
  mutation RemoveChat($id: Int!) {
    removeChat(id: $id)
  }
`);

export const useReadChats = () => {
  const { data } = useSuspenseQuery<GetAllChatsQuery>(READ_CHATS);
  return { chats: data?.chats ?? [] };
};

export const useSelectChat = () => {
  const [loadData, queryRef] = useLoadableQuery<GetChatWithMessagesQuery>(SELECT_CHAT);
  const selectChat = (id: number) => {
    loadData({ chatId: id });
  };
  return { queryRef, selectChat };
};

interface SubscribeChatProps {
  chatId: number;
  onCompleted: () => void;
}

export const useSubscribeChat = ({ chatId, onCompleted }: SubscribeChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([]);
  }, [chatId]);

  useSubscription<OnMessageCreatedSubscription>(MESSAGE_SUBSCRIPTION, {
    variables: { chatId, limit: 20 },
    onError: (error) => console.error('Subscription failed:', error),
    onData: ({ data }) => {
      console.log(data);
      if (data?.data?.messageCreated) {
        setMessages((prev) => [...prev, data.data.messageCreated]);
      }
    },
  });

  const [sendMessage] = useMutation<SendMessageMutation>(SEND_MESSAGE_MUTATION, {
    onError: (error) => console.error('Message send failed:', error),
    onCompleted,
  });

  return { sendMessage, messages };
};

export const useCreateChat = () => {
  const [createChat] = useMutation<CreateChatMutation>(CREATE_CHAT);
  return { createChat };
};

export const useDeleteChat = () => {
  const [deleteChat] = useMutation(DELETE_CHAT);
  return {
    deleteChat: (id: number) =>
      deleteChat({
        variables: { id },
        refetchQueries: [READ_CHATS],
      }),
  };
};
