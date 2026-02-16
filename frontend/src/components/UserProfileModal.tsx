import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const UserProfileModal: React.FC = () => {
    const { user, updateDisplayName } = useAuth();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');

    useEffect(() => {
        if (user && (!user.displayName || user.displayName?.trim() === '' || user.displayName === user.email)) {
            setIsOpen(true);
            setName(user.displayName && user.displayName !== user.email ? user.displayName : '');
        } else {
            setIsOpen(false);
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        // Update display name locally (no server call needed — stateless JWT model)
        updateDisplayName(name.trim());
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-nnc-surface rounded-xl shadow-2xl p-6 w-full max-w-md border border-nnc-subtle">
                <h2 className="text-2xl font-mono font-bold text-nnc-primary mb-2">{t('profile.welcome') || 'Välkommen!'}</h2>
                <p className="text-nnc-muted mb-6">{t('profile.chooseName') || 'Välj ett visningsnamn så dina kollegor känner igen dig.'}</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="displayName" className="block text-sm font-medium text-nnc-muted mb-1">
                            {t('profile.displayName') || 'Visningsnamn'}
                        </label>
                        <input
                            type="text"
                            id="displayName"
                            name="displayName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-nnc-subtle rounded-lg bg-nnc-base text-nnc-primary focus:ring-2 focus:ring-accent-tech focus:border-accent-tech outline-none transition-all"
                            placeholder="t.ex. Johan Olsson"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-accent-action text-white py-2.5 rounded-lg font-medium hover:bg-accent-action/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('profile.setName') || 'Spara namn'}
                    </button>
                </form>
            </div>
        </div>
    );
};
