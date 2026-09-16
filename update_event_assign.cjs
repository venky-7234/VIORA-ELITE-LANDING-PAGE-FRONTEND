const fs = require('fs');
const path = require('path');

const bPath = 'd:/VIORA ELITE/VIORA ELITE-BACKEND/src';
const routePath = path.join(bPath, 'routes', 'event.route.js');
const compatPath = path.join(bPath, 'controllers', 'compatibility.controller.js');

let routeContent = fs.readFileSync(routePath, 'utf8');
if (!routeContent.includes('assignEventToAdmin')) {
  routeContent = `const authenticateToken = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const compat = require("../controllers/compatibility.controller");
` + routeContent;

  routeContent = routeContent.replace('getEventById\n);', 'getEventById\n);\n\nrouter.post("/:id/assign", authenticateToken, authorizeRoles("SUPER_ADMIN", "MANAGER"), compat.assignEventToAdmin);');
  fs.writeFileSync(routePath, routeContent);
  console.log('event.route.js updated');
}

let compatContent = fs.readFileSync(compatPath, 'utf8');
if (!compatContent.includes('const assignEventToAdmin')) {
  const func = `
const assignEventToAdmin = async (req, res) => {
  const adminId = req.body.adminId ?? req.body.admin_id;
  if (!adminId) return fail(res, 400, "Admin ID is required");
  const eventId = req.params.id;
  
  const admin = await pool.query(\`SELECT id FROM users WHERE id=$1 AND role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER') AND status='ACTIVE'\`, [adminId]);
  if (!admin.rows[0]) return fail(res, 400, "Selected user must be an active Admin");

  const existing = await pool.query(\`SELECT id FROM event_admin_assignments WHERE event_id=$1 AND admin_id=$2 AND status='ACTIVE'\`, [eventId, adminId]);
  if (existing.rows[0]) return res.json({ data: existing.rows[0] });

  const result = await pool.query(\`INSERT INTO event_admin_assignments (event_id, admin_id, assigned_by, status) VALUES ($1, $2, $3, 'ACTIVE') ON CONFLICT (event_id, admin_id) DO UPDATE SET status='ACTIVE', assigned_by=$3 RETURNING *\`, [eventId, adminId, req.user.id]);
  return res.status(201).json({ data: result.rows[0] });
};
`;
  compatContent = compatContent.replace('module.exports={', func + '\nmodule.exports={assignEventToAdmin,');
  fs.writeFileSync(compatPath, compatContent);
  console.log('compatibility.controller.js updated');
}
