import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoadingScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <p className="mt-4 text-lg font-medium text-gray-700">{t('common.loading')}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;