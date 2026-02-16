import React, { useState } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import Footer from '../components/Layout/Footer';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreateMeeting: React.FC = () => {
    const { t, language } = useLanguage();

    // Success state
    const [successMeetingId, setSuccessMeetingId] = useState<string | null>(null);

    // Identity state (public)
    const [creatorEmail, setCreatorEmail] = useState('');
    const [creatorName, setCreatorName] = useState('');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic] = useState(true); // Default to true for public tool

    // Invite autocomplete state
    const [inviteQuery, setInviteQuery] = useState('');
    const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [slots, setSlots] = useState<{ date: string; start: string; end: string }[]>([
        { date: '', start: '09:00', end: '10:00' }
    ]);
    const [submitting, setSubmitting] = useState(false);

    // Validation error states
    const [errors, setErrors] = useState<{
        creatorEmail?: string;
        creatorName?: string;
        title?: string;
        slots?: string;
        general?: string;
    }>({});

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    const addInvite = (rawEmail: string) => {
        const email = rawEmail.trim().toLowerCase();
        if (!email) {
            setInviteError(null);
            return;
        }
        if (!emailRegex.test(email)) {
            setInviteError(t('validation.emailInvalid') || 'Invalid email address');
            return;
        }
        if (!selectedInvites.includes(email)) {
            setSelectedInvites([...selectedInvites, email]);
        }
        setInviteQuery('');
        setInviteError(null);
    };

    const removeInvite = (email: string) => {
        setSelectedInvites(prev => prev.filter(i => i !== email));
    };

    const addSlot = () => {
        setSlots([...slots, { date: '', start: '09:00', end: '10:00' }]);
    };

    const updateSlot = (index: number, field: keyof typeof slots[0], value: string) => {
        const newSlots = [...slots];
        newSlots[index][field] = value;
        setSlots(newSlots);
    };

    const removeSlot = (index: number) => {
        setSlots(slots.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset errors
        setErrors({});

        // Client-side validation
        const newErrors: typeof errors = {};

        // Validate required fields
        if (!title.trim()) {
            newErrors.title = t('validation.titleRequired') || 'Title is required';
        }

        if (!creatorName.trim()) {
            newErrors.creatorName = t('validation.nameRequired') || 'Name is required';
        }

        if (!creatorEmail.trim()) {
            newErrors.creatorEmail = t('validation.emailRequired') || 'Email is required';
        } else {
            // Validate email format
            if (!emailRegex.test(creatorEmail.trim())) {
                newErrors.creatorEmail = t('validation.emailInvalid') || 'Email format is invalid';
            }
        }

        // Validate slots - require date/time and check for past dates
        const hasMissingSlotValues = slots.some(slot => !slot.date || !slot.start || !slot.end);
        if (hasMissingSlotValues) {
            newErrors.slots = t('validation.slotRequired') || 'All slots must include date, start, and end time';
        } else {
            const hasInvalidDate = slots.some(slot => {
                const slotDate = new Date(slot.date);
                const todayDate = new Date(today);
                return slotDate < todayDate;
            });

            if (hasInvalidDate) {
                newErrors.slots = t('validation.pastDate') || 'Cannot select dates in the past';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return; // Stop submission
        }

        setSubmitting(true);

        try {
            const formattedSlots = slots.map(s => {
                const startDateTime = new Date(`${s.date}T${s.start}:00`).toISOString();
                const endDateTime = new Date(`${s.date}T${s.end}:00`).toISOString();
                return { startTime: startDateTime, endTime: endDateTime };
            });

            const body = {
                title: title.trim(), // Sanitize
                description: description.trim(),
                slots: formattedSlots,
                isPublic,
                invitedEmails: selectedInvites.map(e => e.trim().toLowerCase()), // Sanitize
                creatorEmail: creatorEmail.trim().toLowerCase(), // Sanitize + normalize
                creatorName: creatorName.trim(), // Sanitize
                language
            };

            const response = await api.post('/meetings', body);
            setSuccessMeetingId(response.meetingId);
        } catch (error: any) {
            console.error(error);
            if (error.details && Array.isArray(error.details)) {
                const fieldErrors: Record<string, string> = {};
                for (const issue of error.details) {
                    const path = issue.path?.join('.');
                    if (path?.startsWith('slots')) {
                        fieldErrors.slots = issue.message;
                    } else if (path === 'title') {
                        fieldErrors.title = issue.message;
                    } else if (path === 'creatorEmail') {
                        fieldErrors.creatorEmail = issue.message;
                    } else if (path === 'creatorName') {
                        fieldErrors.creatorName = issue.message;
                    } else {
                        fieldErrors.general = issue.message;
                    }
                }
                setErrors(fieldErrors);
            } else {
                setErrors({ general: error.message || t('common.error') });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (successMeetingId) {
        return (
            <>
                <div className="min-h-screen bg-nnc-base flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-nnc-surface rounded-lg border border-nnc-subtle p-8 text-center">
                        <div className="w-16 h-16 bg-green-900 bg-opacity-20 text-accent-tech rounded-full flex items-center justify-center mx-auto mb-4 border border-accent-tech">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-2xl font-mono font-bold text-nnc-primary mb-2">{t('create.successTitle') || "Mötet är skapat!"}</h2>
                        <p className="text-nnc-muted mb-6">
                            Vi har skickat en <strong className="text-nnc-primary">Admin-länk</strong> till <strong className="text-nnc-primary">{creatorEmail}</strong>.
                            Du måste använda den länken för att hantera mötet och fastställa en tid.
                        </p>
                        <div className="bg-accent-tech bg-opacity-10 p-4 rounded-lg border border-accent-tech mb-6">
                            <p className="text-sm text-accent-tech font-medium">Kolla din inkorg (och skräppost) nu!</p>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-nnc-base p-8 flex flex-col">
                {/* Brand Header */}
                <div className="text-center mb-12 mt-12">
                    <h1 className="text-6xl font-mono font-bold text-nnc-primary mb-3 tracking-tight">
                        Samverka
                    </h1>
                    <p className="text-lg text-nnc-muted font-sans">
                        Enklare och säkrare mötesbokning
                    </p>
                </div>

                {/* Form - Centered */}
                <div className="flex-1 flex items-start justify-center">
                    <div className="max-w-2xl w-full bg-nnc-surface rounded-lg border border-nnc-subtle p-8">
                        <h2 className="text-2xl font-mono font-bold mb-8 text-nnc-primary">Nytt mötesförslag</h2>
                        <form onSubmit={handleSubmit}>

                            {/* Step 1: About You */}
                            <div className="mb-8 p-6 bg-nnc-base rounded-lg border border-nnc-subtle">
                                <h3 className="text-sm font-mono font-semibold text-accent-tech mb-4 uppercase tracking-wider">01. {t('create.step2Title')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="creatorEmail" className="block text-sm font-medium text-nnc-primary mb-2">{t('create.emailLabel')}</label>
                                        <input
                                            type="email"
                                            id="creatorEmail"
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition-colors ${
                                                errors.creatorEmail
                                                    ? 'border-red-500 focus:ring-red-500 bg-red-900 bg-opacity-10'
                                                    : 'border-nnc-subtle focus:ring-accent-tech focus:border-accent-tech bg-nnc-base'
                                            } text-nnc-primary placeholder-nnc-muted`}
                                            value={creatorEmail}
                                            onChange={(e) => {
                                                setCreatorEmail(e.target.value);
                                                if (errors.creatorEmail) {
                                                    setErrors({ ...errors, creatorEmail: undefined });
                                                }
                                            }}
                                            placeholder="namn@företag.se"
                                        />
                                        {errors.creatorEmail && (
                                            <p className="text-red-400 text-sm mt-1">{errors.creatorEmail}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="creatorName" className="block text-sm font-medium text-nnc-primary mb-2">{t('create.nameLabel')}</label>
                                        <input
                                            type="text"
                                            id="creatorName"
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition-colors ${
                                                errors.creatorName
                                                    ? 'border-red-500 focus:ring-red-500 bg-red-900 bg-opacity-10'
                                                    : 'border-nnc-subtle focus:ring-accent-tech focus:border-accent-tech bg-nnc-base'
                                            } text-nnc-primary placeholder-nnc-muted`}
                                            value={creatorName}
                                            onChange={(e) => {
                                                setCreatorName(e.target.value);
                                                if (errors.creatorName) {
                                                    setErrors({ ...errors, creatorName: undefined });
                                                }
                                            }}
                                            placeholder="Anna Andersson"
                                        />
                                        {errors.creatorName && (
                                            <p className="text-red-400 text-sm mt-1">{errors.creatorName}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Meeting Details */}
                            <div className="mb-8">
                                <h3 className="text-sm font-mono font-semibold text-accent-tech mb-4 uppercase tracking-wider">02. {t('create.step1Title')}</h3>
                                <div className="mb-4">
                                    <label htmlFor="title" className="block text-sm font-medium text-nnc-primary mb-2">{t('create.titleLabel')}</label>
                                    <input
                                        type="text"
                                        id="title"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition-colors ${
                                            errors.title
                                                ? 'border-red-500 focus:ring-red-500 bg-red-900 bg-opacity-10'
                                                : 'border-nnc-subtle focus:ring-accent-tech focus:border-accent-tech bg-nnc-base'
                                        } text-nnc-primary placeholder-nnc-muted`}
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            if (errors.title) {
                                                setErrors({ ...errors, title: undefined });
                                            }
                                        }}
                                        placeholder="Projektavstämning v.42"
                                    />
                                    {errors.title && (
                                        <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="description" className="block text-sm font-medium text-nnc-primary mb-2">{t('create.descLabel')}</label>
                                    <textarea
                                        id="description"
                                        className="w-full px-4 py-3 border border-nnc-subtle rounded-lg focus:ring-2 focus:ring-accent-tech focus:border-accent-tech h-24 bg-nnc-base text-nnc-primary placeholder-nnc-muted transition-colors"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Valfri beskrivning av mötet..."
                                    />
                                </div>
                            </div>

                            {/* Step 3: Time Slots */}
                            <div className="mb-8">
                                <h3 className="text-sm font-mono font-semibold text-accent-tech mb-4 uppercase tracking-wider">03. {t('create.step3Title')}</h3>
                                {slots.map((slot, index) => (
                                    <div key={index} className="flex gap-2 mb-3 items-end">
                                        <div className="flex-1">
                                            <label htmlFor={`slot-date-${index}`} className="text-xs text-nnc-muted block mb-1 font-medium">Datum</label>
                                            <input
                                                type="date"
                                                id={`slot-date-${index}`}
                                                name={`slot-date-${index}`}
                                                min={today}
                                                className="w-full px-2 py-2 border border-nnc-subtle rounded-lg bg-nnc-base text-nnc-primary"
                                                value={slot.date}
                                                onChange={(e) => updateSlot(index, 'date', e.target.value)}
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label htmlFor={`slot-start-${index}`} className="text-xs text-nnc-muted block mb-1 font-medium">Start</label>
                                            <input
                                                type="time"
                                                id={`slot-start-${index}`}
                                                name={`slot-start-${index}`}
                                                className="w-full px-2 py-2 border border-nnc-subtle rounded-lg bg-nnc-base text-nnc-primary"
                                                value={slot.start}
                                                onChange={(e) => updateSlot(index, 'start', e.target.value)}
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label htmlFor={`slot-end-${index}`} className="text-xs text-nnc-muted block mb-1 font-medium">Slut</label>
                                            <input
                                                type="time"
                                                id={`slot-end-${index}`}
                                                name={`slot-end-${index}`}
                                                className="w-full px-2 py-2 border border-nnc-subtle rounded-lg bg-nnc-base text-nnc-primary"
                                                value={slot.end}
                                                onChange={(e) => updateSlot(index, 'end', e.target.value)}
                                                style={{ colorScheme: 'dark' }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSlot(index)}
                                            className="text-red-400 hover:text-red-300 mb-2 px-3 py-2 transition-colors"
                                            disabled={slots.length === 1}
                                            aria-label={`Ta bort tid ${index + 1}`}
                                        >
                                            <span className="text-2xl">&times;</span>
                                        </button>
                                    </div>
                                ))}
                                {errors.slots && (
                                    <p className="text-red-400 text-sm mt-2 mb-3">{errors.slots}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={addSlot}
                                    className="text-sm text-accent-tech hover:text-opacity-80 mt-2 font-medium transition-colors"
                                >
                                    + {t('create.addSlot')}
                                </button>
                            </div>

                            {/* Step 4: Access & Invites */}
                            <div className="mb-8 p-6 bg-nnc-base rounded-lg border border-nnc-subtle">
                                <h4 className="text-sm font-medium text-nnc-primary mb-3">Bjud in deltagare (valfritt)</h4>
                                <input
                                    type="text"
                                    id="invite-email-input"
                                    name="inviteEmail"
                                    aria-label="Lägg till e-postadresser för att bjuda in deltagare"
                                    placeholder="Lägg till e-postadresser..."
                                    className="w-full px-4 py-3 border border-nnc-subtle rounded-lg text-sm mb-3 bg-nnc-base text-nnc-primary placeholder-nnc-muted focus:ring-2 focus:ring-accent-tech transition-colors"
                                    value={inviteQuery}
                                    onChange={(e) => {
                                        setInviteQuery(e.target.value);
                                        if (inviteError) {
                                            setInviteError(null);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addInvite(inviteQuery);
                                        }
                                    }}
                                    onBlur={() => addInvite(inviteQuery)}
                                />
                                {inviteError && (
                                    <p className="text-red-400 text-sm mb-2">{inviteError}</p>
                                )}
                                {selectedInvites.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedInvites.map(email => (
                                            <span key={email} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-accent-tech bg-opacity-10 text-accent-tech border border-accent-tech">
                                                {email}
                                                <button type="button" onClick={() => removeInvite(email)} className="ml-0.5 hover:text-red-400 transition-colors">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-nnc-muted">Dessa personer får en inbjudan via e-post direkt.</p>
                            </div>


                            {errors.general && (
                                <div className="mb-4 p-4 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg">
                                    <p className="text-red-400 text-sm font-medium">{errors.general}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-nnc-subtle">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-accent-action text-white py-4 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {t('create.creating')}
                                        </span>
                                    ) : (
                                        t('create.createButton')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <Footer />
        </>
    );
};
