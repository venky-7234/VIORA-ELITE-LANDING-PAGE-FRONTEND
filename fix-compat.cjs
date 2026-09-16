const fs = require('fs');
const file = 'D:\\VIORA ELITE\\VIORA ELITE-BACKEND\\src\\controllers\\compatibility.controller.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix listApplications to support assignedToMe
content = content.replace(
  "const base=`FROM applications a JOIN guests g ON g.id=a.guest_id JOIN events e ON e.id=a.event_id WHERE ($1::text IS NULL OR a.status=$1) AND ($2::int IS NULL OR a.event_id=$2) AND ($3='' OR g.full_name ILIKE $3 OR g.email ILIKE $3)`; const vals=[status,eventId,`%${q}%`];",
  `const assignedToMe = b.assignedToMe === true || b.assignedToMe === 'true';
  let base = \`FROM applications a JOIN guests g ON g.id=a.guest_id JOIN events e ON e.id=a.event_id \${assignedToMe ? 'JOIN admin_guest_assignments aga ON g.id=aga.guest_id AND aga.admin_id=$4 AND aga.assignment_status=\\'ACTIVE\\'' : ''} WHERE ($1::text IS NULL OR a.status=$1) AND ($2::int IS NULL OR a.event_id=$2) AND ($3='' OR g.full_name ILIKE $3 OR g.email ILIKE $3)\`;
  let vals = [status, eventId, \`%\${q}%\`];
  if (assignedToMe) { vals.push(req.user.id); }`
);

// We also need to fix the LIMIT $4 OFFSET $5 part in the SELECT query because vals now might have 4 items.
// wait, if vals has 4 items, LIMIT would be $5 OFFSET $6!
// It's better to just build the vals array dynamically.
