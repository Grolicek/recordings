import {useEffect, useRef} from 'react';
import Hls from 'hls.js';
import {Card} from '@/components/ui/card';

interface Props {
    src: string;
    title?: string;
}

export default function VideoPlayer({src, title}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current!;
        let hls: Hls | null = null;

        if (Hls.isSupported()) {
            hls = new Hls({
                maxBufferLength: 60,
                startPosition: -1,
                xhrSetup: (xhr) => {
                    // include credentials for authenticated requests
                    xhr.withCredentials = true;
                },
            });
            hls.loadSource(src);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // for safari native HLS - credentials are sent automatically
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
