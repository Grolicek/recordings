import {PLAYLISTS_PATH} from '@/config';

// trigger browser's built-in authentication dialog
export function triggerBrowserAuth(): void {
    // create a hidden iframe to trigger auth without full page redirect
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = PLAYLISTS_PATH;

    iframe.onload = () => {
        // once authenticated, reload the page
        window.location.reload();
    };

    iframe.onerror = () => {
        // if auth fails, show error message
        alert('authentication failed. please try again.');
    };

    document.body.appendChild(iframe);

    // fallback: redirect to the URL after 2 seconds if iframe doesn't work
    setTimeout(() => {
        if (document.contains(iframe)) {
            window.location.href = PLAYLISTS_PATH;
        }
    }, 2000);
}

// fetch with authentication handling
export async function authenticatedFetch(
    url: string,
    options?: RequestInit,
): Promise<Response> {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
    });

    if (response.status === 401) {
        triggerBrowserAuth();
        throw new Error('authentication required');
    }

    return response;
}
