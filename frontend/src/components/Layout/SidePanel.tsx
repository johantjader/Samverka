import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Hash, Plus, Search, UserCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../utils/api';
import { hashTextColor as hashColor } from '../../utils/hashColor';

// Types
interface Room {
    id: string;
    name: string;
    type?: 'ADHOC' | 'MEETING' | 'DM';
    participantIds?: string[];
}

interface User {
    id: string;
    displayName: string;
    email: string;
}

export default function SidePanel() {
    const location = useLocation();
    const path = location.pathname;

    const renderContent = () => {
        if (path.includes('/meetings')) {
            return <MeetingsList />;
        }
        if (path.includes('/chat') || path.includes('/rooms') || path.includes('/general-chat')) {
            return <ChannelsList />;
        }
        return <DashboardNav />;
    };

    return (
        <aside className="w-64 bg-slate-50 border-r border-slate-200 h-screen flex flex-col shrink-0 overflow-hidden">
            {renderContent()}
        </aside>
    );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 text-slate-500">
            <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
            {action}
        </div>
    );
}

function NavItem({ label, active, icon: Icon, iconColorClass, onClick, to, onDelete }: { label: string; active?: boolean; icon?: React.ElementType, iconColorClass?: string, onClick?: () => void, to?: string, onDelete?: () => void }) {
    const content = (
        <div className={clsx(
            "px-3 py-2 mx-2 rounded-md flex items-center gap-3 cursor-pointer transition-colors group",
            active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-100"
        )}>
            {Icon && <Icon className={clsx("w-4 h-4", iconColorClass ? iconColorClass : (active ? "text-blue-600" : "text-slate-400"))} />}
            <span className="text-sm font-medium truncate flex-1">{label}</span>
            {onDelete && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                    title="Delete"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}
        </div>
    );

    if (to) {
        return <Link to={to} className="block">{content}</Link>;
    }

    return <div onClick={onClick}>{content}</div>;
}

function DashboardNav() {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Workspace</h2>
                <p className="text-xs text-slate-500">Samverka Enterprise</p>
            </div>

            <div className="py-4 overflow-y-auto flex-1">
                <div className="px-2 mb-2">
                    <NavItem label="Overview" active icon={LayoutDashboardIcon} to="/" />
                    <NavItem label="Activity" icon={ActivityIcon} />
                    <NavItem label="Settings" icon={SettingsIcon} />
                </div>
            </div>
        </div>
    );
}

function MeetingsList() {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/meetings')
            .then(data => {
                // Sort by startDate or createdAt
                const sorted = (data.meetings || []).sort((a: any, b: any) => {
                    const dateA = a.startDate || a.createdAt;
                    const dateB = b.startDate || b.createdAt;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                });

                // Filter out past meetings (optional, but good for "Upcoming")
                // Keeping it simple: just show next 5
                setMeetings(sorted.slice(0, 5));
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch meetings for side panel", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Meetings</h2>
                <Link to="/meetings/new" className="p-1.5 hover:bg-slate-200 rounded-md transition-colors">
                    <Plus className="w-4 h-4 text-slate-600" />
                </Link>
            </div>

            <div className="p-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filter meetings..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                <SectionHeader title="Kommande" />

                {loading && <div className="text-xs text-slate-400 px-4">Loading...</div>}

                {!loading && meetings.length === 0 && (
                    <div className="text-xs text-slate-400 px-4">Inga möten inbokade.</div>
                )}

                {meetings.map((m: any) => {
                    const dateVal = m.startDate || m.createdAt;
                    const time = new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    // Determine status? For now just use upcoming style
                    return (
                        <Link key={m.id} to={`/meetings/${m.id}`}>
                            <MeetingItem
                                time={time}
                                title={m.title}
                                status="upcoming"
                            />
                        </Link>
                    );
                })}

                <div className="mt-4 px-2">
                    <Link to="/meetings" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        View all meetings &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}

function MeetingItem({ time, title, status }: { time: string; title: string; status: 'live' | 'upcoming' | 'future' }) {
    return (
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer group transition-colors">
            <div className={clsx(
                "flex flex-col items-center justify-center w-10 h-10 rounded-lg border text-xs font-medium shrink-0",
                status === 'live' ? "bg-red-50 border-red-100 text-red-600" :
                    status === 'upcoming' ? "bg-blue-50 border-blue-100 text-blue-600" :
                        "bg-slate-50 border-slate-200 text-slate-500"
            )}>
                <span>{time}</span>
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">{title}</div>
            </div>
        </div>
    );
}

function ChannelsList() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isCreateDMOpen, setIsCreateDMOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [roomsData, usersResponse] = await Promise.all([
                api.listRooms().catch(e => { console.error("Failed to list rooms", e); return { rooms: [] }; }),
                api.listUsers().catch(e => { console.error("Failed to list users", e); return { users: [] }; })
            ]);

            setRooms(roomsData.rooms || []);
            setUsers(usersResponse.users || []);
        } catch (error) {
            console.error("Error loading side panel data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChannel = async (name: string) => {
        try {
            const res = await api.createRoom(name, undefined, 'ADHOC');
            // Optimistic update or reload
            if (res.room) {
                setRooms(prev => [...prev, res.room]);
                navigate(`/chat/${res.room.id}`);
            } else {
                // Fallback reload if response structure differs
                loadData();
            }
            setIsCreateChannelOpen(false);
        } catch (error) {
            console.error("Failed to create channel", error);
            alert("Failed to create channel");
        }
    };

    const handleCreateDM = async (userId: string) => {
        try {
            // Check if DM already exists with this user? 
            // For now, just create new or return existing.
            // Simplified: Create new DM room.
            const user = users.find(u => u.id === userId);
            const name = user ? `dm-${user.displayName}` : `dm-${userId}`;

            const res = await api.createRoom(name, undefined, 'DM', [userId]);
            if (res.room) {
                setRooms(prev => [...prev, res.room]);
                navigate(`/chat/${res.room.id}`);
            } else {
                loadData();
            }
            setIsCreateDMOpen(false);
        } catch (error) {
            console.error("Failed to create DM", error);
            alert("Failed to create DM");
        }
    };

    const handleDeleteRoom = async (room: Room) => {
        if (!confirm(`Are you sure you want to delete ${room.name || 'this room'}?`)) return;

        try {
            await api.deleteRoom(room.id);
            setRooms(prev => prev.filter(r => r.id !== room.id));
            if (location.pathname === `/chat/${room.id}`) {
                navigate('/chat');
            }
        } catch (error) {
            console.error("Failed to delete room", error);
            alert("Failed to delete room. You might not be authorized.");
        }
    };

    const channels = rooms.filter(r => !r.type || r.type === 'ADHOC' || r.type === 'MEETING');
    const dms = rooms.filter(r => r.type === 'DM');

    if (loading) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Communication</h2>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Communication</h2>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <SectionHeader
                    title="Channels"
                    action={<button onClick={() => setIsCreateChannelOpen(true)}><Plus className="w-4 h-4 cursor-pointer hover:text-slate-800" /></button>}
                />
                <div className="px-2">
                    <NavItem label="general" icon={Hash} to="/general-chat" active={location.pathname === '/general-chat'} />
                    {channels.map(room => (
                        <NavItem
                            key={room.id}
                            label={room.name || 'Untitled'}
                            icon={Hash}
                            iconColorClass={hashColor(room.name || room.id)}
                            to={`/chat/${room.id}`}
                            active={location.pathname === `/chat/${room.id}`}
                            onDelete={() => handleDeleteRoom(room)}
                        />
                    ))}
                </div>

                <SectionHeader
                    title="Direct Messages"
                    action={<button onClick={() => setIsCreateDMOpen(true)}><Plus className="w-4 h-4 cursor-pointer hover:text-slate-800" /></button>}
                />
                <div className="px-2">
                    {dms.map(room => (
                        <NavItem
                            key={room.id}
                            label={room.name || 'Unknown'}
                            icon={UserCircle}
                            to={`/chat/${room.id}`}
                            active={location.pathname === `/chat/${room.id}`}
                            onDelete={() => handleDeleteRoom(room)}
                        />
                    ))}
                </div>
            </div>

            {/* Create Channel Modal */}
            {isCreateChannelOpen && (
                <CreateChannelModal onClose={() => setIsCreateChannelOpen(false)} onCreate={handleCreateChannel} />
            )}

            {/* Create DM Modal */}
            {isCreateDMOpen && (
                <CreateDMModal onClose={() => setIsCreateDMOpen(false)} onCreate={handleCreateDM} users={users} />
            )}
        </div>
    );
}

function CreateChannelModal({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string) => void }) {
    const [name, setName] = useState('');
    return (
        <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
                <h3 className="text-lg font-bold mb-4">Create Channel</h3>
                <input
                    autoFocus
                    type="text"
                    className="w-full border p-2 rounded mb-4"
                    placeholder="Channel Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={() => onCreate(name)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                </div>
            </div>
        </div>
    );
}

function CreateDMModal({ onClose, onCreate, users }: { onClose: () => void, onCreate: (userId: string) => void, users: User[] }) {
    return (
        <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 flex flex-col max-h-[80%]">
                <h3 className="text-lg font-bold mb-4">New Message</h3>
                <div className="flex-1 overflow-y-auto">
                    {users.length === 0 ? <p className="text-slate-400 p-2">No users found</p> :
                        users.map(u => (
                            <div key={u.id} onClick={() => onCreate(u.id)} className="flex items-center gap-3 p-2 hover:bg-slate-100 cursor-pointer rounded">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">{u.displayName[0]}</div>
                                <div>
                                    <div className="text-sm font-medium">{u.displayName}</div>
                                    <div className="text-xs text-slate-500">{u.email}</div>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                    <button onClick={onClose} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                </div>
            </div>
        </div>
    );
}

// Icons
function LayoutDashboardIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg> }
function ActivityIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> }
function SettingsIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg> }
