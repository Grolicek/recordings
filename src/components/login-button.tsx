import {useState} from 'react';
import {LogIn} from 'lucide-react';
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
            // close modal first
            setOpen(false);
            // trigger authentication
            await triggerBrowserAuth();
        } catch (error) {
            console.error('login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer">
                    <LogIn className="h-[1.2rem] w-[1.2rem]"/>
                    <span className="sr-only">login</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>login required</DialogTitle>
                    <DialogDescription>
                        some recordings require authentication to view. click below to log in.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Button onClick={handleLogin} disabled={isLoading} className="cursor-pointer">
                        {isLoading ? 'logging in...' : 'login'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}