import {API_BASE_URL} from '@/config';

export interface UserInfo {
    username: string;
    isAdmin: boolean;
}

// track if user wants to see authenticated content
let showAuthContent = false;

// trigger browser's built-in authentication dialog
export async function triggerBrowserAuth(): Promise<void> {
    try {
        // fetch user endpoint with credentials to trigger browser's HTTP Basic Auth dialog
        const response = await fetch(`${API_BASE_URL}/user`, {
            credentials: 'include',
        });

        if (response.ok) {
            // authentication successful
            showAuthContent = true;

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
        showAuthContent = false;
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

// track user info
let userInfo: UserInfo | null = null;

// check if user wants to see authenticated content
export function getAuthState(): boolean {
    return showAuthContent;
}

// logout function - hides authenticated content
export function logout() {
    showAuthContent = false;
    userInfo = null;

    // notify components of logout
    window.dispatchEvent(new Event('auth-logout'));
}

// fetch user info from API
export async function fetchUserInfo(): Promise<UserInfo | null> {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/user`);
        if (!response.ok) {
            if (response.status === 401) {
                showAuthContent = false;
                userInfo = null;
            }
            return null;
        }
        const data = await response.json();
        userInfo = {username: data.username, isAdmin: data.isAdmin};
        showAuthContent = true;
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

// smart fetch that tries public access first, falls back to authenticated
export async function tryAuthenticatedFetch(
    url: string,
    options?: RequestInit,
): Promise<Response> {
    // always try public access first
    const publicResponse = await fetch(url, options);

    // if public access works or user hasn't opted in to auth, use public
    if (publicResponse.ok || !getAuthState()) {
        return publicResponse;
    }

    // public failed and user wants auth content, try with credentials
    return await fetch(url, {
        ...options,
        credentials: 'include',
    });
}
