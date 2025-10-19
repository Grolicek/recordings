import {API_BASE_URL, PLAYLISTS_PATH} from '@/config';

export interface UserInfo {
    username: string;
    isAdmin: boolean;
}

// trigger browser's built-in authentication dialog
export function triggerBrowserAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
        // create a hidden iframe to trigger auth without full page redirect
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = PLAYLISTS_PATH;

        const cleanup = () => {
            if (document.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        };

        iframe.onload = async () => {
            cleanup();
            // mark as authenticated
            setAuthenticatedState(true);
            // fetch user info
            await fetchUserInfo();
            // trigger a custom event to notify components to refresh
            window.dispatchEvent(new CustomEvent('auth-success'));
            resolve();
        };

        iframe.onerror = () => {
            cleanup();
            reject(new Error('authentication failed'));
        };

        document.body.appendChild(iframe);

        // fallback: redirect to the URL after 3 seconds if iframe doesn't work
        setTimeout(() => {
            if (document.contains(iframe)) {
                cleanup();
                window.location.href = PLAYLISTS_PATH;
            }
        }, 3000);
    });
}

// fetch with authentication handling
export async function authenticatedFetch(
    url: string,
    options?: RequestInit,
    throwOnAuth = false,
): Promise<Response> {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
    });

    if (response.status === 401 && throwOnAuth) {
        throw new Error('authentication required');
    }

    return response;
}

// track if user has authenticated this session
let isAuthenticated = false;
let userInfo: UserInfo | null = null;

// set authentication state (called after successful login)
export function setAuthenticatedState(authenticated: boolean) {
    isAuthenticated = authenticated;
    if (!authenticated) {
        userInfo = null;
    }
}

// fetch user info from API
export async function fetchUserInfo(): Promise<UserInfo | null> {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/user`);
        if (!response.ok) {
            if (response.status === 401) {
                setAuthenticatedState(false);
            }
            return null;
        }
        const data = await response.json();
        userInfo = {username: data.username, isAdmin: data.isAdmin};
        return userInfo;
    } catch (error) {
        console.error('failed to fetch user info:', error);
        return null;
    }
}

// get cached user info
export function getUserInfo(): UserInfo | null {
    return userInfo;
}

// check if current user is admin
export function isAdmin(): boolean {
    return userInfo?.isAdmin || false;
}

// smart fetch that uses credentials only after user has authenticated
export async function tryAuthenticatedFetch(
    url: string,
    options?: RequestInit,
): Promise<Response> {
    if (isAuthenticated) {
        // user has logged in, use credentials
        return await fetch(url, {
            ...options,
            credentials: 'include',
        });
    } else {
        // no login yet, try public access only
        return await fetch(url, options);
    }
}
