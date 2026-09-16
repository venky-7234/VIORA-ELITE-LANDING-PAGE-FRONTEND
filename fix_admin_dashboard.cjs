const fs = require('fs');
const path = 'd:/VIORA ELITE/VIORA ELITE-BACKEND/src/controllers/dashboard.controller.js';
let content = fs.readFileSync(path, 'utf8');
const start = content.indexOf('const getAdminDashboard = async (req, res) => {');
const end = content.indexOf('const getMemberDashboard = async (req, res) => {');
if (start !== -1 && end !== -1) {
  const newFunc = `const getAdminDashboard = async (req, res) => {
  try {
    const adminId = req.user.id;

    // 1. assignedGuests
    const agRes = await pool.query("SELECT COUNT(DISTINCT guest_id)::int AS count FROM admin_guest_assignments WHERE admin_id = $1 AND assignment_status = 'ACTIVE'", [adminId]);
    const assignedGuests = agRes.rows[0].count;

    // 2. Applications (pending, approved, rejected, todays)
    const appsRes = await pool.query(\`
      SELECT
        COUNT(*) FILTER (WHERE UPPER(a.status) = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE UPPER(a.status) = 'APPROVED')::int AS approved,
        COUNT(*) FILTER (WHERE UPPER(a.status) = 'REJECTED')::int AS rejected,
        COUNT(*) FILTER (WHERE a.submitted_at >= CURRENT_DATE)::int AS todays_apps,
        COUNT(*) FILTER (WHERE UPPER(a.status) = 'APPROVED' AND a.updated_at >= CURRENT_DATE)::int AS todays_approvals
      FROM applications a
      JOIN admin_guest_assignments aga ON a.guest_id = aga.guest_id
      WHERE aga.admin_id = $1 AND aga.assignment_status = 'ACTIVE'
    \`, [adminId]);
    
    const apps = appsRes.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        assignedGuests: assignedGuests,
        pendingApplications: apps.pending,
        approvedApplications: apps.approved,
        rejectedApplications: apps.rejected,
        generatedInvitations: 0,
        todaysApplications: apps.todays_apps,
        todaysApprovals: apps.todays_approvals
      }
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ success: false, message: "Unable to load admin dashboard" });
  }
};

`;
  content = content.slice(0, start) + newFunc + content.slice(end);
  fs.writeFileSync(path, content);
  console.log('Replaced successfully');
} else {
  console.log('Not found');
}
