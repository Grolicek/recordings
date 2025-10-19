import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {authenticatedFetch} from '@/lib/auth';
import {API_BASE_URL} from '@/config';
import {Plus} from 'lucide-react';

interface ScheduleCreateDialogProps {
    onSuccess: () => void;
}

export function ScheduleCreateDialog({onSuccess}: ScheduleCreateDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        streamUrl: '',
        playlistName: '',
        lengthSeconds: '',
        startTime: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // validation
        const lengthSecondsNum = parseInt(formData.lengthSeconds, 10);
        if (lengthSecondsNum <= 0) {
            setError('length must be greater than 0');
            return;
        }

        const startDate = new Date(formData.startTime);
        if (isNaN(startDate.getTime())) {
            setError('invalid start time');
            return;
        }

        if (startDate <= new Date()) {
            setError('start time must be in the future');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/schedule-recording`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    streamUrl: formData.streamUrl,
                    playlistName: formData.playlistName,
                    lengthSeconds: lengthSecondsNum,
                    startTime: startDate.toISOString(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'failed to create schedule');
            }

            // reset form
            setFormData({
                streamUrl: '',
                playlistName: '',
                lengthSeconds: '',
                startTime: '',
            });
            setOpen(false);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'failed to create schedule');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4"/>
                new schedule
            </Button>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>create new schedule</DialogTitle>
                    <DialogDescription>
                        schedule a new recording to start at a specific time
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="streamUrl" className="text-sm font-medium text-foreground">
                            stream url
                        </label>
                        <input
                            id="streamUrl"
                            type="text"
                            required
                            value={formData.streamUrl}
                            onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                            placeholder="https://example.com/stream.m3u8"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="playlistName" className="text-sm font-medium text-foreground">
                            playlist name
                        </label>
                        <input
                            id="playlistName"
                            type="text"
                            required
                            value={formData.playlistName}
                            onChange={(e) => setFormData({...formData, playlistName: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                            placeholder="my-recording"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="lengthSeconds" className="text-sm font-medium text-foreground">
                            length (seconds)
                        </label>
                        <input
                            id="lengthSeconds"
                            type="number"
                            required
                            min="1"
                            value={formData.lengthSeconds}
                            onChange={(e) => setFormData({...formData, lengthSeconds: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                            placeholder="3600"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="startTime" className="text-sm font-medium text-foreground">
                            start time
                        </label>
                        <input
                            id="startTime"
                            type="datetime-local"
                            required
                            value={formData.startTime}
                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'creating...' : 'create schedule'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
