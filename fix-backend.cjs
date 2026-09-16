const fs = require('fs');
const file = 'D:\\VIORA ELITE\\VIORA ELITE-BACKEND\\src\\controllers\\compatibility.controller.js';
let content = fs.readFileSync(file, 'utf8');

// Fix SELECT
content = content.replace(
  "SELECT id FROM admin_guest_assignments WHERE guest_id=$1 AND admin_id=$2 AND status='ACTIVE'",
  "SELECT id FROM admin_guest_assignments WHERE guest_id=$1 AND admin_id=$2 AND assignment_status='ACTIVE'"
);

// Fix INSERT
content = content.replace(
  "INSERT INTO admin_guest_assignments (guest_id,admin_id,assigned_by,status)",
  "INSERT INTO admin_guest_assignments (guest_id,admin_id,assigned_by,assignment_status)"
);

fs.writeFileSync(file, content);
console.log('Fixed backend bug');
