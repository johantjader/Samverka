import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import Footer from '../components/Layout/Footer';

type Status = 'loading' | 'success' | 'error' | 'token-used' | 'token-expired' | 'resend-sent' | 'resending' | 'no-token';

export const Verify: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { verify } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const attemptedRef = useRef(false);
    const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');
    const [maskedEmail, setMaskedEmail] = useState('');

    useEffect(() => {
        if (!token || attemptedRef.current) return;

        const verifyToken = async () => {
            attemptedRef.current = true;

            try {
                const data = await verify(token);
                setStatus('success');

                setTimeout(() => {
                    if (data && data.meetingId) {
                        navigate(`/m/${data.meetingId}`, { replace: true });
                    } else {
                        navigate('/', { replace: true });
                    }
                }, 500);
            } catch (err: any) {
                console.error('Verification failed:', err);
                const errorCode = err?.data?.error;

                if (errorCode === 'TOKEN_USED') {
                    setStatus('token-used');
                    setMaskedEmail(err.data.email || '');
                } else if (errorCode === 'TOKEN_EXPIRED') {
                    setStatus('token-expired');
                    setMaskedEmail(err.data.email || '');
                } else {
                    setStatus('error');
                }
            }
        };

        verifyToken();
    }, [token, verify, navigate]);

    const handleResend = async () => {
        if (!token) return;
        setStatus('resending');
        try {
            const data = await api.resendLink(token);
            setMaskedEmail(data.email || maskedEmail);
            setStatus('resend-sent');
        } catch (err) {
            console.error('Resend failed:', err);
            setStatus('error');
        }
    };

    const renderContent = () => {
        // No token in URL or error
        if (status === 'no-token' || status === 'error') {
            return (
                <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                    <div className="bg-nnc-surface p-8 rounded-lg border border-nnc-subtle text-center max-w-md w-full">
                        <h2 className="text-xl font-mono font-bold text-nnc-primary mb-2">{t('common.error')}</h2>
                        <p className="text-nnc-muted mb-6">{t('auth.invalidLink')}</p>
                        <Link to="/" className="text-accent-action hover:text-accent-action/80 font-medium">
                            {t('create.createButton')}
                        </Link>
                    </div>
                </div>
            );
        }

        // Token used or expired — show resend button
        if (status === 'token-used' || status === 'token-expired') {
            const message = status === 'token-used' ? t('auth.linkUsed') : t('auth.linkExpired');
            return (
                <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                    <div className="bg-nnc-surface p-8 rounded-lg border border-nnc-subtle text-center max-w-md w-full">
                        <h2 className="text-xl font-mono font-bold text-nnc-primary mb-2">{message}</h2>
                        {maskedEmail && (
                            <p className="text-nnc-muted mb-4 text-sm">{maskedEmail}</p>
                        )}
                        <button
                            onClick={handleResend}
                            className="w-full py-3 px-4 bg-accent-action text-white font-medium rounded-lg hover:bg-accent-action/90 transition-colors"
                        >
                            {t('auth.resendLink')}
                        </button>
                    </div>
                </div>
            );
        }

        // Resending in progress
        if (status === 'resending') {
            return (
                <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-tech mb-4"></div>
                        <p className="text-nnc-muted">{t('auth.sending')}</p>
                    </div>
                </div>
            );
        }

        // Resend successful
        if (status === 'resend-sent') {
            return (
                <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                    <div className="bg-nnc-surface p-8 rounded-lg border border-nnc-subtle text-center max-w-md w-full">
                        <div className="text-accent-tech text-4xl mb-4">&#9993;</div>
                        <h2 className="text-xl font-mono font-bold text-nnc-primary mb-2">{t('auth.linkSent')}</h2>
                        {maskedEmail && (
                            <p className="text-nnc-muted text-sm">{maskedEmail}</p>
                        )}
                    </div>
                </div>
            );
        }

        // Success — verified
        if (status === 'success') {
            return (
                <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                    <div className="flex flex-col items-center">
                        <div className="text-accent-tech text-4xl mb-4">&check;</div>
                        <p className="text-nnc-primary font-mono">{t('auth.verified')}</p>
                    </div>
                </div>
            );
        }

        // Loading state
        return (
            <div className="flex items-center justify-center min-h-screen nnc-grid p-6">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-tech mb-4"></div>
                    <p className="text-nnc-muted">{t('auth.verifying')}</p>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            <Footer />
        </>
    );
};
