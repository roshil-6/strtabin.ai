# Community team workspace

Community provides Teams, Projects, Duties, Reports, People, Chats, and Insights sections. The interface uses the shared black, violet, and pure-white theme, responsive navigation, labeled controls, keyboard focus indicators, and native modal dialogs with focus containment and Escape handling.

## Team workflow

- Create a private team or join using its workspace ID. Incoming invitations can be accepted or declined in Community.
- Select a team to see its members and activity. Admins invite teammates; members can open direct conversations. Team data refreshes every 30 seconds while the page is visible.
- Create shared strategy, code, or notes projects with a designated owner. Project cards open the existing shared editor or AI capsule workspace.
- Assign dated duties. Admins assign duties to any member; members add their own duties. Only admins and the assigned member can change completion.
- Publish project reports, paste an insight, or import a text/Markdown report. Reports are saved on the shared project, with a 30-report and 40,000-character limit. Appending reports uses a compare-and-swap update to preserve simultaneous submissions and other stored canvas fields.
- Start personal conversations or named groups. A group must include its creator and at least two other members of a common workspace. Group creation validates membership on the server. Existing socket channels distribute new groups, messages, and typing notifications to members.
- Attach a project capsule to a conversation after selecting a project, adding handover notes, and reviewing the preview. It uploads as a text file through the existing authenticated upload endpoint, then sends it to the selected chat. A capsule includes code and stored project context; original image and document contents are not embedded. Upload limit: 10 MB.
- Chat filters separate personal and group conversations. Older messages load using the existing cursor endpoint.

## Backend and authentication

The frontend requires the updated backend for `POST /api/chats/group` and `POST /api/projects/:id/reports`. No schema migration is needed; the existing chats, participants, workspace membership, and project canvas tables are used.

Signed-in collaboration requires a valid `CLERK_SECRET_KEY` on the server and a matching frontend Clerk configuration. Do not put the server secret in a `VITE_` variable or client code. Guest users see an explicit sign-in state; this does not simulate or bypass server authentication.

Project editing continues to use the existing shared canvas save mechanism, not character-level collaborative document editing or merge conflict resolution. Socket messages are live; team lists and duties refresh periodically. Chat attachments require authenticated downloads by the uploader or conversation members. See `security/REVIEW.md` for the security review and remaining limitations.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. `tests/teamCollaboration.test.mjs` uses an isolated in-memory SQLite database and validates group membership, outsider rejection, message membership, concurrent report append, report access/limits, and duty assignment/completion permissions. It invokes route handlers with test identities; it does not replace or weaken production authentication.
