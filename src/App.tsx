import VideoList from './components/video-list';
import {ThemeToggle} from '@/components/theme-toggle';
import {LoginButton} from '@/components/login-button';

export default function App() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold tracking-tight">
                        recordings
                    </h1>
                    <div className="flex items-center gap-2">
                        <LoginButton/>
                        <ThemeToggle/>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">
                <VideoList/>
            </main>
            <footer className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
                recordings.muni.oga.sk · created by groli
            </footer>
        </div>
    );
}
