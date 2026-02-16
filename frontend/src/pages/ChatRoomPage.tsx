import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatPanel } from '../components/Chat/ChatPanel';

export const ChatRoomPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();

    // Fallback or specific logic for "General"
    const effectiveRoomId = roomId || 'general';
    const roomName = effectiveRoomId === 'general' ? 'General Lobby' : 'Chat Room'; // In a real app, fetch room details to get name

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* 
               AppShell provides the Viewport and Padding (py-8). 
               We want the chat to fill the available vertical space.
               100vh - 64px (TopBar) - 64px (Padding) approx.
           */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800">{roomName}</h1>
                {effectiveRoomId !== 'general' && <span className="text-sm text-slate-500">ID: {effectiveRoomId}</span>}
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <ChatPanel
                    roomId={effectiveRoomId}
                    title={roomName}
                />
            </div>
        </div>
    );
};
