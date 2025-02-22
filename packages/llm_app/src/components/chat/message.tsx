import { ContentItemType, type Message } from '../../gql/graphql';
import { formatTimestamp } from '@utils/datetime';

const renderContent = (content: Message['content']) => {
  if (typeof content === 'string') {
    return content;
  }

  return content.map((item, index) => (
    <MessageContent key={`${item.type}-${index}`} item={item} uniqueId={`${item.type}-${index}`} />
  ));
};

const MessageContent = ({ item }: { item: Message['content'][0]; uniqueId: string }) => {
  switch (item.type) {
    case ContentItemType.Text:
      return <div>{item.text}</div>;
    case ContentItemType.ToolUse:
      return (
        <div className="bg-pink-100 dark:bg-pink-900 p-2 rounded-lg my-1">
          <div className="text-xs text-pink-600 dark:text-pink-300">Using tool: {item.name}</div>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(item.input, null, 2)}</pre>
        </div>
      );
    case ContentItemType.ToolResult:
      return (
        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg my-1">
          <div className="text-xs text-green-600 dark:text-green-300">Tool result:</div>
          <div>{item.content}</div>
        </div>
      );
    default:
      return null;
  }
};

export const ChatMessage = ({ message }: { message: Message }) => (
  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
    <div
      className={`max-w-[80%] flex flex-col gap-2 px-4 py-2 rounded-2xl ${
        message.role === 'user'
          ? 'bg-pink-200/90 dark:bg-pink-800/90 rounded-tr-sm'
          : 'bg-white/90 dark:bg-gray-700/90 rounded-tl-sm'
      }`}
    >
      <div className="flex w-full gap-4 items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {message.role === 'user' ? 'Onii-chan' : 'Mochi-chan'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      <div className="break-words">{renderContent(message?.content)}</div>
    </div>
  </div>
);
