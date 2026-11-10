import { create } from 'zustand';

/** One stop on the in-app tour. Project steps open inside a project; the tour picks or creates one. */
export type TourStep = {
    id: string;
    group: string;
    title: string;
    body: string;
    /** Route for the step. `:id` is replaced with the tour's project. */
    path: string;
    /** Element to highlight; the card floats beside it. Without one the card is centred. */
    target?: string;
    /** Label for a button that clicks the highlighted element so the user can try the tool. */
    tryLabel?: string;
    /** Section of the written features guide with the full explanation. */
    guide?: string;
};

export const TOUR_STEPS: TourStep[] = [
    { id: 'welcome', group: 'Welcome', title: 'Welcome to Stratabin', path: '/dashboard',
        body: 'This quick tour shows every tool in your workspace, one step at a time. Use Next to move on, try anything along the way, and close the tour whenever you like.' },
    { id: 'new-project', group: 'Projects', title: 'Everything starts with a project', path: '/dashboard', target: '.dashboard-new-project-btn', guide: 'projects',
        body: 'A project holds one goal: a launch, a thesis, a client job. Each project gets its own writing, flow board, tasks, calendar, timeline and AI, so nothing gets mixed up.' },
    { id: 'project-tools', group: 'Projects', title: 'Your project’s tools', path: '/strategy/:id', target: 'nav[aria-label="Project tools"]', guide: 'projects',
        body: 'Switch between Writing, Flow, Tasks, Timeline, Timetable and Calendar here. Everything you add stays inside this project.' },
    { id: 'writing', group: 'Writing', title: 'Write your plan', path: '/strategy/:id', target: '.writing-toolbar', guide: 'rich-text',
        body: 'Write notes, plans and reports with headings, lists and colour highlights. Formatting shows as you type, and you can export it all as a PDF.' },
    { id: 'screenshot', group: 'Writing', title: 'Screenshot to writing', path: '/strategy/:id', target: '[aria-label="Extract writing from screenshots"]', tryLabel: 'Try it: upload a screenshot', guide: 'screenshot-to-writing',
        body: 'Got a great answer from Claude or ChatGPT? Upload screenshots of the chat and Stratabin writes the text into this page, so you never retype a report.' },
    { id: 'dictate', group: 'Writing', title: 'Voice typing', path: '/strategy/:id', target: '[aria-label="Voice typing"]', tryLabel: 'Try it: dictate', guide: 'writing-extras',
        body: 'Speak instead of typing. Your words land in the page when you stop.' },
    { id: 'sections', group: 'Writing', title: 'Pages and sections', path: '/strategy/:id', target: '[role="group"][aria-label="Writing view"]', guide: 'pages',
        body: 'Open Section board to split a big plan into parts, sections and notes. Each card opens in its own floating editor.' },
    { id: 'flow', group: 'Flow board', title: 'Map ideas on the flow board', path: '/strategy/:id?view=flow', target: '[aria-label="Brainstorming board"]', guide: 'board',
        body: 'Add sticky notes, connect them with labelled lines and see how the plan fits together. Start from a Brainstorm, Retrospective or SWOT template, or ask AI to brainstorm with you.' },
    { id: 'tasks', group: 'Planning', title: 'Turn the plan into tasks', path: '/todo/:id', target: '[aria-label="New task"]', guide: 'tasks',
        body: 'Add the next steps here. Too big? Use Split task to break one task into smaller ones, then tick them off.' },
    { id: 'calendar', group: 'Planning', title: 'A calendar for this project', path: '/calendar/:id', target: '.calendar-reminder-banner', guide: 'calendar',
        body: 'Every project has its own calendar. Click a day to add deadlines and meetings, and turn on reminders to be alerted before they start.' },
    { id: 'planner', group: 'Planning', title: 'Weekly planner and daily check-in', path: '/calendar/:id?mode=week', target: '[data-tour="daily-checkin"]', guide: 'planner',
        body: 'Plan the week, then log each day: what you finished, what is blocking you, and tomorrow’s top action.' },
    { id: 'timeline', group: 'Planning', title: 'Timeline with phases', path: '/timeline/:id', target: '[data-tour="timeline-add"]', tryLabel: 'Try it: add a phase', guide: 'timeline',
        body: 'Lay the project out as phases like Research, Build and Launch, with dates, deliverables and status.' },
    { id: 'capsule', group: 'AI', title: 'Use your own AI with full context', path: '/ai/:id', target: '.ai-provider-grid', guide: 'own-ai',
        body: 'Pick ChatGPT, Claude or Gemini and copy a project capsule: your writing, tasks and plan in one paste. Or pick Stratabin AI to generate a report right here.' },
    { id: 'reports', group: 'AI', title: 'Saved reports', path: '/ai/:id?tab=reports', target: '.ai-composer-modes', guide: 'in-app-reports',
        body: 'Keep every AI answer with its project. Generate a report with Stratabin AI, paste one in, or upload chat screenshots to save it.' },
    { id: 'sasha', group: 'AI', title: 'Talk to Sasha', path: '/ai/:id?tab=reports', target: '.agent-pill, .agent-orb', tryLabel: 'Try it: open Sasha', guide: 'sasha',
        body: 'Sasha is your voice assistant. Tap here, or turn on “Hey Sasha”, and say what you need: “Create a project for my launch with tasks and a flow map.” Nothing changes until you approve. Sasha is part of Pro.' },
    { id: 'teams', group: 'Teams', title: 'Plan with your team', path: '/dashboard', guide: 'workspaces',
        body: 'Create a team workspace from the dashboard menu to share projects, assign daily tasks and chat. Use Connect your AI to save reports from Claude, ChatGPT or Gemini straight into a project.' },
    { id: 'done', group: 'Done', title: 'You’re ready', path: '/dashboard',
        body: 'That’s the whole workspace. Reopen this tour any time from the Guide button or the menu, and read the full features guide for more detail.' },
];

const SEEN_KEY = 'stratabin-tour-seen-v1';
export const tourSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* The tour can show again next time. */ } };

type TourState = {
    active: boolean;
    index: number;
    /** The project the tour shows; chosen or created when the first project step opens. */
    projectId: string | null;
    start: (options?: { projectId?: string | null; stepId?: string }) => void;
    go: (index: number) => void;
    setProject: (id: string) => void;
    end: () => void;
};

export const useTour = create<TourState>(set => ({
    active: false, index: 0, projectId: null,
    start: ({ projectId = null, stepId } = {}) => {
        markSeen();
        const index = stepId ? Math.max(0, TOUR_STEPS.findIndex(step => step.id === stepId)) : 0;
        set({ active: true, index, projectId });
    },
    go: index => set({ index: Math.max(0, Math.min(TOUR_STEPS.length - 1, index)) }),
    setProject: id => set({ projectId: id }),
    end: () => set({ active: false }),
}));

/** The tour step that explains the tool on a given route, so “Guide” starts where the user is. */
export function tourStepForPath(pathname: string, search: string): string {
    if (pathname.startsWith('/todo/')) return 'tasks';
    if (pathname.startsWith('/timeline/')) return 'timeline';
    if (pathname.startsWith('/calendar/')) return search.includes('mode=week') ? 'planner' : 'calendar';
    if (pathname.startsWith('/ai/')) return search.includes('tab=reports') ? 'reports' : 'capsule';
    if (pathname.startsWith('/strategy/') || pathname.startsWith('/canvas/')) return search.includes('view=flow') ? 'flow' : 'writing';
    return 'welcome';
}

/** Project id in a project route, if any. */
export function projectIdFromPath(pathname: string): string | null {
    const match = /^\/(?:strategy|canvas|todo|timeline|calendar|ai|timetable|project)\/([^/?#]+)/.exec(pathname);
    return match ? decodeURIComponent(match[1]) : null;
}
