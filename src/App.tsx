import {useEffect, useState} from 'react';
import VideoList from './components/video-list';
import ScheduleList from './components/schedule-list';
import {Navigation} from '@/components/navigation';
import {ThemeToggle} from '@/components/theme-toggle';
import {LoginButton} from '@/components/login-button';
import {LogoutButton} from '@/components/logout-button';
import {fetchUserInfo, getUserInfo, isAdmin} from '@/lib/auth';

type View = 'recordings' | 'schedules';

export default function App() {
    const [currentView, setCurrentView] = useState<View>('recordings');
    const [showSchedules, setShowSchedules] = useState(false);


    // listen for auth success events to refresh user info
    useEffect(() => {
        const handleAuthSuccess = () => {
            fetchUserInfo().then(() => {
                setShowSchedules(isAdmin());
            });
        };

        const handleAuthLogout = () => {
            // clear schedules visibility
            setShowSchedules(false);
            // switch to recordings view if on schedules
            if (currentView === 'schedules') {
                setCurrentView('recordings');
            }
        };

        window.addEventListener('auth-success', handleAuthSuccess);
        window.addEventListener('auth-logout', handleAuthLogout);
        return () => {
            window.removeEventListener('auth-success', handleAuthSuccess);
            window.removeEventListener('auth-logout', handleAuthLogout);
        };
    }, [currentView]);

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
                        {getUserInfo() ? <LogoutButton/> : <LoginButton/>}
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
