import {useState} from 'react';
import {LoaderCircle, LogOut} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {logout} from '@/lib/auth';

export function LogoutButton() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            // close modal first
            setOpen(false);
            // perform logout
            logout();
        } catch (error) {
            console.error('logout failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <LogOut className="h-[1.2rem] w-[1.2rem]"/>
                    <span className="sr-only">logout</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>logout</DialogTitle>
                    <DialogDescription>
                        This will hide authenticated content. Note: browser may still cache credentials until you close
                        it.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isLoading}
                        >
                            cancel
                        </Button>
                        <Button onClick={handleLogout} disabled={isLoading}>
                            {isLoading ? (
                                <LoaderCircle className="animate-spin"/>
                            ) : (
                                <LogOut/>
                            )}
                            logout
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
