import {useEffect, useState} from 'react';
import VideoList from './components/video-list';
import ScheduleList from './components/schedule-list';
import {Navigation} from '@/components/navigation';
import {ThemeToggle} from '@/components/theme-toggle';
import {LoginButton} from '@/components/login-button';
import {fetchUserInfo, isAdmin} from '@/lib/auth';

type View = 'recordings' | 'schedules';

export default function App() {
    const [currentView, setCurrentView] = useState<View>('recordings');
    const [showSchedules, setShowSchedules] = useState(false);

    useEffect(() => {
        // try to fetch user info on mount (but don't trigger auth dialog)
        fetchUserInfo().then((info) => {
            if (info) {
                setShowSchedules(info.isAdmin);
            }
        });
    }, []);

    // listen for auth success events to refresh user info
    useEffect(() => {
        const handleAuthSuccess = () => {
            fetchUserInfo().then(() => {
                setShowSchedules(isAdmin());
            });
        };

        window.addEventListener('auth-success', handleAuthSuccess);
        return () => window.removeEventListener('auth-success', handleAuthSuccess);
    }, []);

    const handleViewChange = (view: View) => {
        // only allow schedules view if user is admin
        if (view === 'schedules' && !isAdmin()) {
            return;
        }
        setCurrentView(view);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold tracking-tight">
                            recordings
                        </h1>
                        <Navigation
                            currentView={currentView}
                            onViewChange={handleViewChange}
                            showSchedules={showSchedules}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <LoginButton/>
                        <ThemeToggle/>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">
                {currentView === 'recordings' ? <VideoList/> : <ScheduleList/>}
            </main>
            <footer className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
                recordings.muni.oga.sk · created by groli
            </footer>
        </div>
    );
}
