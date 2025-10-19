import {useState} from 'react';
import {LoaderCircle, LogIn} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {triggerBrowserAuth} from '@/lib/auth';

export function LoginButton() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            // trigger authentication (will show browser's HTTP Basic Auth dialog)
            await triggerBrowserAuth();
            // close modal after successful authentication
            setOpen(false);
        } catch (error) {
            console.error('login failed:', error);
            // keep dialog open on error so user can try again
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <LogIn className="h-[1.2rem] w-[1.2rem]"/>
                    <span className="sr-only">login</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>login</DialogTitle>
                    <DialogDescription>
                        Some recordings may require authentication to view, click below to log in.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Button onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? (
                            <LoaderCircle className="animate-spin"/>
                        ) : (
                            <LogIn/>
                        )}
                        login
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
