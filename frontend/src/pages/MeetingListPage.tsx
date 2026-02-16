
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type { Meeting } from '@samverka/shared';
import { MeetingStatus } from '@samverka/shared';
import { useLanguage } from '../context/LanguageContext';

export const MeetingListPage: React.FC = () => {
    const navigate = useNavigate();
    const { t, formatDate } = useLanguage();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const data = await api.get('/meetings');
                // Dashboard.tsx: setMeetings(meetingsData.meetings || []);
                setMeetings(data.meetings || []);
            } catch (err) {
                console.error("Failed to fetch meetings", err);
                setError(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, [t]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-slate-500">{t('common.loading')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg mx-8 mt-8">
                {error}
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">{t('nav.meetings')}</h1>
                <button
                    onClick={() => navigate('/')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    + {t('common.newMeeting')}
                </button>
            </div>

            {meetings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-slate-200 border-dashed">
                    <p className="text-slate-500 mb-2">{t('meeting.noMeetings')}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        {t('meeting.scheduleOne')}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t('create.titleLabel')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t('common.date')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t('meeting.participants')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {meetings.map((meeting) => (
                                <tr
                                    key={meeting.id}
                                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                                    className={`cursor-pointer transition-colors ${meeting.status === MeetingStatus.DECIDED ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-slate-50'}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-medium text-slate-900">{meeting.title}</div>
                                            {meeting.status === MeetingStatus.DECIDED && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                                    {t('meeting.decided')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500 truncate max-w-xs">{meeting.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900">
                                            {meeting.startDate
                                                ? formatDate(meeting.startDate)
                                                : formatDate(meeting.createdAt)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {meeting.startDate
                                                ? new Date(meeting.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-500">
                                            {meeting.invitedEmails ? meeting.invitedEmails.length : 0} {t('meeting.invited')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <span className="text-blue-600 hover:text-blue-900">{t('common.view')}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
            }
        </div >
    );
};
