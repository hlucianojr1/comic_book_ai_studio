
import { useState, useEffect, useCallback, useLayoutEffect, RefObject } from 'react';

// This would come from your environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

export const useGoogleAuth = () => {
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const signOut = useCallback(() => {
        const storedToken = localStorage.getItem('g-token');
        if (storedToken && window.google) {
            const token = JSON.parse(storedToken).access_token;
            try {
                window.google.accounts.oauth2.revoke(token, () => {
                    console.log('Token revoked');
                });
            } catch (e) {
                console.error("Error revoking token", e);
            }
        }
        localStorage.removeItem('g-token');
        setUser(null);
        setIsSignedIn(false);
    }, []);

    const fetchUserProfile = useCallback(async (accessToken: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const profile = await response.json();
                setUser(profile);
            } else {
                signOut();
            }
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            signOut();
        }
    }, [signOut]);

    useEffect(() => {
        const initClients = () => {
            // GAPI client for Picker
            window.gapi.load('client:picker', () => {
                console.log('gapi client and picker loaded');
            });

            // GSI client for Auth
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        const tokenDataWithTimestamp = { ...tokenResponse, issued_at: Date.now() };
                        localStorage.setItem('g-token', JSON.stringify(tokenDataWithTimestamp));
                        setIsSignedIn(true);
                        fetchUserProfile(tokenResponse.access_token);
                    }
                },
            });
            setTokenClient(client);
            setIsAuthReady(true);
        };

        // This function will be called by the scripts in index.html once they are loaded
        window.onGoogleScriptsLoad = initClients;
        
        // If scripts are already loaded by the time this effect runs
        if (window.gapiLoaded && window.gsiLoaded) {
            initClients();
        }

        return () => {
            window.onGoogleScriptsLoad = undefined;
        };
    }, [fetchUserProfile]);

    useEffect(() => {
        if (!isAuthReady) return;

        const storedToken = localStorage.getItem('g-token');
        if (storedToken) {
            const tokenData = JSON.parse(storedToken);
            // Check if token is expired (expires_in is in seconds)
            const isExpired = (tokenData.issued_at + (tokenData.expires_in * 1000)) < Date.now();

            if (!isExpired) {
                 setIsSignedIn(true);
                 fetchUserProfile(tokenData.access_token);
            } else {
                 localStorage.removeItem('g-token');
            }
        }
    }, [isAuthReady, fetchUserProfile]);


    const signIn = () => {
        if (tokenClient) {
            // Prompt for consent if user has not granted permission before
            tokenClient.requestAccessToken({ prompt: '' });
        } else {
            console.error("Google Token Client not initialized.");
            alert("Sign-in is not ready yet. Please try again in a moment.");
        }
    };

    return { tokenClient, user, isSignedIn, signIn, signOut };
};

// --- Fullscreen Hook ---

// Type definitions for cross-browser fullscreen API
interface DocumentWithFullscreen extends Document {
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
    webkitFullscreenElement?: Element;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithFullscreen extends HTMLElement {
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
}

export const useFullscreen = (elRef: RefObject<HTMLElement>) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!elRef.current) return;

        const element = elRef.current as HTMLElementWithFullscreen;
        const doc = document as DocumentWithFullscreen;

        if (
            !doc.fullscreenElement &&
            !doc.mozFullScreenElement &&
            !doc.webkitFullscreenElement &&
            !doc.msFullscreenElement
        ) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else {
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
            } else if (doc.msExitFullscreen) {
                doc.msExitFullscreen();
            }
        }
    }, [elRef]);

    useLayoutEffect(() => {
        const doc = document as DocumentWithFullscreen;
        const onFullscreenChange = () => {
            const isFs = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
            setIsFullscreen(isFs);
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
        document.addEventListener('mozfullscreenchange', onFullscreenChange);
        document.addEventListener('MSFullscreenChange', onFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('mozfullscreenchange', onFullscreenChange);
            document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        };
    }, []);

    return { isFullscreen, toggleFullscreen };
};
