import {useEffect, useRef} from 'react';
import Hls from 'hls.js';
import {Card} from '@/components/ui/card';
import {getAuthState} from '@/lib/auth';

interface Props {
    src: string;
    title?: string;
}

export default function VideoPlayer({src, title}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current!;
        let hls: Hls | null = null;

        const isAuthenticated = getAuthState();

        if (Hls.isSupported()) {
            hls = new Hls({
                maxBufferLength: 60,
                startPosition: -1,
                xhrSetup: (xhr) => {
                    // browser automatically includes credentials for same-origin requests
                    // when using Basic Auth, so we just need to enable credentials
                    xhr.withCredentials = true;
                },
            });
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('hls fatal error:', data);
                    if (data.response?.code === 401 || data.response?.code === 403) {
                        console.error('authentication required for this recording');
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // for safari native HLS - enable credentials
            video.crossOrigin = 'use-credentials';
            video.src = src;
        } else {
            console.error('hls not supported in this browser');
        }

        return () => {
            if (hls) hls.destroy();
        };
    }, [src]);

    return (
        <Card className="overflow-hidden bg-black">
            <video
                ref={videoRef}
                controls
                className="w-full h-auto aspect-video"
                playsInline
                preload="metadata"
                aria-label={title || 'video player'}
            />
        </Card>
    );
}
