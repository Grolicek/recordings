import {useEffect, useState} from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {authenticatedFetch} from '@/lib/auth';
import {API_BASE_URL} from '@/config';
import {ScheduleCreateDialog} from './schedule-create-dialog';
import {Trash2, Clock, Calendar} from 'lucide-react';

type RecordingStatus = 'pending' | 'recording' | 'transcoding' | 'completed' | 'failed';

interface ScheduledRecording {
    id: string;
    streamUrl: string;
    playlistName: string;
    lengthSeconds: number;
    startTime: string;
    status: RecordingStatus;
    createdAt: string;
    error?: string;
}

const statusColors: Record<RecordingStatus, string> = {
    pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    recording: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    transcoding: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

export default function ScheduleList() {
    const [recordings, setRecordings] = useState<ScheduledRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_BASE_URL}/scheduled-recordings`);
            
            if (!response.ok) {
                throw new Error('failed to fetch scheduled recordings');
            }

            const data = await response.json();
            setRecordings(data.recordings || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecordings();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('are you sure you want to cancel this scheduled recording?')) {
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/scheduled-recordings/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'failed to cancel recording');
            }

            // refresh list
            await fetchRecordings();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'failed to cancel recording');
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-muted-foreground">loading scheduled recordings…</div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-destructive">
                failed to load scheduled recordings: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">scheduled recordings</h2>
                <ScheduleCreateDialog onSuccess={fetchRecordings} />
            </div>

            {recordings.length === 0 ? (
                <div className="p-6 text-muted-foreground text-center">
                    no scheduled recordings. create one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recordings.map((recording) => (
                        <Card key={recording.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base font-medium truncate">
                                        {recording.playlistName}
                                    </CardTitle>
                                    <span
                                        className={`text-xs px-2 py-1 rounded border ${statusColors[recording.status]}`}
                                    >
                                        {recording.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-muted-foreground text-xs">start time</div>
                                        <div className="truncate">{formatDateTime(recording.startTime)}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-muted-foreground text-xs">duration</div>
                                        <div>{formatDuration(recording.lengthSeconds)}</div>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <div className="text-muted-foreground text-xs">stream url</div>
                                    <div className="text-xs truncate" title={recording.streamUrl}>
                                        {recording.streamUrl}
                                    </div>
                                </div>
                                {recording.error && (
                                    <div className="pt-1">
                                        <div className="text-destructive text-xs">
                                            error: {recording.error}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                {recording.status === 'pending' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(recording.id)}
                                        className="w-full"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        cancel
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
