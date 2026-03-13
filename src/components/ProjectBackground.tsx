import { useTheme } from '../context/ThemeContext';

/** Subtle grid/particles background for project section — not used on landing page */
export default function ProjectBackground() {
    const { resolved } = useTheme();
    const isLight = resolved === 'light';

    return (
        <div
            className="fixed inset-0 pointer-events-none z-0"
            aria-hidden="true"
            style={{
                backgroundImage: isLight
                    ? `
                        linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
                    `
                    : `
                        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                    `,
                backgroundSize: '32px 32px',
            }}
        />
    );
}
