import {useEffect, useMemo, useState} from 'react';
import VideoPlayer from './video-player';
import {Card, CardContent, CardFooter, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {API_BASE_URL} from '@/config';
import {tryAuthenticatedFetch} from '@/lib/auth';
import {ArrowLeft} from 'lucide-react';

type Recording = {
    id: number;
    folder_name: string;
    name: string;
    access_level: string;
    created_at: string;
    file_size: number | null;
    modified: string | null;
    duration: number | null;
};

export default function VideoList() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Recording | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        // fetch recordings from API
        tryAuthenticatedFetch(`${API_BASE_URL}/recordings-list`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('failed to fetch recordings');
                }
                return res.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setRecordings(data.recordings || []);
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

    // listen for auth events to refresh the list
    useEffect(() => {
        const handleAuthChange = () => {
            setRefreshKey(prev => prev + 1);
        };

        window.addEventListener('auth-success', handleAuthChange);
        window.addEventListener('auth-logout', handleAuthChange);
        return () => {
            window.removeEventListener('auth-success', handleAuthChange);
            window.removeEventListener('auth-logout', handleAuthChange);
        };
    }, []);

    const content = useMemo(() => {
        if (loading) {
            return <div className="p-6 text-muted-foreground">loading recordings…</div>;
        }
        if (error) {
            return (
                <div className="p-6 text-destructive">failed to load recordings: {error}</div>
            );
        }
        if (recordings.length === 0) {
            return <div className="p-6 text-muted-foreground">no recordings found</div>;
        }

        if (selected) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setSelected(null)}>
                            <ArrowLeft/> back to list
                        </Button>
                        <h2 className="text-lg font-semibold truncate">{selected.name}</h2>
                    </div>
                    <VideoPlayer
                        src={`${API_BASE_URL}/stream/${selected.folder_name}/playlist.m3u8`}
                        title={selected.name}
                    />
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recordings.map((recording) => (
                    <Card
                        key={recording.folder_name}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => setSelected(recording)}
                    >
                        <CardContent className="p-0">
                            <div className="aspect-video w-full overflow-hidden relative">
                                <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                                    <span className="text-xs opacity-80">{recording.name}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start">
                            <CardTitle className="text-sm font-medium truncate w-full">
                                {recording.name}
                            </CardTitle>
                            <div className="text-xs text-muted-foreground">HLS recording</div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    }, [loading, error, recordings, selected]);

    return <div>{content}</div>;
}
