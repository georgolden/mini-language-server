import KawaiiSelect from '@components/select';
import { useModels } from '@hooks/apollo/chat';
import type { FC } from 'react';

interface ModelSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ value, onChange }) => {
  const { models } = useModels();

  return (
    <KawaiiSelect
      value={value}
      onChange={onChange}
      options={models.map((el) => ({
        value: el.modelName,
        label: (
          <div className="flex flex-col">
            <div>{el.modelName}</div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{el.modelId}</span>
              <span>{el.provider}</span>
            </div>
          </div>
        ),
      }))}
    />
  );
};
