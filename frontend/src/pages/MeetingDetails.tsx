import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import { VoteStatus, MeetingStatus } from '@samverka/shared';
import type { MeetingDetails, Vote, Language } from '@samverka/shared';
import { ChatPanel } from '../components/Chat/ChatPanel';
import { UserProfileModal } from '../components/UserProfileModal';
import { BottomNav } from '../components/Mobile/BottomNav';
import { Edit2, Save, X, Lock, Check, History } from 'lucide-react';
import Footer from '../components/Layout/Footer';

export const MeetingDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const { t, formatDate, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
    const [unreadCount, setUnreadCount] = useState(0);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editedEmails, setEditedEmails] = useState<string[]>([]);
    const [editLoading, setEditLoading] = useState(false);

    const handleNewMessage = () => {
        if (activeTab !== 'chat') {
            setUnreadCount(prev => prev + 1);
        }
    };

    // Reset unread count when switching to chat
    useEffect(() => {
        if (activeTab === 'chat') {
            setUnreadCount(0);
        }
    }, [activeTab]);

    useEffect(() => {
        if (token) {
            api.setToken(token);
        }
    }, [token]);

    useEffect(() => {
        if (!id) return;

        setLoading(true);
        // Use api.get instead of api.getMeeting since getting typed response handles it
        api.get(`/meetings/${id}`)
            .then((data: MeetingDetails) => {
                setMeeting(data);
                setEditTitle(data.title);
                setEditDescription(data.description || '');
                setEditedEmails(data.invitedEmails || []);
                setLoading(false);

                // Set language from meeting metadata if available
                if (data.language) {
                    setLanguage(data.language as Language);
                }
            })
            .catch(err => {
                console.error(err);
                setError(t('common.error'));
                setLoading(false);
            });
    }, [id, setLanguage, t]); // Added t to dependencies

    const handleUpdate = async () => {
        if (!meeting) return;
        setEditLoading(true);
        try {
            await api.updateMeeting(meeting.id, {
                title: editTitle,
                description: editDescription,
                invitedEmails: editedEmails
            });
            // Refresh
            const updated = await api.get(`/meetings/${meeting.id}`);
            setMeeting(updated);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to update meeting", err);
            alert(t('common.error'));
        } finally {
            setEditLoading(false);
        }
    };

    const handleDecide = async (slotId: string, slotTime: string) => {
        if (!meeting || !confirm(t('common.confirmDecide').replace('{{time}}', slotTime))) return;

        try {
            await api.decideMeeting(meeting.id, slotId);
            const updated = await api.get(`/meetings/${meeting.id}`);
            setMeeting(updated);
        } catch (err) {
            console.error(err);
            alert(t('common.error'));
        }
    };

    const handleDelete = async () => {
        if (!meeting || !confirm(t('common.confirmDelete'))) return;

        try {
            await api.deleteMeeting(meeting.id);
            alert(t('common.deleted'));
            navigate('/');
        } catch (err) {
            console.error("Failed to delete meeting", err);
            alert(t('common.error'));
        }
    };

    const handleVote = async (slotId: string, status: VoteStatus) => {
        if (!meeting) return;

        let voterId = user?.userId;
        let voterName = user?.displayName;

        // Guest Voting Logic
        if (!user) {
            if (!meeting.isPublic) {
                alert(t('common.loginRequired'));
                return;
            }

            const name = prompt(t('common.guestNamePrompt'));
            if (!name) return;
            voterName = name;
        }

        if (user) {
            const optimizedVotes = [...meeting.votes];
            const existingVoteIndex = optimizedVotes.findIndex(v => v.slotId === slotId && v.userId === user.userId);
            const newVote: Vote = {
                slotId,
                userId: user.userId,
                userName: user.displayName || 'Me',
                status,
                updatedAt: new Date().toISOString()
            };

            if (existingVoteIndex >= 0) {
                optimizedVotes[existingVoteIndex] = newVote;
            } else {
                optimizedVotes.push(newVote);
            }
            setMeeting({ ...meeting, votes: optimizedVotes });
        }

        try {
            await api.post('/votes', {
                meetingId: meeting.id,
                slotId,
                status,
                userId: voterId, // undefined if guest
                userName: voterName
            });

            // If guest, we need to reload to see our vote (with the backend-assigned ID)
            if (!user) {
                const updated = await api.get(`/meetings/${id}`);
                setMeeting(updated);
            }

        } catch (err: any) {
            console.error("Failed to cast vote", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert(err.response?.data?.error || t('common.unauthorized'));
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-nnc-muted">{t('common.loading')}</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
    if (!meeting) return <div className="p-8 text-center text-nnc-muted">{t('common.notFound')}</div>;

    const participants = Array.from(new Set(meeting.votes.map(v => v.userName))).filter(name => name !== user?.displayName);
    const sortedSlots = [...meeting.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const getVoteStatus = (slotId: string, userId: string): VoteStatus | undefined => {
        return meeting.votes.find(v => v.slotId === slotId && v.userId === userId)?.status;
    };

    const myVote = (slotId: string) => user ? getVoteStatus(slotId, user.userId) : undefined;

    return (
        <>
        <div className="min-h-screen nnc-grid text-nnc-primary flex flex-col font-sans pb-16 md:pb-0">
            {/* Added pb-16 for mobile bottom nav space */}
            <UserProfileModal />

            {/* Header */}
            <div className="bg-nnc-surface text-nnc-primary p-4 sticky top-0 z-40 border-b border-nnc-subtle">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-mono font-bold px-2 flex items-center gap-2 text-nnc-primary">
                            {meeting.title}
                            {meeting.status === MeetingStatus.DECIDED && <span className="bg-accent-tech text-nnc-base text-xs px-2 py-0.5 rounded-full">{t('meeting.decided')}</span>}
                            {meeting.isPublic ? <span className="text-xs bg-accent-action text-white px-2 py-0.5 rounded-full ml-2 align-middle">{t('meeting.public')}</span> : <span className="text-xs bg-nnc-subtle text-nnc-muted px-2 py-0.5 rounded-full ml-2 align-middle">{t('meeting.private')}</span>}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.userId === meeting.creatorId && (
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors hidden md:block"
                            >
                                {t('meeting.delete')}
                            </button>
                        )}
                        {/* Old Mobile Tabs Removed Here */}
                    </div>
                </div>
            </div>

            {/* Main Layout - Two Column Grid */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                {/* Left Panel: Scheduling Grid (Col Span 8) */}
                <div className={`md:col-span-8 flex flex-col gap-6 ${activeTab === 'details' ? 'block' : 'hidden md:block'}`}>

                    {/* Info Card / Edit Form */}
                    <div className="bg-nnc-surface rounded-xl shadow-sm border border-nnc-subtle p-6">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-nnc-muted mb-1">{t('create.titleLabel')}</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-nnc-subtle rounded-md bg-nnc-base text-nnc-primary focus:ring-2 focus:ring-accent-tech focus:border-accent-tech"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-nnc-muted mb-1">{t('create.descLabel')}</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-nnc-subtle rounded-md bg-nnc-base text-nnc-primary focus:ring-2 focus:ring-accent-tech focus:border-accent-tech"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-nnc-muted hover:bg-nnc-base rounded-md"
                                    >
                                        <X size={16} /> {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={handleUpdate}
                                        disabled={editLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-accent-action text-white rounded-md hover:bg-accent-action/90"
                                    >
                                        <Save size={16} /> {editLoading ? t('common.saving') : t('common.save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-lg font-mono font-bold text-nnc-primary mb-2">{t('meeting.about')}</h2>
                                        <p className="text-nnc-muted">{meeting.description || t('meeting.noDesc')}</p>
                                    </div>
                                    {user?.userId === meeting.creatorId && meeting.status !== MeetingStatus.DECIDED && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 text-nnc-muted hover:text-accent-tech hover:bg-nnc-base rounded-full transition-colors"
                                            title="Edit Meeting"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-col gap-4">
                                    {/* Participants List */}
                                    <div>
                                        <h3 className="font-semibold text-nnc-muted mb-2 text-sm uppercase tracking-wider font-mono">{t('meeting.participants')}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {meeting.invitedEmails && meeting.invitedEmails.length > 0 ? (
                                                meeting.invitedEmails.map(email => (
                                                    <span key={email} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-nnc-base text-nnc-primary border border-nnc-subtle">
                                                        {email}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-nnc-muted italic text-sm">{t('meeting.noInvites')}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Public Link & Guest Info */}
                                    {!user && meeting.isPublic && (
                                        <div className="bg-nnc-base text-nnc-primary px-4 py-2 rounded text-sm border border-nnc-subtle">
                                            {t('meeting.guestInfo')}
                                        </div>
                                    )}

                                    {meeting.isPublic && (
                                        <div>
                                            <button
                                                onClick={() => {
                                                    const publicUrl = `${window.location.origin}/public/meetings/${meeting.id}`;
                                                    navigator.clipboard.writeText(publicUrl);
                                                    alert(t('meeting.linkCopied'));
                                                }}
                                                className="flex items-center gap-2 text-accent-tech hover:text-accent-tech/80 text-sm font-medium transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                {t('meeting.copyLink')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Activity Log - NEW */}
                    {meeting.activityLog && meeting.activityLog.length > 0 && (
                        <div className="bg-nnc-surface rounded-xl shadow-sm border border-nnc-subtle overflow-hidden">
                            <div className="p-4 border-b border-nnc-subtle bg-nnc-base/50 flex items-center gap-2">
                                <History size={18} className="text-nnc-muted" />
                                <h3 className="font-semibold text-nnc-primary font-mono">{t('meeting.activity')}</h3>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-4 space-y-3 bg-nnc-base/30">
                                {meeting.activityLog.slice().reverse().map((log, idx) => ( // Show newest first
                                    <div key={idx} className="flex gap-3 text-sm">
                                        <div className="text-nnc-muted font-mono text-xs pt-0.5 min-w-[50px]">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-medium text-nnc-primary">{log.userName}</span>
                                            <span className="text-nnc-muted mx-1">•</span>
                                            <span className="text-nnc-muted">{log.message}</span>
                                        </div>
                                        <div className="text-xs text-nnc-muted hidden md:block">
                                            {formatDate(log.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scheduling Card */}
                    <div className="bg-nnc-surface rounded-xl shadow-sm border border-nnc-subtle overflow-hidden">
                        <div className="p-4 border-b border-nnc-subtle bg-nnc-base/50">
                            <h3 className="font-semibold text-nnc-primary font-mono">{t('meeting.availability')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-nnc-base border-b border-nnc-subtle">
                                        <th className="p-4 font-semibold text-nnc-muted min-w-[160px] text-sm uppercase tracking-wider font-mono">{t('meeting.timeSlot')}</th>
                                        <th className="p-4 font-bold text-accent-action w-44 text-center border-l border-r border-nnc-subtle bg-nnc-base/60 text-sm uppercase tracking-wider font-mono">
                                            {t('meeting.yourVote')}
                                        </th>
                                        {participants.map(p => (
                                            <th key={p} className="p-4 font-medium text-nnc-muted w-24 text-center text-xs uppercase tracking-wider font-mono">{p}</th>
                                        ))}
                                        <th className="p-4 font-semibold text-nnc-muted w-20 text-center text-sm uppercase tracking-wider font-mono">{t('meeting.sum')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSlots.map(slot => {
                                        const dateStr = formatDate(slot.startTime); // Use localized date

                                        // Simple time extraction since we want consistent HH:MM across locales for time slots usually
                                        const timeStart = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const timeEnd = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const timeStr = `${timeStart} - ${timeEnd}`;

                                        const myStatus = myVote(slot.id);
                                        const yesCount = meeting.votes.filter(v => v.slotId === slot.id && v.status === VoteStatus.YES).length;
                                        const maybeCount = meeting.votes.filter(v => v.slotId === slot.id && v.status === VoteStatus.MAYBE).length;
                                        const noCount = meeting.votes.filter(v => v.slotId === slot.id && v.status === VoteStatus.NO).length;

                                        const isLocked = meeting.status === MeetingStatus.DECIDED;
                                        const isChosen = meeting.lockedSlotId === slot.id;

                                        return (
                                            <tr key={slot.id} className={`border-b border-nnc-subtle transition-colors ${isChosen ? 'bg-nnc-base/70 ring-2 ring-inset ring-accent-tech' : 'hover:bg-nnc-base/50'}`}>
                                                <td className="p-4">
                                                    <div className="font-medium text-nnc-primary flex items-center gap-2">
                                                        {dateStr}
                                                        {isChosen && <Check size={16} className="text-accent-tech" />}
                                                    </div>
                                                    <div className="text-xs text-nnc-muted">{timeStr}</div>

                                                    {/* Decide Button for Creator */}
                                                    {!isLocked && user?.userId === meeting.creatorId && (
                                                        <button
                                                            onClick={() => handleDecide(slot.id, `${dateStr} ${timeStr}`)}
                                                            className="mt-2 text-xs font-semibold text-accent-tech hover:text-accent-tech/80 hover:underline flex items-center gap-1"
                                                        >
                                                            <Lock size={12} /> {t('meeting.decide')}
                                                        </button>
                                                    )}
                                                </td>

                                                <td className={`p-4 border-l border-r ${isChosen ? 'border-nnc-subtle bg-nnc-base/60' : 'border-nnc-subtle bg-nnc-base/40'} text-center`}>
                                                    {!isLocked ? (
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => handleVote(slot.id, VoteStatus.YES)}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${myStatus === VoteStatus.YES ? 'bg-accent-tech text-nnc-base scale-110' : 'bg-nnc-base border border-nnc-subtle text-nnc-muted hover:border-accent-tech hover:text-accent-tech'}`}
                                                                title="Yes"
                                                            >✓</button>
                                                            <button
                                                                onClick={() => handleVote(slot.id, VoteStatus.MAYBE)}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${myStatus === VoteStatus.MAYBE ? 'bg-yellow-500 text-white scale-110' : 'bg-nnc-base border border-nnc-subtle text-nnc-muted hover:border-yellow-500 hover:text-yellow-500'}`}
                                                                title="Maybe"
                                                            >?</button>
                                                            <button
                                                                onClick={() => handleVote(slot.id, VoteStatus.NO)}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${myStatus === VoteStatus.NO ? 'bg-red-500 text-white scale-110' : 'bg-nnc-base border border-nnc-subtle text-nnc-muted hover:border-red-500 hover:text-red-500'}`}
                                                                title="No"
                                                            >✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center text-sm font-medium text-nnc-muted italic">
                                                            {t('meeting.votingClosed')}
                                                        </div>
                                                    )}
                                                </td>

                                                {participants.map(p => {
                                                    const v = meeting.votes.find(vote => vote.userName === p && vote.slotId === slot.id);
                                                    return (
                                                        <td key={p} className="p-4 text-center">
                                                            {v?.status === VoteStatus.YES && <span className="text-accent-tech font-bold">✓</span>}
                                                            {v?.status === VoteStatus.MAYBE && <span className="text-yellow-500 font-bold">?</span>}
                                                            {v?.status === VoteStatus.NO && <span className="text-red-400 font-bold">✕</span>}
                                                            {!v && <span className="text-nnc-subtle">-</span>}
                                                        </td>
                                                    );
                                                })}

                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="font-bold text-accent-tech text-lg leading-none">{yesCount}</div>
                                                        {(maybeCount > 0 || noCount > 0) && (
                                                            <div className="text-xs text-nnc-muted flex gap-2">
                                                                {maybeCount > 0 && <span className="text-yellow-500" title="Maybe">? {maybeCount}</span>}
                                                                {noCount > 0 && <span className="text-red-400" title="No">✕ {noCount}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chat (Col Span 4) */}
                <div className={`md:col-span-4 h-full md:sticky md:top-24 ${activeTab === 'chat' ? 'block' : 'hidden md:block'}`}>
                    <div className="bg-nnc-surface rounded-xl shadow-sm border border-nnc-subtle overflow-hidden h-[600px] flex flex-col">
                        <ChatPanel roomId={id || ''} title="Meeting Chat" onMessage={handleNewMessage} />
                    </div>
                </div>

            </div>

            {/* Bottom Nav for Mobile */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />
        </div>
        <Footer />
        </>
    );
};


