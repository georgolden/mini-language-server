import React, { Suspense, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

import Modal from '@components/modal';
import { useCreateChat } from '@hooks/apollo/chat';
import { ModelSelect } from './model.select';

export const ChatCreation = ({ isCollapsed }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('default');
  const [description, setDescription] = useState('');

  const { createChat } = useCreateChat();

  const handleCreateChat = () => {
    if (!title) return;

    createChat({
      variables: {
        title,
        type,
      },
    });

    setTitle('');
    setType('default');
  };

  return (
    <>
      <button
        type="submit"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-2 h-12
                       bg-pink-400 dark:bg-pink-700 text-white rounded-lg
                       hover:bg-pink-500 dark:hover:bg-pink-700 
                       disabled:opacity-50 transition-colors"
      >
        <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
          <Plus size={24} />
        </Suspense>
        {isCollapsed ? '' : 'Create Chat'}
      </button>
      <Modal title="Create new chat" onClose={() => setModalOpen(false)} isOpen={isModalOpen}>
        <form className="flex gap-4 flex-col" onSubmit={handleCreateChat}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New chat title..."
            className="w-full px-3 py-2 rounded-lg border-2 border-pink-200 
                       dark:border-pink-700 dark:bg-gray-900 dark:text-white 
                       focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
          />
          <ModelSelect value={undefined} onChange={console.log} />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-pink-200 
             dark:border-pink-700 dark:bg-gray-900 dark:text-white
             focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
          >
            <option value="default">Default Chat</option>
            <option value="programming">Programming Workspace</option>
          </select>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="New chat description..."
            className="resize-none w-full px-3 py-2 rounded-lg border-2 border-pink-200 
                       dark:border-pink-700 dark:bg-gray-900 h-32 dark:text-white
                       focus:outline-none focus:border-pink-400 dark:focus:border-pink-500"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       bg-pink-400 dark:bg-pink-700 text-white rounded-lg
                       hover:bg-pink-500 dark:hover:bg-pink-700 
                       disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </form>
      </Modal>
    </>
  );
};
