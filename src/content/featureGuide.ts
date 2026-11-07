/** The in-depth "how every tool works" guide shown on /features (and prerendered for search engines). */

export type GuideTool = {
    id: string;
    title: string;
    /** One sentence: what the tool is. */
    what: string;
    /** Numbered steps: how to use it. */
    how: string[];
    /** A concrete situation where it saves time. */
    example: string;
    /** Where to find it in the app. */
    where: string;
    badge?: 'Pro' | 'New';
};
export type GuideGroup = { id: string; title: string; intro: string; tools: GuideTool[] };

export const guideIntro = {
    heading: 'What is Stratabin?',
    body: [
        'Stratabin is one workspace for turning an idea into finished work. Every project you create gets its own writing pages, idea board, task list, timeline, calendar, weekly planner, timetable and AI reports, all kept together, so you never copy the same plan between five different apps.',
        'You think and write in the Writing section, map the idea visually on the flow board, break it into tasks and phases, put dates on a calendar that belongs only to that project, and check your progress every day. When you need help, the built-in AI (Sasha and Stratabin AI) reads your project for you, or you can take the project to ChatGPT, Claude or Gemini and bring the answer straight back.',
    ],
};

/** The planning-to-execution loop, shown as a row of steps. */
export const guideLoop = [
    { title: 'Capture', body: 'Dump the idea into Writing, quick notes or the board. Paste screenshots of an AI chat and they become text.' },
    { title: 'Structure', body: 'Organise it into pages, parts and sections, and connect ideas on the flow board.' },
    { title: 'Plan', body: 'Turn the plan into tasks, timeline phases, calendar dates and a weekly timetable.' },
    { title: 'Execute', body: 'Work through tasks, log what you did each day, and get reminders before events.' },
    { title: 'Review', body: 'Generate AI reports, monitor progress, share with your team and export a PDF.' },
];

export const guideGroups: GuideGroup[] = [
    {
        id: 'projects',
        title: 'Projects and your dashboard',
        intro: 'Everything in Stratabin lives inside a project. A project is a container for one goal: a product launch, a thesis, a client job, a semester.',
        tools: [
            {
                id: 'projects', title: 'Projects with their own tools',
                what: 'Each project has its own Writing, flow board, Tasks, Timeline, Calendar, Planner, Timetable and AI section, with nothing mixed in from your other projects.',
                how: ['On the dashboard choose New project and give it a name.', 'Open it to see the project overview: completion, active tasks and shortcuts to every tool.', 'Use the left sidebar (or the bottom bar on mobile) to move between the project’s tools.'],
                example: 'Run “Website redesign” and “Q3 hiring” side by side. Each has its own calendar, tasks and notes, so a hiring deadline never clutters your redesign plan.',
                where: 'Dashboard → New project',
            },
            {
                id: 'organise', title: 'Folders, pinning, merging and duplicating',
                what: 'Keep a growing list of projects tidy and combine related ones.',
                how: ['Create folders and move projects into them.', 'Pin the projects you are working on now, and flag blocked ones.', 'Duplicate a project to reuse it as a template, or choose Merge projects to combine two related projects into one.'],
                example: 'Keep a “Client template” project with your standard pages and tasks, and duplicate it for every new client.',
                where: 'Dashboard project list and menu',
            },
            {
                id: 'monitor', title: 'Monitor your work and reports',
                what: 'See progress across projects in one place and open each project’s saved AI reports.',
                how: ['Open Monitor your work from the dashboard menu for task completion and execution.', 'Open Reports, choose a project, and read every report saved to it.'],
                example: 'On Friday, open Monitor to see which projects moved this week and which are stuck, then open the reports for the stuck one.',
                where: 'Dashboard menu → Monitor / Reports',
            },
        ],
    },
    {
        id: 'writing',
        title: 'Writing: docs, notes and reports',
        intro: 'The Writing section is a document editor built into every project, for plans, research, meeting notes, reports and long-form writing.',
        tools: [
            {
                id: 'screenshot-to-writing', title: 'Screenshot to writing', badge: 'New',
                what: 'Upload screenshots of a Claude, ChatGPT or Gemini chat (or any document) and Stratabin writes the text into your page, so you never retype a report by hand.',
                how: ['In any Writing page or section, choose From screenshot in the toolbar.', 'Drop in up to 6 screenshots in reading order. Reorder or remove them if needed.', 'Choose Extract with Stratabin AI to keep headings, lists and tables (uses 1 Sasha request), or Extract without AI for free text recognition on your device.', 'Check the extracted text, edit anything, then choose Add to page. Or choose Add as images to keep the screenshots themselves.'],
                example: 'Claude wrote you a 2-page market analysis on your phone. Take 3 screenshots, open the project’s “Research” section, choose From screenshot, and the whole analysis appears as editable text with its headings and bullet points.',
                where: 'Project → Writing → toolbar → From screenshot',
            },
            {
                id: 'rich-text', title: 'Rich-text editor and colour highlights',
                what: 'Write with bold, italics, headings, quotes, lists, code and links that look formatted as you type, and highlight lines in six colours.',
                how: ['Type in the page and use the formatting bar (or shortcuts like Ctrl+B).', 'Select text and pick a highlight colour to mark decisions, risks or open questions.', 'Switch on Preview to read the page as a clean document.'],
                example: 'Highlight every risk in pink and every decision in green, so anyone skimming the plan sees them instantly. The colours carry into PDF exports.',
                where: 'Project → Writing',
            },
            {
                id: 'pages', title: 'Pages, parts, sections and notes',
                what: 'Split a big project into pages, and structure each page into parts, sections and notes in a project outline.',
                how: ['Choose + Add page for a new document in the project.', 'Open Section board to add parts, sections and notes as cards.', 'Click a card and its writing opens in a floating editor you can drag around, with the board still visible.', 'Use Organise to change a section’s type or move it under a different parent.'],
                example: 'A thesis project with a page per chapter, each chapter split into sections, and loose ideas kept as notes, all inside one project.',
                where: 'Project → Writing → Section board',
            },
            {
                id: 'writing-extras', title: 'Quick notes, split view, branches, dictation and attachments',
                what: 'Small tools for thinking while you write.',
                how: ['Add quick notes, small sticky notes pinned to the top of a page.', 'Use Split to write two angles side by side, such as pros and cons, or option A and option B.', 'Use Branch to break a topic into a hierarchy right inside the document.', 'Use Dictate to speak instead of typing, and attach images and files (PDF, DOCX, text) you can preview in the page.'],
                example: 'Compare two pricing strategies in split columns, dictate your thoughts on the walk home, and attach the competitor’s price sheet as a PDF.',
                where: 'Project → Writing → toolbar',
            },
            {
                id: 'pdf', title: 'Export to PDF',
                what: 'Turn a project into a clean, shareable PDF.',
                how: ['Choose Export PDF from the project or the project list.', 'Pick what to include: writing, progress, the flow diagram and AI reports.', 'Download it and send it to a client, teacher or teammate.'],
                example: 'Send a client a polished proposal PDF that includes the plan, the flow diagram and the AI risk review, without building it in another tool.',
                where: 'Project header → Export PDF',
            },
        ],
    },
    {
        id: 'visual',
        title: 'Flow board: visual thinking',
        intro: 'Every project has an infinite board for brainstorming and mapping how a plan fits together.',
        tools: [
            {
                id: 'board', title: 'Brainstorming board and flow maps',
                what: 'Map ideas with sticky notes, text, shapes, decision diamonds and images, and link them with labelled connections.',
                how: ['Open the project’s flow view and add your first note, or start from the Brainstorm, Retrospective or SWOT template.', 'Add connected sub-ideas, colour-code notes and drag whole trees around.', 'Label connections (for example “depends on” or “if yes”) and choose elbow, curved or straight lines.', 'Choose Brainstorm with AI to have AI review the board and suggest new ideas.'],
                example: 'Run a team retrospective on the Retrospective template, then turn the “What to change” notes into tasks.',
                where: 'Project → Writing → Flow view (Flow on mobile)',
            },
            {
                id: 'side-by-side', title: 'Writing and board side by side',
                what: 'Open the document and its flow board together in a resizable split, so you can write and map at the same time.',
                how: ['In Writing, open the flow view in split mode.', 'Drag the divider to give more room to either side.'],
                example: 'Write the launch plan on the left while drawing the launch sequence on the right.',
                where: 'Project → Writing',
            },
        ],
    },
    {
        id: 'planning',
        title: 'Planning and execution',
        intro: 'Turn the plan into dated, trackable work. Each of these tools belongs to the project, so every project has its own calendar, timeline and task list.',
        tools: [
            {
                id: 'tasks', title: 'Tasks',
                what: 'A focused task list for the project: one clear next step at a time.',
                how: ['Open Tasks and add what needs doing.', 'Choose Split task to break a big task into smaller, actionable ones (one per line).', 'Mark tasks done and filter by in progress or completed.'],
                example: '“Launch website” is too vague, so split it into “write homepage copy”, “pick hosting” and “set up analytics”.',
                where: 'Project sidebar → Tasks',
            },
            {
                id: 'calendar', title: 'A calendar for each project',
                what: 'Every project has its own calendar for deadlines, meetings and events. There is also an overall calendar for everything.',
                how: ['Open Calendar inside a project and click a day to add an event, with or without a time.', 'Turn on reminders to be notified 15 minutes before timed events and when they start.', 'Tick events off as they happen. Use the main Calendar from the dashboard to see all projects.'],
                example: 'Your “College fest” project has its own calendar with sponsor calls and venue visits, separate from your exam dates in another project.',
                where: 'Project sidebar → Calendar',
            },
            {
                id: 'planner', title: 'Weekly planner and daily check-in',
                what: 'Plan the week for a project and record what you did each day.',
                how: ['Open Planner to see the week and add tasks to each day.', 'Fill in the Daily check-in: what you finished, what is blocking you, and the top action for tomorrow.', 'Read back your check-ins to see how the project actually moved.'],
                example: 'Each evening, log “Finished draft, called 3 leads” with the blocker “waiting on design”. On Monday you know exactly where to restart.',
                where: 'Project sidebar → Planner',
            },
            {
                id: 'timeline', title: 'Timeline with phases',
                what: 'Lay out the project as phases with timeframes, descriptions and status.',
                how: ['Open Timeline and add a phase, such as “Research · Week 1–2”.', 'Describe what happens: milestones and deliverables.', 'Mark each phase planned, in progress or done as work moves.'],
                example: 'A 3-month product launch: Research → Build → Beta → Launch, each with its own dates and deliverables.',
                where: 'Project sidebar → Timeline',
            },
            {
                id: 'timetable', title: 'Weekly timetables',
                what: 'Build a repeating weekly schedule with days, time periods and breaks, either personal or linked to a project.',
                how: ['Open Timetable and create one, or choose Plan your time from a project’s Tasks.', 'Edit days, time slots and breaks, and add rows and columns.', 'Link it to a project so the schedule sits with the work.'],
                example: 'A student blocks study hours per subject across the week, with breaks, linked to their “Semester 5” project.',
                where: 'Dashboard → Timetable, or Tasks → Plan your time',
            },
            {
                id: 'reminders', title: 'Reminders',
                what: 'Get notified about events and scheduled reminders, even when you are busy elsewhere.',
                how: ['Enable reminders in the Calendar for event alerts.', 'Ask Sasha to remind you, or create scheduled reminders (for example every weekday) and enable this device for notifications.'],
                example: '“Remind me every weekday at 9 to review my priorities.”',
                where: 'Calendar → Enable reminders, or Sasha → Reminders',
            },
        ],
    },
    {
        id: 'ai',
        title: 'AI: built in, or your own',
        intro: 'Stratabin works with AI in two ways: built-in AI that uses your Sasha allowance, or your own ChatGPT, Claude or Gemini with your project’s full context.',
        tools: [
            {
                id: 'sasha', title: 'Sasha: chat and voice assistant', badge: 'Pro',
                what: 'Your built-in assistant. Ask about your projects by chat or voice, and have Sasha create projects, tasks, flow maps and reminders for you.',
                how: ['Open Sasha from the dashboard menu, or say “Hey Sasha” after turning on wake listening. You can even rename the assistant.', 'Ask for a briefing (“What’s left on the launch?”) or a plan (“Create a project for my bakery launch with tasks and a flow map”).', 'Review what Sasha proposes and apply it. Nothing changes until you approve.'],
                example: 'Say: “Hey Sasha, create a project for my podcast with a flow of the episode workflow and tasks for this week.” You get the project, the flow map and the tasks in one go.',
                where: 'Dashboard menu → Sasha AI',
            },
            {
                id: 'in-app-reports', title: 'Generate reports with Stratabin AI', badge: 'Pro',
                what: 'Stratabin AI reads your project and writes a report, such as a progress summary, risk review or action plan, then saves it to the project.',
                how: ['Open the project’s AI section and go to Saved reports, then Generate.', 'Choose what the report should cover, or pick a suggestion like “Create a prioritized action plan”.', 'Choose Generate report. It uses 1 Sasha request and is saved with the project.'],
                example: 'Before a client call, generate “Summarize progress and identify risks” and walk in with a one-page status report.',
                where: 'Project → AI → Saved reports → Generate',
            },
            {
                id: 'own-ai', title: 'Use your own ChatGPT, Claude or Gemini',
                what: 'Package your project as a context capsule for your own AI account, then save the answer back as a report.',
                how: ['Open the project’s AI section and pick which parts to include: writing, tasks, timeline, board and so on.', 'Copy or download the capsule and paste or attach it in ChatGPT, Claude or Gemini.', 'Bring the answer back: paste it, import a text file, or upload screenshots of the chat.'],
                example: 'Give Claude your full launch plan in one paste, ask “What am I missing?”, and save its answer as a report on the project.',
                where: 'Project sidebar → AI',
            },
            {
                id: 'report-screenshots', title: 'Reports from chat screenshots',
                what: 'Save an AI chat as a project report straight from screenshots: extracted with AI, read on your device, or kept as images.',
                how: ['In the AI section, open Saved reports and choose Screenshots.', 'Upload the screenshots in order and pick the AI they came from.', 'Extract with Stratabin AI, extract without AI, or save them as images.'],
                example: 'Your ChatGPT conversation about pricing is too long to copy on mobile, so screenshot it and save it as a report in seconds.',
                where: 'Project → AI → Saved reports → Screenshots',
            },
            {
                id: 'connector', title: 'Connect Claude, ChatGPT or Gemini',
                what: 'Add Stratabin as a connector in your AI app once. Then, at the end of a chat, ask it to save the report to a Stratabin project.',
                how: ['Open Connect your AI and copy the connector URL.', 'Add it as a custom connector in Claude, ChatGPT or Gemini and sign in to Stratabin.', 'In a chat, ask: “Save this report to my Stratabin project”. The AI can only list project names and add reports; it cannot read or change your work.'],
                example: 'Finish a research session in Claude and say “save this to my Thesis project”. It appears under the project’s reports.',
                where: 'Dashboard menu → Connect your AI',
            },
        ],
    },
    {
        id: 'team',
        title: 'Teams and community',
        intro: 'Plan and execute with other people in shared workspaces, with chat beside the work.',
        tools: [
            {
                id: 'workspaces', title: 'Team workspaces and assignments',
                what: 'A shared space where a team creates projects, assigns daily tasks and sees who is working on what.',
                how: ['Create a team workspace and invite teammates by username or workspace ID.', 'Create shared projects that everyone in the workspace can open.', 'Assign tasks to a member with a date, and check Tasks today and Team activity.', 'Admins manage members and settings; members work on shared projects.'],
                example: 'A 4-person startup keeps the launch project in one workspace: the founder assigns “finish landing copy” to the writer for Thursday, and everyone sees it on the board.',
                where: 'Dashboard → Team workspace',
            },
            {
                id: 'chat', title: 'Personal and group chat with project capsules',
                what: 'Message teammates one-to-one or in groups, and attach a project snapshot so the conversation has full context.',
                how: ['Start a conversation, or a group for a team workspace.', 'Attach a project capsule with handover notes, or share a report.'],
                example: 'Hand a project over to a colleague before your leave: attach the capsule with notes on what is done and what is next.',
                where: 'Community → Messages',
            },
            {
                id: 'community', title: 'Community feed and profiles',
                what: 'Share what you are building, find people and keep a public profile.',
                how: ['Choose Share from a project to post it to the community.', 'Browse the feed, connect with people and message them.'],
                example: 'Share your hackathon project plan and find a designer to join you.',
                where: 'Dashboard menu → Community',
            },
        ],
    },
    {
        id: 'access',
        title: 'Saving, devices and plans',
        intro: 'Your work is saved to your account and works on any device.',
        tools: [
            {
                id: 'sync', title: 'Cloud saving and recovery',
                what: 'Signed-in work saves to your account, with local recovery copies and conflict checks.',
                how: ['Sign in, and your projects sync across devices automatically.', 'Guest work stays in that browser until you sign in.'],
                example: 'Start a plan on your laptop and keep editing it on your phone on the train.',
                where: 'Automatic when signed in',
            },
            {
                id: 'devices', title: 'Web, mobile, installable app and themes',
                what: 'Use Stratabin in any desktop or mobile browser, install it like an app, and switch between light and dark.',
                how: ['Open stratabin.com on any device.', 'Use your browser’s Install or Add to Home screen option.', 'Use the theme toggle for light or dark mode.'],
                example: 'Install it on your phone’s home screen and use the mobile bar to jump between Writing, Tasks and Calendar.',
                where: 'Any browser',
            },
            {
                id: 'plans', title: 'Free and Pro',
                what: 'Stratabin is free to start. Pro adds Sasha chat and voice and Stratabin AI reports and extraction, within daily allowances.',
                how: ['Start free with all the planning, writing and team tools.', 'Upgrade from Plans & billing when you want the built-in AI.'],
                example: 'Plan for free, and upgrade the month you want Sasha to set up projects and write reports for you.',
                where: 'Dashboard menu → Plans & billing',
            },
        ],
    },
];

/** End-to-end examples that combine several tools. */
export const guidePlaybooks = [
    {
        title: 'Turn a Claude chat into a finished plan',
        steps: ['Ask Claude (or ChatGPT) for a plan and screenshot the answer.', 'In your project’s Writing, choose From screenshot to get it as editable text.', 'Highlight the key decisions, split the plan into tasks, and add the deadlines to the project calendar.', 'Generate a Stratabin AI report a week later to see what is behind.'],
    },
    {
        title: 'Launch a product with a team',
        steps: ['Create a team workspace and a shared “Launch” project.', 'Map the launch on the flow board and write the plan in Writing.', 'Add timeline phases, assign tasks to teammates with dates, and put launch events on the project calendar.', 'Everyone logs daily check-ins, and you export a PDF status report for stakeholders.'],
    },
    {
        title: 'Plan a semester as a student',
        steps: ['Create a project per subject, or one “Semester” project with a page per subject.', 'Build a weekly timetable with study blocks and breaks.', 'Put exams and submissions on each project’s calendar with reminders.', 'Ask Sasha “What do I have due this week?” every Monday.'],
    },
];
