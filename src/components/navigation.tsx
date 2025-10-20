import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Menu} from 'lucide-react';
import {useMediaQuery} from 'usehooks-ts';

type View = 'recordings' | 'schedules';

interface NavigationProps {
    currentView: View;
    onViewChange: (view: View) => void;
    showSchedules: boolean;
}

export function Navigation({
                               currentView,
                               onViewChange,
                               showSchedules,
                           }: NavigationProps) {
    const isMobile = useMediaQuery('(max-width: 640px)');

    if (isMobile) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open menu">
                        <Menu className="h-4 w-4"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => onViewChange('recordings')}
                        className={currentView === 'recordings' ? 'font-medium' : ''}
                    >
                        playlists
                    </DropdownMenuItem>
                    {showSchedules && (
                        <DropdownMenuItem
                            onClick={() => onViewChange('schedules')}
                            className={currentView === 'schedules' ? 'font-medium' : ''}
                        >
                            schedules
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <nav className="flex gap-1 me-4">
            <Button
                variant={currentView === 'recordings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('recordings')}
            >
                playlists
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
