import {createContext, useContext, useEffect, useState} from 'react';

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
                                  children,
                                  defaultTheme = 'system',
                                  storageKey = 'muni-recordings-theme',
                                  ...props
                              }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => {
            // try to get from cookie
            const cookies = document.cookie.split('; ');
            const themeCookie = cookies.find((c) => c.startsWith(`${storageKey}=`));
            return (themeCookie?.split('=')[1] as Theme) || defaultTheme;
        },
    );

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            // save to cookie (expires in 1 year)
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);
            document.cookie = `${storageKey}=${theme}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
