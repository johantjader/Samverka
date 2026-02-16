import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthSession } from '@samverka/shared';
import { api } from '../utils/api';

interface AuthContextType {
    user: AuthSession | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string) => Promise<void>;
    verify: (magicToken: string) => Promise<any>;
    logout: () => void;
    updateSession: (token: string) => void;
    updateDisplayName: (name: string) => void;
    loading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to check token expiry
const isTokenValid = (token: string): boolean => {
    try {
        const decoded = jwtDecode<AuthSession>(token);
        return (decoded.exp * 1000) > Date.now();
    } catch {
        return false;
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthSession | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState<boolean>(false);
    const [bootstrapping, setBootstrapping] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Stable verify function wrapped in useCallback to prevent re-renders from recreating it
    const verify = useCallback(async (magicToken: string) => {
        setLoading(true);
        setError(null);
        try {
            // Use api.ts client which correctly strips trailing slashes
            const data = await api.verifyLink(magicToken);
            const sessionToken = data.token;

            localStorage.setItem('token', sessionToken);
            setToken(sessionToken);
            api.setToken(sessionToken);
            setUser(jwtDecode<AuthSession>(sessionToken));
            return data;
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize: Only restore existing session from localStorage.
    // Magic link verification is handled exclusively by Verify.tsx.
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken && isTokenValid(storedToken)) {
            const decoded = jwtDecode<AuthSession>(storedToken);
            setUser(decoded);
            api.setToken(storedToken);
        } else {
            // No valid session — clean up
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            api.setToken(null);
        }
        setBootstrapping(false);
    }, []);

    const login = useCallback(async (email: string) => {
        setLoading(true);
        setError(null);
        try {
            // Use api.ts client which correctly strips trailing slashes
            await api.requestAccess(email);
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        api.setToken(null);
    }, []);

    const updateSession = useCallback((newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        api.setToken(newToken);
        setUser(jwtDecode<AuthSession>(newToken));
    }, []);

    // Update display name locally without server call (stateless JWT model)
    const updateDisplayName = useCallback((name: string) => {
        setUser(prev => prev ? { ...prev, displayName: name } : prev);
    }, []);

    if (bootstrapping) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-nnc-base text-nnc-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-tech"></div>
                    <p className="font-medium animate-pulse">Laddar Samverka...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, verify, logout, updateSession, updateDisplayName, loading: loading || bootstrapping, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
