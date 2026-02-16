import React from 'react';
import { Calendar, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface BottomNavProps {
    activeTab: 'details' | 'chat';
    setActiveTab: (tab: 'details' | 'chat') => void;
    unreadCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, unreadCount }) => {
    const { t } = useLanguage();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-nnc-surface border-t border-nnc-subtle flex justify-around items-center h-16 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <button
                onClick={() => setActiveTab('details')}
                className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'details' ? 'text-accent-tech' : 'text-nnc-muted hover:text-nnc-primary'}`}
            >
                <Calendar size={24} />
                <span className="text-xs mt-1 font-medium">{t('meeting.details')}</span>
            </button>
            <button
                onClick={() => setActiveTab('chat')}
                className={`relative flex flex-col items-center justify-center w-full h-full ${activeTab === 'chat' ? 'text-accent-tech' : 'text-nnc-muted hover:text-nnc-primary'}`}
            >
                <div className="relative">
                    <MessageSquare size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-accent-action text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-nnc-base">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <span className="text-xs mt-1 font-medium">{t('meeting.chat')}</span>
            </button>
        </div>
    );
};

