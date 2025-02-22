import { useState } from 'react';
import { Upload, PenTool, Sparkles, Book, X, Plus } from 'lucide-react';
import Modal from '@components/modal';
import { KawaiiButton } from '@components/button';
import { KawaiiInput } from '@components/input';
import { KawaiiTextArea } from '@components/textarea';
import { useCloudinaryUpload } from '@hooks/apollo/image'; // Adjust the import path accordingly

const CreateMemberModal = ({ isOpen, onClose, onSubmit }) => {
  const [avatar, setAvatar] = useState(null);
  const [name, setName] = useState('');
  const [selectedTools, setSelectedTools] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledge, setKnowledge] = useState([]);
  const [knowledgeInput, setKnowledgeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the Cloudinary upload hook
  const { uploadToCloudinary } = useCloudinaryUpload();

  // Assume tools are fetched from the backend
  const availableTools = ['PyTorch', 'TensorFlow', 'OpenCV', 'Transformers', 'scikit-learn'];

  // Handle form submission with avatar upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);

    try {
      let avatarUrl = null;
      if (avatar) {
        // Upload the avatar to Cloudinary and get the secure URL
        const result = await uploadToCloudinary(avatar);
        avatarUrl = result.url;
      }
      // Submit the form data with the Cloudinary URL (or null if no avatar)
      onSubmit({
        avatar: avatarUrl, // Pass the URL instead of the File object
        name,
        tools: selectedTools,
        systemPrompt,
        knowledge,
      });
      onClose();
    } catch (error) {
      console.error('Error creating member:', error);
      // Optionally, display an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKnowledgeAdd = () => {
    if (knowledgeInput.trim()) {
      setKnowledge([...knowledge, knowledgeInput.trim()]);
      setKnowledgeInput('');
    }
  };

  const handleKnowledgeRemove = (index) => {
    setKnowledge(knowledge.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New AI Lab Member ✨" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-500/50 dark:to-purple-500/50 rounded-full opacity-75 blur-sm" />
              <div className="relative w-24 h-24 rounded-full border-2 border-white dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img
                    src={URL.createObjectURL(avatar)}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </div>
            <KawaiiButton variant="primary" className="relative">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={(e) => setAvatar(e.target.files[0])}
              />
              Choose Avatar
            </KawaiiButton>
          </div>

          <KawaiiInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter member name..."
          />

          {/* Tools Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tools
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTools.map((tool) => (
                <KawaiiButton
                  key={tool}
                  type="button"
                  variant={selectedTools.includes(tool) ? 'primary' : 'secondary'}
                  onClick={() => {
                    if (selectedTools.includes(tool)) {
                      setSelectedTools(selectedTools.filter((t) => t !== tool));
                    } else {
                      setSelectedTools([...selectedTools, tool]);
                    }
                  }}
                  icon={<PenTool size={16} />}
                >
                  {tool}
                </KawaiiButton>
              ))}
            </div>
          </div>

          <KawaiiTextArea
            label="System Prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt..."
          />

          {/* Knowledge Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Knowledge
            </label>
            <div className="flex gap-2 mb-2">
              <KawaiiInput
                value={knowledgeInput}
                onChange={(e) => setKnowledgeInput(e.target.value)}
                placeholder="Add URL, file, or prompt..."
                className="flex-1"
              />
              <KawaiiButton type="button" onClick={handleKnowledgeAdd} icon={<Plus size={20} />} />
            </div>
            <div className="space-y-2">
              {knowledge.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <Book size={16} className="text-pink-500" />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  <KawaiiButton
                    type="button"
                    variant="secondary"
                    onClick={() => handleKnowledgeRemove(index)}
                    icon={<X size={16} />}
                    className="!p-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <KawaiiButton type="submit" fullWidth icon={<Sparkles size={20} />} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Member'}
        </KawaiiButton>
      </form>
    </Modal>
  );
};

export default CreateMemberModal;
