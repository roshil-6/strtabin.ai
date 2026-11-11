export const featureAvailabilityNotice = 'Coding tools are currently unavailable. Stratabin focuses on docs, planning, brainstorming, tasks and teamwork.';
export const SITE_URL = 'https://www.stratabin.com';
/** Bump when public page content changes; used for sitemap <lastmod>. */
export const CONTENT_UPDATED = '2026-11-08';

export type FeatureCategory = 'Docs & writing' | 'Visual thinking' | 'Planning & progress' | 'AI assistance' | 'Teamwork' | 'Workspace & access';
export type PublicFeature = { title: string; desc: string; category: FeatureCategory; highlight?: boolean };
export const featureCategories: FeatureCategory[] = ['Docs & writing', 'Visual thinking', 'Planning & progress', 'AI assistance', 'Teamwork', 'Workspace & access'];

export const publicFeatures: PublicFeature[] = [
 // Docs & writing
 {category:'Docs & writing',highlight:true,title:'Docs workspace with rich-text writing',desc:'Write project docs, notes and long-form plans with bold, italic, headings, quotes, bulleted and numbered lists, code and links. Formatting shows as you type, with no Markdown symbols on screen.'},
 {category:'Docs & writing',highlight:true,title:'Screenshot to writing',desc:'Upload screenshots of a Claude, ChatGPT or Gemini chat and Stratabin writes the text into your page, with Stratabin AI keeping headings and lists, or free on-device text recognition. No more retyping reports.'},
 {category:'Docs & writing',title:'Colour highlights',desc:'Highlight key lines in yellow, green, blue, pink, orange or purple. Recolour or remove a highlight in one click; colours carry into PDF exports.'},
 {category:'Docs & writing',highlight:true,title:'Pages, parts, sections and notes',desc:'Organise a project into pages, then structure each one with parts, sections and notes in a project outline. Move items between parents and keep everything inside its project.'},
 {category:'Docs & writing',title:'Section board with floating editor',desc:'See every part, section and note as a card. Open one and its writing appears in a floating, draggable editor over the board, so your overview stays in place.'},
 {category:'Docs & writing',title:'Quick notes',desc:'Pin small sticky notes on any writing page for reminders, references and loose ideas, and drag them where you need them.'},
 {category:'Docs & writing',title:'Split view and writing branches',desc:'Compare two angles side by side in split columns, and break an idea into a branch hierarchy right inside your document.'},
 {category:'Docs & writing',highlight:true,title:'Export to PDF',desc:'Export a project as a clean PDF and choose what goes in: writing, progress, the flow diagram and AI analysis. Available from every project and from the project list.'},
 {category:'Docs & writing',title:'Attachments, images and dictation',desc:'Attach files and images to a page, preview supported file types, and dictate writing in supported browsers. Browser speech recognition may process audio online.'},
 // Visual thinking
 {category:'Visual thinking',highlight:true,title:'Visual brainstorming boards',desc:'Map ideas on an infinite board with sticky notes, text, rectangles, circles, decision shapes and images. Add sub-ideas, colour-code notes and drag whole trees.'},
 {category:'Visual thinking',title:'Connected flow maps',desc:'Link ideas with labelled connections in elbow, curved or straight styles to show how a plan fits together.'},
 {category:'Visual thinking',title:'Board templates',desc:'Start from Brainstorm, Retrospective or SWOT templates, then duplicate, rearrange and export your board.'},
 {category:'Visual thinking',title:'Writing and flow side by side',desc:'Open your document and its flow board in a resizable split view to write and map ideas at the same time.'},
 // Planning & progress
 {category:'Planning & progress',highlight:true,title:'Tasks you can split',desc:'Add task cards, split a big task into smaller actionable ones, mark tasks complete, and keep action items beside your writing and plans.'},
 {category:'Planning & progress',title:'Timelines with phases',desc:'Lay out project phases with timeframes, descriptions and status (planned, in progress, done) to see how the work moves.'},
 {category:'Planning & progress',title:'A calendar for every project',desc:'Every project has its own calendar for deadlines and events, plus an overall calendar and a weekly planner with daily check-ins. Reminder delivery depends on your browser permissions and notification setup.'},
 {category:'Planning & progress',title:'Weekly timetables and breaks',desc:'Create weekly schedules with editable days, time periods and breaks. Add rows and columns, and optionally link a timetable to a project.'},
 {category:'Planning & progress',title:'Daily execution logs',desc:'Record what you did, what is blocking you and tomorrow’s next action, so progress stays visible day by day.'},
 {category:'Planning & progress',title:'Reports and progress tracking',desc:'Keep reports with their projects, monitor task completion and execution, and spot gaps in your plan.'},
 // AI assistance
 {category:'AI assistance',highlight:true,title:'Sasha AI chat and voice (Pro)',desc:'Ask for project briefings, brainstorm ideas, and review proposed projects, tasks and flow maps before applying them. Use hosted AI without supplying an API key, within daily usage allowances.'},
 {category:'AI assistance',title:'Optional “Hey Sasha” voice activation',desc:'Enable wake listening in a supported browser tab and talk with Sasha. Choose your own agent name, interrupt spoken replies, and stop listening at any time. Microphone permission and internet access are required.'},
 {category:'AI assistance',highlight:true,title:'Your own AI with full project context',desc:'Choose project details for a capsule, then copy or download it for ChatGPT, Claude or Gemini. Paste or attach it in your own AI tool and save the response back to your project.'},
 {category:'AI assistance',title:'Stratabin AI reports (Pro)',desc:'Generate a progress summary, risk review or action plan from your project inside Stratabin. Each report uses one Sasha request and is saved to the project.'},
 {category:'AI assistance',title:'Connect Claude, ChatGPT or Gemini',desc:'Add Stratabin as a connector in your AI app, then ask it to save a report to a project. It can list project names and add reports only.'},
 {category:'AI assistance',title:'Saved AI analysis reports',desc:'Keep AI reports with the project they belong to, edit or archive them, and include them in PDF exports.'},
 // Teamwork
 {category:'Teamwork',highlight:true,title:'Team workspaces and assignments',desc:'Create a shared workspace, invite teammates, assign responsibilities, and manage shared projects with admin and member roles.'},
 {category:'Teamwork',title:'Personal and group chat',desc:'Discuss work in direct or group conversations, share insights, and attach project capsules and reports for your teammates.'},
 {category:'Teamwork',title:'Community feed and profiles',desc:'Share work on the community feed, find people in the network and keep a public profile of what you are building.'},
 // Workspace & access
 {category:'Workspace & access',title:'Folders, pinning and merged projects',desc:'Group projects in folders, pin current work, flag blocked projects, duplicate or move projects, and merge related projects together.'},
 {category:'Workspace & access',title:'Account-specific cloud saving',desc:'Signed-in workspaces save to your account with local recovery copies and conflict checks. Guest work stays in that browser. Cloud saving and team features require an internet connection.'},
 {category:'Workspace & access',title:'Web, mobile and installable app',desc:'Use Stratabin in desktop and mobile browsers, install it as an app in supported browsers, and switch between light and dark themes.'},
];

export const publicFaqs = [
 {q:'What is Stratabin?',a:'Stratabin is a docs and project workspace. Write formatted docs and notes, map ideas on visual boards, plan tasks, timelines, calendars and timetables, work with a team, and bring in AI with full project context.'},
 {q:'Can I use Stratabin as a docs workspace?',a:'Yes. Each project holds rich-text pages with headings, lists, quotes, links and colour highlights, organised into parts, sections and notes. You can export any project to PDF and choose which sections to include.'},
 {q:'Is there a workspace for teams?',a:'Create a team workspace, add shared projects, invite members, assign work and discuss it in personal or group chats. Project access depends on workspace membership and permissions.'},
 {q:'Can I edit or run software in Stratabin?',a:'No. Coding tools have been removed. Stratabin focuses on docs, project planning, visual brainstorming, tasks, schedules and team collaboration. Sasha helps with project context and reviewed workspace actions.'},
 {q:'How do project capsules work with my own AI?',a:'Select the project context you want to share, then copy or download a capsule. Paste or attach it yourself in ChatGPT, Claude or Gemini. Stratabin does not automatically attach a file to another service or connect your personal AI subscription.'},
 {q:'What does Sasha AI do?',a:'Sasha is the Pro chat and voice assistant. It can brief you on selected project context and propose projects, tasks, reminders and flow maps. You review and apply changes. Daily usage allowances apply; live voice requires a supported browser, microphone permission and internet access.'},
 {q:'How much does Stratabin Pro cost?',a:'Stratabin is free to start. Pro is ₹109 per month, with monthly renewal for up to 12 billing cycles. You can cancel renewal from Plans & billing. The planned Free allowance is four active projects with one timetable each; general project limits are not enforced yet. Your external AI provider’s charges are separate.'},
 {q:'Does Stratabin work offline or on mobile?',a:'Stratabin works in mobile and desktop browsers, with installation available in supported browsers. Guest work and local recovery copies use browser storage. Sign-in, cloud saves, AI and team collaboration require internet access; full offline operation is not promised.'},
];

export type PublicPage = {
 title: string; description: string; heading: string;
 /** Short label for navigation and breadcrumbs. */
 label: string;
 /** Extra paragraphs and sections for topic landing pages. */
 intro?: string; sections?: { heading: string; body: string }[]; categories?: FeatureCategory[];
};
export const publicPages: Record<string, PublicPage> = {
 '/':{label:'Home',title:'Stratabin — Docs & Project Workspace with Flow Maps, Tasks and AI',description:'Stratabin is a docs and project workspace: write rich docs and notes, brainstorm on visual boards, plan tasks and timelines, work as a team, and export to PDF. Free to start.',heading:'The docs and project workspace for ideas, plans and teams'},
 '/features':{label:'Features',title:'Stratabin Features — Docs, Flow Maps, Tasks, Team Workspaces & AI',description:'How every Stratabin tool works, step by step: screenshot to writing, docs, flow boards, tasks, project calendars, timelines, timetables, Sasha AI, AI reports, team workspaces and more.',heading:'Every Stratabin tool, explained'},
 '/docs-workspace':{label:'Docs workspace',title:'Docs Workspace — Write, Organise and Export Project Docs | Stratabin',description:'A docs workspace for project notes and long-form writing: rich-text pages, parts, sections and notes, colour highlights, quick notes and PDF export, beside your tasks and flow maps.',heading:'A docs workspace built around your projects',categories:['Docs & writing','Visual thinking'],
  intro:'Stratabin gives every project its own docs space. Write formatted pages, structure them into parts, sections and notes, and keep the plan, tasks and idea maps right next to the writing.',
  sections:[
   {heading:'Write docs that look finished as you type',body:'Bold, italics, headings, quotes, lists, code, links and colour highlights appear formatted while you write, with no Markdown symbols to clean up.'},
   {heading:'Structure long documents',body:'Split a project into pages, then into parts, sections and notes. A section board shows the whole structure as cards, and each card opens in a floating editor.'},
   {heading:'Share a polished PDF',body:'Export a project to PDF and pick the sections to include: writing, progress, the flow diagram and AI analysis. Each section starts on its own page.'},
  ]},
 '/team-workspace':{label:'Team workspace',title:'Team Workspace for Shared Projects, Docs and Tasks | Stratabin',description:'Create a team workspace in Stratabin: share projects and docs, assign responsibilities, chat one-to-one or in groups, and keep plans, tasks and timelines in one place.',heading:'One workspace for your team’s docs, plans and conversations',categories:['Teamwork','Planning & progress'],
  intro:'Bring your team into a shared workspace where projects, docs, tasks and discussions live together, instead of scattered across separate tools.',
  sections:[
   {heading:'Shared projects with clear roles',body:'Create a workspace, invite teammates, and manage shared projects with admin and member roles. Assign responsibilities so everyone knows what is theirs.'},
   {heading:'Talk where the work is',body:'Use direct and group chats to discuss work, and attach project capsules and reports so conversations have the full context.'},
   {heading:'Plan and track together',body:'Tasks, timelines with phases, calendars and daily execution logs keep the team’s progress visible.'},
  ]},
 '/ai-workspace':{label:'AI workspace',title:'AI Workspace for Project Planning with Full Context | Stratabin',description:'Plan projects with AI that knows your work. Use Sasha AI chat and voice, or send a project capsule to ChatGPT, Claude or Gemini and save the answer back to your docs.',heading:'An AI workspace that knows your whole project',categories:['AI assistance','Docs & writing'],
  intro:'AI is most useful when it can see the plan. Stratabin keeps your docs, tasks, boards and timelines together so AI help starts from full project context.',
  sections:[
   {heading:'Sasha, your built-in assistant',body:'Ask Sasha for briefings and ideas by chat or voice. Sasha proposes projects, tasks and flow maps, and you review every change before it is applied.'},
   {heading:'Bring your own AI',body:'Pick what to include in a project capsule, then copy or download it for ChatGPT, Claude or Gemini. Save the response back to the project as a report.'},
   {heading:'Keep AI output with the work',body:'Saved AI reports stay with their project, can be edited or archived, and can be included in PDF exports.'},
  ]},
};
/** Topic landing pages (everything except home and features). */
export const topicPaths = Object.keys(publicPages).filter(path => path !== '/' && path !== '/features');

export const SEO_KEYWORDS = 'docs workspace, document workspace, project workspace, team workspace, AI workspace, online docs, notes app, project planning, brainstorming board, flow map, task management, timeline, PDF export, Stratabin';

export function structuredData(path:string) {
 const page=publicPages[path];if(!page)return null;
 const url=`${SITE_URL}${path==='/'?'/':path}`;
 const features=page.categories?publicFeatures.filter(feature=>page.categories!.includes(feature.category)):publicFeatures;
 return {'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':`${SITE_URL}/#organization`,name:'Stratabin',url:SITE_URL,logo:`${SITE_URL}/stratabin-icon.svg`},
 {'@type':'WebSite','@id':`${SITE_URL}/#website`,name:'Stratabin',alternateName:'Stratabin docs and project workspace',url:`${SITE_URL}/`,publisher:{'@id':`${SITE_URL}/#organization`},inLanguage:'en'},
 {'@type':'WebPage','@id':`${url}#webpage`,name:page.title,description:page.description,url,isPartOf:{'@id':`${SITE_URL}/#website`},about:{'@id':`${SITE_URL}/#software`},inLanguage:'en',dateModified:CONTENT_UPDATED},
 {'@type':'SoftwareApplication','@id':`${SITE_URL}/#software`,name:'Stratabin',url:SITE_URL,applicationCategory:'BusinessApplication',applicationSubCategory:'Docs and project workspace',operatingSystem:'Web browser',description:publicPages['/'].description,image:`${SITE_URL}/og-image.png`,
  offers:[{'@type':'Offer',name:'Free',price:'0',priceCurrency:'INR'},{'@type':'Offer',name:'Pro',price:'109',priceCurrency:'INR',description:'Per month'}],
  featureList:features.map(feature=>feature.title)},
 ...(path==='/'||path==='/features'?[{'@type':'FAQPage','@id':`${url}#faq`,mainEntity:publicFaqs.map(faq=>({'@type':'Question',name:faq.q,acceptedAnswer:{'@type':'Answer',text:faq.a}}))}]:[]),
 ...(path!=='/'?[{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:page.label,item:url}]}]:[]),
 ]};
}
