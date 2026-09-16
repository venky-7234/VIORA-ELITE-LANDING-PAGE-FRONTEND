const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { getPagination, page } = require("../utils/pagination");

const fail = (res, status, message) => res.status(status).json({ message });

const logout = (req, res) => res.json({ data: { loggedOut: true } });

const googleLogin = async (req,res) => {
  const credential=req.body.credential??req.body.idToken??req.body.id_token;
  if(!credential) return fail(res,400,"Google credential is required");
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if(!response.ok) return fail(res,401,"Invalid Google credential");
  const profile=await response.json();
  if(process.env.GOOGLE_CLIENT_ID && profile.aud!==process.env.GOOGLE_CLIENT_ID) return fail(res,401,"Google credential audience is invalid");
  if(profile.email_verified!=="true") return fail(res,401,"Google email is not verified");
  const found=await pool.query(`SELECT id,full_name,email,role,status FROM users WHERE LOWER(email)=LOWER($1)`,[profile.email]);
  const user=found.rows[0];
  if(!user) return fail(res,403,"No account exists for this Google email");
  if(user.status!=="ACTIVE") return fail(res,403,"Your account is not active");
  const token=jwt.sign({id:user.id,role:user.role,email:user.email},process.env.JWT_SECRET,{expiresIn:"1d"});
  await pool.query(`UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=$1`,[user.id]);
  return res.json({data:{token,user}});
};

const getCurrentUser = async (req, res) => {
  const result = await pool.query(`SELECT id, full_name, email, phone, role, status, profile_image_url, last_login_at, created_at, updated_at FROM users WHERE id=$1`, [req.user.id]);
  if (!result.rows[0]) return fail(res, 404, "User not found");
  return res.json({ data: result.rows[0] });
};

const updateCurrentUser = async (req, res) => {
  const { full_name, email, phone, profile_image_url } = req.body;
  const result = await pool.query(`UPDATE users SET full_name=COALESCE($1,full_name), email=COALESCE($2,email), phone=COALESCE($3,phone), profile_image_url=COALESCE($4,profile_image_url), updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING id,full_name,email,phone,role,status,profile_image_url,updated_at`, [full_name ?? null, email ?? null, phone ?? null, profile_image_url ?? null, req.user.id]);
  return res.json({ data: result.rows[0] });
};

const changePassword = async (req, res) => {
  const currentPassword = req.body.currentPassword ?? req.body.current_password;
  const newPassword = req.body.newPassword ?? req.body.new_password;
  if (!currentPassword || !newPassword) return fail(res, 400, "Current password and new password are required");
  if (newPassword.length < 8) return fail(res, 400, "New password must be at least 8 characters");
  const found = await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [req.user.id]);
  if (!found.rows[0] || !(await bcrypt.compare(currentPassword, found.rows[0].password_hash))) return fail(res, 400, "Current password is incorrect");
  await pool.query(`UPDATE users SET password_hash=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [await bcrypt.hash(newPassword, 10), req.user.id]);
  return res.json({ data: { passwordChanged: true } });
};

const listUsers = async (req, res) => {
  const { number, size, offset } = getPagination(req);
  const q = String(req.query.q ?? req.query.query ?? req.query.search ?? "").trim();
  const role = req.query.role ? String(req.query.role).toUpperCase() : null;
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const values = [`%${q}%`, role, status, size, offset];
  const where = `WHERE ($1='' OR full_name ILIKE $1 OR email ILIKE $1) AND ($2::text IS NULL OR role=$2) AND ($3::text IS NULL OR status=$3)`;
  const [rows, count] = await Promise.all([
    pool.query(`SELECT id,full_name,email,phone,role,status,profile_image_url,last_login_at,created_at,updated_at, (SELECT array_agg(event_id) FROM event_admin_assignments WHERE admin_id=users.id AND status='ACTIVE') AS "assignedEventIds" FROM users ${where} ORDER BY created_at DESC LIMIT $4 OFFSET $5`, values),
    pool.query(`SELECT COUNT(*)::int AS total FROM users ${where}`, values.slice(0, 3))
  ]);
  const data = rows.rows.map(row => ({...row, assignedEventIds: row.assignedEventIds || []}));
  return res.json(page(data, count.rows[0].total, number, size));
};

const deleteUser = async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) return fail(res, 400, "You cannot delete your own account");
  const result = await pool.query(`DELETE FROM users WHERE id=$1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return fail(res, 404, "User not found");
  return res.json({ data: { id: result.rows[0].id, deleted: true } });
};

const setUserStatus = status => async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id) && status !== "ACTIVE") return fail(res, 400, "You cannot deactivate or block your own account");
  let result;
  try { result = await pool.query(`UPDATE users SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id,full_name,email,role,status,updated_at`, [status, req.params.id]); }
  catch (error) {
    if (status === "BLOCKED" && error.code === "23514") return fail(res, 400, "The current database schema does not allow BLOCKED user status");
    throw error;
  }
  if (!result.rows[0]) return fail(res, 404, "User not found");
  return res.json({ data: result.rows[0] });
};

const listEvents = async (req, res) => {
  const { number, size, offset } = getPagination(req);
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const [rows, count] = await Promise.all([
    pool.query(`SELECT * FROM events WHERE ($1::text IS NULL OR event_status=$1) ORDER BY event_date DESC LIMIT $2 OFFSET $3`, [status,size,offset]),
    pool.query(`SELECT COUNT(*)::int total FROM events WHERE ($1::text IS NULL OR event_status=$1)`, [status])
  ]);
  return res.json(page(rows.rows,count.rows[0].total,number,size));
};
const getEvent = async (req,res) => { const r=await pool.query(`SELECT * FROM events WHERE id=$1`,[req.params.id]); return r.rows[0]?res.json({data:r.rows[0]}):fail(res,404,"Event not found"); };
const updateEvent = async (req,res) => {
  const b=req.body; const r=await pool.query(`UPDATE events SET event_name=COALESCE($1,event_name),description=COALESCE($2,description),event_date=COALESCE($3,event_date),start_time=COALESCE($4,start_time),end_time=COALESCE($5,end_time),venue=COALESCE($6,venue),city=COALESCE($7,city),dress_code=COALESCE($8,dress_code),max_guests=COALESCE($9,max_guests),updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *`,[b.event_name??null,b.description??null,b.event_date??null,b.start_time??null,b.end_time??null,b.venue??null,b.city??null,b.dress_code??null,b.max_guests??null,req.params.id]);
  return r.rows[0]?res.json({data:r.rows[0]}):fail(res,404,"Event not found");
};
const deleteEvent = async(req,res)=>{try{const r=await pool.query(`DELETE FROM events WHERE id=$1 RETURNING id`,[req.params.id]);return r.rows[0]?res.json({data:{id:r.rows[0].id,deleted:true}}):fail(res,404,"Event not found");}catch(e){if(e.code==="23503")return fail(res,409,"Event cannot be deleted because it has related records");throw e;}};
const setEventStatus = status => async(req,res)=>{const r=await pool.query(`UPDATE events SET event_status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,[status,req.params.id]);return r.rows[0]?res.json({data:r.rows[0]}):fail(res,404,"Event not found");};

const getMyApplication = async(req,res)=>{const r=await pool.query(`SELECT a.*,g.full_name,g.email,g.phone,g.city,g.profession,g.organization,g.linkedin_url,g.instagram_url,e.event_name,e.event_date,e.venue FROM applications a JOIN guests g ON g.id=a.guest_id JOIN events e ON e.id=a.event_id WHERE LOWER(g.email)=LOWER($1) ORDER BY a.submitted_at DESC LIMIT 1`,[req.user.email]);return r.rows[0]?res.json({data:r.rows[0]}):fail(res,404,"Application not found");};
const listApplications = async(req,res)=>{
  const {number,size,offset}=getPagination(req); const b=req.method==="POST"?req.body:req.query; const status=b.status?String(b.status).toUpperCase():null; const eventId=b.eventId??b.event_id??null; const q=String(b.q??b.query??b.search??"").trim();
  const assignedToMe = String(b.assignedToMe) === 'true';
  const joinClause = assignedToMe ? `JOIN admin_guest_assignments aga ON g.id=aga.guest_id AND aga.admin_id=$4 AND aga.assignment_status='ACTIVE'` : ``;
  const base=`FROM applications a JOIN guests g ON g.id=a.guest_id JOIN events e ON e.id=a.event_id ${joinClause} WHERE ($1::text IS NULL OR a.status=$1) AND ($2::int IS NULL OR a.event_id=$2) AND ($3='' OR g.full_name ILIKE $3 OR g.email ILIKE $3)`; 
  const vals=[status,eventId,`%${q}%`];
  if (assignedToMe) vals.push(req.user.id);
  const limitIndex = vals.length + 1;
  const offsetIndex = vals.length + 2;
  const [rows,count]=await Promise.all([
    pool.query(`SELECT a.id AS application_id,a.*,g.full_name,g.email,g.phone,g.city,g.profession,g.organization,g.linkedin_url,g.instagram_url,g.guest_status,e.event_name,e.event_date,e.venue,e.city AS event_city ${base} ORDER BY a.submitted_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,[...vals,size,offset]),
    pool.query(`SELECT COUNT(*)::int total ${base}`,vals)
  ]);
  return res.json(page(rows.rows,count.rows[0].total,number,size));
};
const guestProfile=async(req,res)=>{const r=await pool.query(`SELECT g.* FROM applications a JOIN guests g ON g.id=a.guest_id WHERE a.id=$1`,[req.params.id]);return r.rows[0]?res.json({data:r.rows[0]}):fail(res,404,"Application not found");};

const bulkApplicationStatus=status=>async(req,res)=>{
  const ids=req.body.applicationIds??req.body.application_ids??req.body.ids;
  if(!Array.isArray(ids)||ids.length===0) return fail(res,400,"applicationIds must be a non-empty array");
  const {updateApplicationStatus}=require("./application.controller"); const results=[];
  for(const id of ids){let code=200,payload;const fakeRes={status(value){code=value;return this;},json(value){payload=value;return value;}};await updateApplicationStatus({...req,params:{...req.params,id},body:{...req.body,status}},fakeRes);results.push({id,statusCode:code,data:payload?.data,message:payload?.message});}
  const failed=results.filter(item=>item.statusCode>=400);
  return res.status(failed.length?207:200).json({data:{results,totalElements:results.length,succeeded:results.length-failed.length,failed:failed.length}});
};

const assignApplication=async(req,res)=>{
  const adminId=req.body.adminId??req.body.admin_id;
  if(!adminId)return fail(res,400,"Admin ID is required");
  const app=await pool.query(`SELECT guest_id FROM applications WHERE id=$1`,[req.params.id]); if(!app.rows[0])return fail(res,404,"Application not found");
  const admin=await pool.query(`SELECT id FROM users WHERE id=$1 AND role='ADMIN' AND status='ACTIVE'`,[adminId]); if(!admin.rows[0])return fail(res,400,"Selected user must be an active Admin");
  const existing=await pool.query(`SELECT id FROM admin_guest_assignments WHERE guest_id=$1 AND admin_id=$2 AND assignment_status='ACTIVE'`,[app.rows[0].guest_id,adminId]);
  if(existing.rows[0])return res.json({data:existing.rows[0]});
  const result=await pool.query(`INSERT INTO admin_guest_assignments (guest_id,admin_id,assigned_by,assignment_status) VALUES ($1,$2,$3,'ACTIVE') RETURNING *`,[app.rows[0].guest_id,adminId,req.user.id]); return res.status(201).json({data:result.rows[0]});
};

const updateAssignedEvents=async(req,res)=>{
  const ids=req.body.assignedEventIds??req.body.assigned_event_ids??req.body.eventIds??req.body.event_ids;
  if(!Array.isArray(ids))return fail(res,400,"assignedEventIds must be an array");
  const client=await pool.connect(); 
  try{
    await client.query("BEGIN");
    await client.query(`UPDATE event_admin_assignments SET status='INACTIVE' WHERE admin_id=$1`,[req.params.id]);
    for(const eventId of ids){
      await client.query(`INSERT INTO event_admin_assignments(event_id,admin_id,assigned_by,status) VALUES($1,$2,$3,'ACTIVE') ON CONFLICT (event_id, admin_id) DO UPDATE SET status='ACTIVE', assigned_by=$3`,[eventId,req.params.id,req.user.id]);
    }
    await client.query("COMMIT");
    return res.json({data:{userId:Number(req.params.id),assignedEventIds:ids}});
  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }
};

const unreadCount=async(req,res)=>{const r=await pool.query(`SELECT COUNT(*)::int count FROM notifications WHERE user_id=$1 AND is_read=false`,[req.user.id]);return res.json({data:{count:r.rows[0].count}});};
const charts=async(req,res)=>{const r=await pool.query(`SELECT TO_CHAR(submitted_at,'YYYY-MM') label,COUNT(*)::int value FROM applications WHERE submitted_at>=CURRENT_DATE-INTERVAL '12 months' GROUP BY 1 ORDER BY 1`);return res.json({data:{applications:r.rows}});};

module.exports={googleLogin,logout,getCurrentUser,updateCurrentUser,changePassword,listUsers,deleteUser,setUserStatus,updateAssignedEvents,listEvents,getEvent,updateEvent,deleteEvent,setEventStatus,getMyApplication,listApplications,guestProfile,bulkApplicationStatus,assignApplication,unreadCount,charts,fail};
