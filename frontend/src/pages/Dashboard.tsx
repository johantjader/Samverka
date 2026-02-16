import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import type { Meeting } from '@samverka/shared';
import { api } from '../utils/api';
import { hashColor } from '../utils/hashColor';

export const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { t, formatDate } = useLanguage();
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        try {
            const [meetingsData, roomsData] = await Promise.all([
                api.get('/meetings'),
                api.listRooms()
            ]);
            setMeetings(meetingsData.meetings || []);
            setRooms(roomsData.rooms || []);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleCreateRoom = async () => {
        const name = prompt(t('dashboard.createRoomPrompt'));
        if (!name) return;

        const topic = prompt(t('dashboard.createTopicPrompt'));

        try {
            await api.createRoom(name, topic || undefined);
            fetchData(); // Refresh
        } catch (err) {
            alert(t('common.error'));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-slate-800">Samverka</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600">
                            {user?.displayName} ({user?.email})
                        </span>
                        <button
                            onClick={logout}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            {t('auth.logout')}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* Meetings Section */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.myMeetings')}</h2>
                        <button
                            onClick={() => navigate('/meetings/new')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
                        >
                            + {t('common.newMeeting')}
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">{t('common.loading')}</div>
                    ) : meetings.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                            <p className="text-slate-500 mb-2">{t('meeting.noMeetings')}</p>
                            <p className="text-sm text-slate-400">{t('meeting.scheduleOne')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {meetings.map(meeting => (
                                <div key={meeting.id}
                                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                                    className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer group">
                                    <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{meeting.title}</h3>
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{meeting.description || t('meeting.noDesc')}</p>
                                    <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 flex justify-between">
                                        <span>{t('common.created')}: {formatDate(meeting.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Rooms Section */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.chatRooms')}</h2>
                        <button
                            onClick={handleCreateRoom}
                            className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors shadow-sm font-medium"
                        >
                            + {t('dashboard.newTopic')}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Always show General */}
                        <div
                            onClick={() => navigate('/chat/general')}
                            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
                        >
                            <h3 className="font-bold text-lg mb-1">☕ {t('dashboard.generalLobby')}</h3>
                            <p className="text-indigo-100 text-sm">{t('dashboard.commonArea')}</p>
                        </div>

                        {loading ? null : rooms.map(room => (
                            <div key={room.id}
                                onClick={() => navigate(`/chat/${room.id}`)}
                                className={`bg-gradient-to-br ${hashColor(room.name || room.id)} rounded-lg p-6 text-white shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1`}
                            >
                                <h3 className="font-bold text-lg mb-1">{room.name}</h3>
                                <p className="text-white/70 text-sm line-clamp-2">{room.topic || t('dashboard.noTopic')}</p>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
};
