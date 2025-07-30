import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium' }) => {
  let spinnerSize = 'w-8 h-8';
  if (size === 'small') {
    spinnerSize = 'w-4 h-4';
  } else if (size === 'large') {
    spinnerSize = 'w-12 h-12';
  }

  return (
    <div className={`animate-spin rounded-full border-4 border-t-4 border-blue-500 border-opacity-25 ${spinnerSize}`}></div>
  );
};

export default LoadingSpinner;