import {useEffect, useMemo, useState} from 'react';
import VideoPlayer from './video-player';
import {Card, CardContent, CardFooter, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {PLAYLISTS_PATH} from '@/config';
import {tryAuthenticatedFetch} from '@/lib/auth';
import {ArrowLeft} from 'lucide-react';

type Playlist = {
    name: string;
    folder: string;
    m3u8Path: string;
};

// parse apache directory listing to get folder names
function parsePlaylistFolders(html: string): string[] {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const folders: string[] = [];
    for (const a of links) {
        const href = a.getAttribute('href') || '';
        // skip empty, parent directory, current directory, query strings, or absolute paths
        if (!href || href === '../' || href === './' || href.startsWith('?') || href.startsWith('/')) continue;
        // only list directories (end with /)
        if (href.endsWith('/')) {
            const folderName = href.replace(/\/$/, '');
            // extra safety: skip if folder name contains .. or starts with /
            if (!folderName.includes('..') && !folderName.startsWith('/')) {
                folders.push(folderName);
            }
        }
    }
    // sort by name
    folders.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
    return folders;
}

// check if playlist folder has both .m3u8 and init.mp4
async function validatePlaylistFolder(folderPath: string): Promise<string | null> {
    try {
        const res = await tryAuthenticatedFetch(folderPath);
        
        // silently skip folders that require authentication
        if (res.status === 401) {
            return null;
        }
        
        if (!res.ok) {
            return null;
        }
        
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        let m3u8File: string | null = null;
        let hasInit = false;

        for (const a of links) {
            const href = a.getAttribute('href') || '';
            if (href.endsWith('.m3u8')) {
                m3u8File = href;
            }
            if (href === 'init.mp4') {
                hasInit = true;
            }
        }

        // only return m3u8 if both files exist
        if (m3u8File && hasInit) {
            return m3u8File;
        }
    } catch (e: any) {
        // silently ignore errors (including auth failures)
        console.debug(`skipping folder ${folderPath}:`, e.message);
    }
    return null;
}

export default function VideoList() {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Playlist | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        // first, fetch the list of playlist folders
        tryAuthenticatedFetch(PLAYLISTS_PATH)
            .then((res) => res.text())
            .then(async (html) => {
                if (cancelled) return;
                const folders = parsePlaylistFolders(html);

                // for each folder, validate it has both .m3u8 and init.mp4
                const playlistPromises = folders.map(async (folder) => {
                    const folderPath = `${PLAYLISTS_PATH}${folder}/`;
                    const m3u8File = await validatePlaylistFolder(folderPath);
                    if (m3u8File) {
                        return {
                            name: folder,
                            folder,
                            m3u8Path: `${folderPath}${m3u8File}`,
                        };
                    }
                    return null;
                });

                const results = await Promise.all(playlistPromises);
                const validPlaylists = results.filter((p): p is Playlist => p !== null);

                if (!cancelled) {
                    setPlaylists(validPlaylists);
                    setError(null);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e.message || 'failed to load');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    // listen for auth success events to refresh the list
    useEffect(() => {
        const handleAuthSuccess = () => {
            setRefreshKey(prev => prev + 1);
        };

        window.addEventListener('auth-success', handleAuthSuccess);
        return () => window.removeEventListener('auth-success', handleAuthSuccess);
    }, []);

    const content = useMemo(() => {
        if (loading) {
            return (
                <div className="p-6 text-muted-foreground">loading recordings…</div>
            );
        }
        if (error) {
            return (
                <div className="p-6 text-destructive">
                    failed to load recordings: {error}
                </div>
            );
        }
        if (playlists.length === 0) {
            return (
                <div className="p-6 text-muted-foreground">no recordings found.</div>
            );
        }

        if (selected) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setSelected(null)}
                        >
                            <ArrowLeft/> back to list
                        </Button>
                        <h2 className="text-lg font-semibold truncate">
                            {selected.name}
                        </h2>
                    </div>
                    <VideoPlayer src={selected.m3u8Path} title={selected.name}/>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                    <Card
                        key={playlist.folder}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => setSelected(playlist)}
                    >
                        <CardContent className="p-0">
                            <div className="aspect-video w-full overflow-hidden relative">
                                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                                    <span className="text-xs opacity-80">
                                        {playlist.name}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start">
                            <CardTitle className="text-sm font-medium truncate w-full">
                                {playlist.name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground">HLS recording</div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    }, [loading, error, playlists, selected]);

    return <div>{content}</div>;
}
