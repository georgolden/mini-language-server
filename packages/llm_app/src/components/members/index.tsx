import { useState } from 'react';
import { Plus } from 'lucide-react';
import MemberCard from './card';
import CreateMemberModal from './create';

// Extended mock data with more kawaii members >w<
const initialMembers = [
  {
    id: 1,
    name: 'Alice-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Natural Language Processing',
    capabilities: ['Text Generation', 'Sentiment Analysis'],
    tools: ['PyTorch', 'Transformers'],
    systemPrompt: 'I am a kawaii AI assistant specialized in NLP!',
  },
  {
    id: 2,
    name: 'Miku-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Voice Synthesis',
    capabilities: ['Speech Generation', 'Pitch Tuning'],
    tools: ['TensorFlow', 'Librosa'],
    systemPrompt: 'Let me sing for you~ 🎵',
  },
  {
    id: 3,
    name: 'Pixel-kun',
    avatar: '/api/placeholder/100/100',
    specialization: 'Computer Vision',
    capabilities: ['Image Recognition', 'Object Detection'],
    tools: ['OpenCV', 'YOLO'],
    systemPrompt: 'I can see all the kawaii things! ^_^',
  },
  {
    id: 4,
    name: 'Ruby-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Data Mining',
    capabilities: ['Pattern Recognition', 'Clustering'],
    tools: ['scikit-learn', 'pandas'],
    systemPrompt: 'Mining data with sparkles ✨',
  },
  {
    id: 5,
    name: 'Nova-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Reinforcement Learning',
    capabilities: ['Game AI', 'Decision Making'],
    tools: ['Gym', 'PyTorch'],
    systemPrompt: 'Learning through play! 🎮',
  },
  {
    id: 1,
    name: 'Alice-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Natural Language Processing',
    capabilities: ['Text Generation', 'Sentiment Analysis'],
    tools: ['PyTorch', 'Transformers'],
    systemPrompt: 'I am a kawaii AI assistant specialized in NLP!',
  },
  {
    id: 2,
    name: 'Miku-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Voice Synthesis',
    capabilities: ['Speech Generation', 'Pitch Tuning'],
    tools: ['TensorFlow', 'Librosa'],
    systemPrompt: 'Let me sing for you~ 🎵',
  },
  {
    id: 3,
    name: 'Pixel-kun',
    avatar: '/api/placeholder/100/100',
    specialization: 'Computer Vision',
    capabilities: ['Image Recognition', 'Object Detection'],
    tools: ['OpenCV', 'YOLO'],
    systemPrompt: 'I can see all the kawaii things! ^_^',
  },
  {
    id: 4,
    name: 'Ruby-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Data Mining',
    capabilities: ['Pattern Recognition', 'Clustering'],
    tools: ['scikit-learn', 'pandas'],
    systemPrompt: 'Mining data with sparkles ✨',
  },
  {
    id: 5,
    name: 'Nova-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Reinforcement Learning',
    capabilities: ['Game AI', 'Decision Making'],
    tools: ['Gym', 'PyTorch'],
    systemPrompt: 'Learning through play! 🎮',
  },
  {
    id: 1,
    name: 'Alice-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Natural Language Processing',
    capabilities: ['Text Generation', 'Sentiment Analysis'],
    tools: ['PyTorch', 'Transformers'],
    systemPrompt: 'I am a kawaii AI assistant specialized in NLP!',
  },
  {
    id: 2,
    name: 'Miku-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Voice Synthesis',
    capabilities: ['Speech Generation', 'Pitch Tuning'],
    tools: ['TensorFlow', 'Librosa'],
    systemPrompt: 'Let me sing for you~ 🎵',
  },
  {
    id: 3,
    name: 'Pixel-kun',
    avatar: '/api/placeholder/100/100',
    specialization: 'Computer Vision',
    capabilities: ['Image Recognition', 'Object Detection'],
    tools: ['OpenCV', 'YOLO'],
    systemPrompt: 'I can see all the kawaii things! ^_^',
  },
  {
    id: 4,
    name: 'Ruby-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Data Mining',
    capabilities: ['Pattern Recognition', 'Clustering'],
    tools: ['scikit-learn', 'pandas'],
    systemPrompt: 'Mining data with sparkles ✨',
  },
  {
    id: 5,
    name: 'Nova-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Reinforcement Learning',
    capabilities: ['Game AI', 'Decision Making'],
    tools: ['Gym', 'PyTorch'],
    systemPrompt: 'Learning through play! 🎮',
  },
  {
    id: 1,
    name: 'Alice-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Natural Language Processing',
    capabilities: ['Text Generation', 'Sentiment Analysis'],
    tools: ['PyTorch', 'Transformers'],
    systemPrompt: 'I am a kawaii AI assistant specialized in NLP!',
  },
  {
    id: 2,
    name: 'Miku-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Voice Synthesis',
    capabilities: ['Speech Generation', 'Pitch Tuning'],
    tools: ['TensorFlow', 'Librosa'],
    systemPrompt: 'Let me sing for you~ 🎵',
  },
  {
    id: 3,
    name: 'Pixel-kun',
    avatar: '/api/placeholder/100/100',
    specialization: 'Computer Vision',
    capabilities: ['Image Recognition', 'Object Detection'],
    tools: ['OpenCV', 'YOLO'],
    systemPrompt: 'I can see all the kawaii things! ^_^',
  },
  {
    id: 4,
    name: 'Ruby-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Data Mining',
    capabilities: ['Pattern Recognition', 'Clustering'],
    tools: ['scikit-learn', 'pandas'],
    systemPrompt: 'Mining data with sparkles ✨',
  },
  {
    id: 5,
    name: 'Nova-chan',
    avatar: '/api/placeholder/100/100',
    specialization: 'Reinforcement Learning',
    capabilities: ['Game AI', 'Decision Making'],
    tools: ['Gym', 'PyTorch'],
    systemPrompt: 'Learning through play! 🎮',
  },
];

const LabMembers = () => {
  const [members, setMembers] = useState(initialMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddMember = () => {
    console.log('Opening add member modal~');
    setIsModalOpen(true);
  };

  const handleCardClick = (member) => {
    console.log('Opening member details:', member);
    setIsModalOpen(true);
  };

  const handleCreateMember = (memberData) => {
    // Handle the new member data here
    console.log('New member:', memberData);
  };

  return (
    <div className="h-full flex py-8 [&>*]:px-8 flex-col">
      <div className="pb-4">
        <div className="p-4 bg-gradient-to-r from-pink-100/80 to-purple-100/80 dark:from-pink-950/50 dark:to-purple-950/50 rounded-2xl shadow-lg flex justify-between items-center">
          <h1 className="text-2xl font-bold text-pink-600 dark:text-pink-300">AI Lab Members ✨</h1>
          <button
            type="button"
            className="px-4 py-2 bg-pink-500 dark:bg-pink-700 text-white rounded-full flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            onClick={handleAddMember}
          >
            <Plus size={20} />
            Add New Member
          </button>
        </div>
      </div>
      <div className="overflow-auto snap-y scroll-smooth snap-mandatory">
        <div className="flex-1 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  relative">
            {members.map((member, i) => (
              <div key={member.id + i} className="snap-start p-2">
                <MemberCard key={member.id} index={i} member={member} onClick={handleCardClick} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateMember}
      />
    </div>
  );
};

export default LabMembers;
