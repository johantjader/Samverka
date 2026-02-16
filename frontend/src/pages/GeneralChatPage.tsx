import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { UserProfileModal } from '../components/UserProfileModal';

export const GeneralChatPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <UserProfileModal />
            {/* Header */}
            <div className="bg-slate-800 text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm mb-1">
                            &larr; Back to Dashboard
                        </button>
                        <h1 className="text-xl font-bold">General Lobby</h1>
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 max-w-4xl mx-auto w-full p-4 h-[calc(100vh-80px)]">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
                    <ChatPanel
                        roomId="general"
                        title="Common Room (Lobby)"
                    />
                </div>
            </div>
        </div>
    );
};
