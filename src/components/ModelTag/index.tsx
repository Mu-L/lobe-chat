import { SiAmazonaws, SiOpenai } from '@icons-pack/react-simple-icons';
import { Tag } from '@lobehub/ui';
import { memo, useMemo } from 'react';

import Anthropic from '@/components/ModelTag/Anthropic';
import { ModelProvider } from '@/types/llm';

import ChatGLM from './ChatGLM';
import GoogleDeepMind from './GoogleDeepMind';
import Mistral from './Mistral';
import Tongyi from './Tongyi';

interface ModelTagProps {
  name: string;
  provider?: ModelProvider;
}
const ModelTag = memo<ModelTagProps>(({ provider, name }) => {
  const icon = useMemo(() => {
    switch (provider) {
      case ModelProvider.Anthropic: {
        return <Anthropic size={12} />;
      }
      case ModelProvider.Tongyi: {
        return <Tongyi size={12} />;
      }
      case ModelProvider.Mistral: {
        return <Mistral size={11} />;
      }
      case ModelProvider.Bedrock: {
        return <SiAmazonaws size={18} />;
      }
      case ModelProvider.ChatGLM: {
        return <ChatGLM size={18} />;
      }
      case ModelProvider.Google: {
        return <GoogleDeepMind size={12} />;
      }

      default:
      case ModelProvider.OpenAI: {
        return <SiOpenai size={12} />;
      }
    }
  }, [provider]);

  return <Tag icon={icon}>{name}</Tag>;
});

export default ModelTag;
