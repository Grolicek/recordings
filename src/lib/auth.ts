import {API_BASE_URL} from '@/config';

export interface UserInfo {
    username: string;
    isAdmin: boolean;
}

const AUTH_SESSION_KEY = 'recordings-auth';

// trigger browser's built-in authentication dialog
export async function triggerBrowserAuth(): Promise<void> {
    try {
        // fetch user endpoint with credentials to trigger browser's HTTP Basic Auth dialog
        const response = await fetch(`${API_BASE_URL}/user`, {
            credentials: 'include',
        });

        if (response.ok) {
            // authentication successful
            setAuthenticatedState(true);

            // fetch and cache user info
            await fetchUserInfo();

            // notify components of successful authentication
            window.dispatchEvent(new Event('auth-success'));
        } else if (response.status === 401) {
            throw new Error('authentication failed');
        } else {
            throw new Error('authentication error');
        }
    } catch (error) {
        setAuthenticatedState(false);
        throw error;
    }
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
let userInfo: UserInfo | null = null;

// initialize auth state from session storage
export function getAuthState(): boolean {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
}

// set authentication state (called after successful login)
export function setAuthenticatedState(authenticated: boolean) {
    if (authenticated) {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    } else {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        userInfo = null;
    }
}

// logout function
export function logout() {
    setAuthenticatedState(false);

    // notify components of logout
    window.dispatchEvent(new Event('auth-logout'));
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
    if (getAuthState()) {
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
