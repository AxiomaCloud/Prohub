'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface PurchaseRequestChatButtonProps {
  purchaseRequestId: string;
  purchaseRequestNumber: string;
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export const PurchaseRequestChatButton: React.FC<PurchaseRequestChatButtonProps> = ({
  purchaseRequestId,
  purchaseRequestNumber,
  unreadCount,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors ${className}`}
      title={`Chat - ${purchaseRequestNumber}`}
    >
      <MessageCircle className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Badge separado para usar en otros lugares
export const PRChatBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
};

export default PurchaseRequestChatButton;
