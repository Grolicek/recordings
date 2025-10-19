import {Button} from '@/components/ui/button';

type View = 'recordings' | 'schedules';

interface NavigationProps {
    currentView: View;
    onViewChange: (view: View) => void;
    showSchedules: boolean;
}

export function Navigation({currentView, onViewChange, showSchedules}: NavigationProps) {
    return (
        <nav className="flex gap-1">
            <Button
                variant={currentView === 'recordings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('recordings')}
            >
                recordings
            </Button>
            {showSchedules && (
                <Button
                    variant={currentView === 'schedules' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewChange('schedules')}
                >
                    schedules
                </Button>
            )}
        </nav>
    );
}
