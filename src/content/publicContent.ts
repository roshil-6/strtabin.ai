export const featureAvailabilityNotice = 'Coding tools are currently unavailable. Stratabin focuses on planning, writing, brainstorming, tasks, and teamwork.';
export const SITE_URL = 'https://www.stratabin.com';
export const publicFeatures = [
 {title:'Writing, pages and sections',desc:'Write long-form project notes, add separate pages, organize expandable sections, and use split view and branching to develop ideas.'},
 {title:'Visual brainstorming and flow maps',desc:'Build connected idea maps with editable cards, sub-ideas, draggable trees, and links that keep your thinking in one project.'},
 {title:'Tasks and subtasks',desc:'Add task cards, split work into smaller steps, mark tasks complete, and keep action items beside your writing and plans.'},
 {title:'Weekly timetables and breaks',desc:'Create weekly schedules with editable days, time periods and breaks. Add rows and columns, and optionally link a timetable to a project.'},
 {title:'Calendars, timelines and weekly planning',desc:'Schedule project events, arrange milestones, and review your week. Reminder delivery depends on your browser permissions and notification setup.'},
 {title:'Your AI with full project context',desc:'Choose project details for a capsule, then copy or download it for ChatGPT, Claude or Gemini. Attach or paste it in your own AI tool and save the response back to your project.'},
 {title:'Sasha AI chat and voice — Pro',desc:'Ask for project briefings, brainstorm ideas, and review proposed projects, tasks and flow maps before applying them. Use hosted AI without supplying an API key, within daily usage allowances.'},
 {title:'Optional “Hey Sasha” voice activation',desc:'Enable wake listening in a supported browser tab and talk with Sasha. Choose your own agent name, interrupt spoken replies, and stop listening at any time. Microphone permission and internet access are required.'},
 {title:'Team workspaces and assignments',desc:'Create a shared workspace before inviting teammates, assign responsibilities, and manage shared projects with admin and member roles.'},
 {title:'Personal and group chat',desc:'Discuss work in direct or group conversations, share insights, and attach project capsules and reports for your teammates.'},
 {title:'Attachments and dictation',desc:'Attach project resources, preview supported file types, and dictate writing in supported browsers. Browser speech recognition may process audio online.'},
 {title:'Folders and connected projects',desc:'Group projects in folders, pin current work, and bring related projects together while keeping pages inside their parent project.'},
 {title:'Reports and progress tracking',desc:'Keep reports with their projects, monitor tasks and execution progress, and review daily work alongside your plans.'},
 {title:'Account-specific cloud saving',desc:'Signed-in personal workspaces save to your account with local recovery copies and conflict checks. Guest work stays in that browser. Cloud saving and team features require an internet connection.'},
];
export const publicFaqs = [
 {q:'Can I edit or run software in Stratabin?',a:'No. Coding tools have been removed. Stratabin focuses on project planning, writing, visual brainstorming, tasks, schedules and team collaboration. Sasha helps with project context and reviewed workspace actions.'},
 {q:'What is Stratabin?',a:'Stratabin is a project planning and AI workspace for writing, brainstorming, tasks, timetables, calendars, team collaboration and project context capsules.'},
 {q:'How do project capsules work with my own AI?',a:'Select the project context you want to share, then copy or download a capsule. Paste or attach it yourself in ChatGPT, Claude or Gemini. Stratabin does not automatically attach a file to another service or connect your personal AI subscription.'},
 {q:'What does Sasha AI do?',a:'Sasha is the Pro chat and voice assistant. It can brief you on selected project context and propose projects, tasks, reminders and flow maps. You review and apply changes. Daily usage allowances apply; live voice requires a supported browser, microphone permission and internet access.'},
 {q:'How much does Stratabin Pro cost?',a:'Pro is ₹109 per month, with monthly renewal for up to 12 billing cycles. You can cancel renewal from Plans & billing. The planned Free allowance is four active projects with one timetable each; general project limits are not enforced yet. Your external AI provider’s charges are separate.'},
 {q:'Can I work with a team?',a:'Create a team workspace, add shared projects, invite members later, assign work and discuss it in personal or group chats. Project access depends on workspace membership and permissions.'},
 {q:'Does Stratabin work offline or on mobile?',a:'Stratabin works in mobile and desktop browsers, with installation available in supported browsers. Guest work and local recovery copies use browser storage. Sign-in, cloud saves, AI and team collaboration require internet access; full offline operation is not promised.'},
];
export const publicPages:Record<string,{title:string;description:string;heading:string}> = {
 '/':{title:'Stratabin — Project Planning, Brainstorming & AI Workspace',description:'Plan projects with writing, visual flow maps, tasks, weekly timetables and team chat. Use Sasha AI or share full project context with your own AI.',heading:'Project planning, brainstorming and AI in one workspace'},
 '/features':{title:'Stratabin Features — Writing, Flow Maps, Tasks & Sasha AI',description:'Explore Stratabin’s writing pages, brainstorming boards, tasks, timetables, calendars, team workspaces, project capsules and Sasha AI chat and voice.',heading:'Writing, planning, teamwork and AI — connected'},
};
export function structuredData(path:string) {
 const page=publicPages[path];if(!page)return null;
 return {'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':`${SITE_URL}/#organization`,name:'Stratabin',url:SITE_URL,logo:`${SITE_URL}/stratabin-icon.svg`},
 {'@type':'WebSite','@id':`${SITE_URL}/#website`,name:'Stratabin',url:`${SITE_URL}/`,publisher:{'@id':`${SITE_URL}/#organization`}},
 {'@type':'WebPage',name:page.title,description:page.description,url:`${SITE_URL}${path}`,isPartOf:{'@id':`${SITE_URL}/#website`}},
 {'@type':'SoftwareApplication',name:'Stratabin',url:SITE_URL,applicationCategory:'BusinessApplication',operatingSystem:'Web browser',description:publicPages['/'].description,featureList:publicFeatures.map(feature=>feature.title)},
 ...(path==='/features'?[{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${SITE_URL}/`},{'@type':'ListItem',position:2,name:'Features',item:`${SITE_URL}/features`}]}]:[])
 ]};
}
