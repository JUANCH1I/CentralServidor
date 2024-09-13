import React from 'react';

interface EmergencyBannerProps {
  message: string | null;
    onClose: () => void;
}

const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ message, onClose }) => {
  return (
    <div className="bg-red-500 text-white p-4 fixed top-0 left-0 right-0 z-50 flex justify-between items-center shadow-lg text-lg">
      <span>{message}</span>
      <button onClick={onClose} className="bg-red-700 text-white px-4 py-2 rounded">
        Cerrar
      </button>
    </div>
  );
};

export default EmergencyBanner;