import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, UserPlus, Edit2, Trash2, X, Check, XCircle,
  Search, ShieldAlert, MoreVertical, CalendarDays
} from "lucide-react";
import {
  fetchEvents, fetchUsers, searchUsers, createUser,
  updateUser, deleteUser, activateUser, deactivateUser, blockUser,
  normalizeListResponse, normalizeRole
} from '../../services/api';

interface UserManagementPanelProps {
  token: string;
  /** "ADMIN" shows admin users; "USER" shows regular users. Defaults to "ADMIN". */
  roleFilter?: "ADMIN" | "USER";
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  token,
  roleFilter = "ADMIN"
}) => {
  const isAdminMode = roleFilter === "ADMIN";

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<'name' | 'email' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phoneNumber: "",
    password: "",
    roleName: isAdminMode ? "ADMIN" : "MEMBER",
    status: "ACTIVE",
    assignedEventIds: [] as string[],
  });

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, eventsRes] = await Promise.all([
        searchQuery.trim()
          ? searchUsers(searchQuery, token, page, 20)
          : fetchUsers(token, page, 20),
        isAdminMode ? fetchEvents(token, 0, 100) : Promise.resolve(null)
      ]);

      if (usersRes) {
        // Client-side role filter
        const all = normalizeListResponse(usersRes);
        const filtered = all.filter((u: any) => {
          let hasAdmin = false;
          let isSuperAdmin = false;
          if (u.role) {
            const role = normalizeRole(u.role);
            hasAdmin = role === 'ROLE_MANAGER' || role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_ADMIN' || role === 'ADMIN' || role === 'SUPER_ADMIN';
            isSuperAdmin = role === 'ROLE_SUPER_ADMIN' || role === 'SUPER_ADMIN';
          } else if (u.roles) {
            hasAdmin = u.roles.some((r: any) => {
              const role = normalizeRole(r);
              return role === 'ROLE_MANAGER' || role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_ADMIN' || role === 'ADMIN' || role === 'SUPER_ADMIN';
            });
            isSuperAdmin = u.roles.some((r: any) => normalizeRole(r) === 'ROLE_SUPER_ADMIN' || normalizeRole(r) === 'SUPER_ADMIN');
          }
          return isAdminMode ? hasAdmin : !hasAdmin && !isSuperAdmin;
        });
        setUsers(filtered);
        setTotalPages(usersRes.data?.totalPages ?? usersRes.totalPages ?? 1);
      }
      if (eventsRes) setEvents(normalizeListResponse(eventsRes));
    } catch (e) {
      console.error("Failed to load user management data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("mock-state-updated", loadData);
    return () => window.removeEventListener("mock-state-updated", loadData);
  }, [token, page, searchQuery, roleFilter]);

  const displayUsers = [...users].sort((a, b) => {
    const aName = a.full_name || a.firstName || '';
    const bName = b.full_name || b.firstName || '';
    const left = String(sort === 'name' ? aName : a[sort] || '').toLowerCase();
    const right = String(sort === 'name' ? bName : b[sort] || '').toLowerCase();
    return (left < right ? -1 : left > right ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
  });

  const handleOpenModal = (user: any = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({
        email: user.email || "",
        fullName: user.full_name || (user.firstName ? `${user.firstName} ${user.lastName}` : ""),
        phoneNumber: user.phone || user.phoneNumber || "",
        password: "",
        roleName: user.role || (user.roles?.[0] ? normalizeRole(user.roles[0]).replace('ROLE_', '') : (isAdminMode ? "ADMIN" : "MEMBER")),
        status: user.status || "ACTIVE",
        assignedEventIds: user.assignedEventIds || [],
      });
    } else {
      setFormData({
        email: "",
        fullName: "",
        phoneNumber: "",
        password: "",
        roleName: isAdminMode ? "ADMIN" : "MEMBER",
        status: "ACTIVE",
        assignedEventIds: [],
      });
    }
    setIsModalOpen(true);
    setFormError('');
    setOpenMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return setFormError('Full name is required.');
    if (!editingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setFormError('Enter a valid email address.');
    if (!editingUser && !formData.password.trim()) return setFormError('Password is required.');
    if (formData.phoneNumber && !/^[0-9+()\s-]{7,20}$/.test(formData.phoneNumber)) return setFormError('Enter a valid phone number.');
    const duplicate = users.some(user => user.email?.toLowerCase() === formData.email.toLowerCase() && user.id !== editingUser?.id);
    if (duplicate) return setFormError('That email address is already in use.');
    setSubmitting(true);
    try {
      const payload: any = {
        full_name: formData.fullName.trim(),
        phone: formData.phoneNumber,
        role: formData.roleName === "USER" ? "MEMBER" : formData.roleName,
        status: formData.status,
        assigned_event_ids: formData.assignedEventIds,
      };
      if (!editingUser) {
        payload.email = formData.email;
        payload.password = formData.password;
      }

      let data;
      if (editingUser) {
        data = await updateUser(editingUser.id, payload, token);
      } else {
        data = await createUser(payload, token, isAdminMode);
      }
      if (data.success) {
        setIsModalOpen(false);
        loadData();
      } else {
        setFormError(data.message || "Operation failed");
      }
    } catch (e: any) {
      setFormError(e.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    setOpenMenuId(null);
    try {
      await deleteUser(id, token);
      loadData();
    } catch { alert("Delete failed"); }
  };

  const handleToggleStatus = async (user: any, action: "activate" | "deactivate" | "suspend") => {
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    setOpenMenuId(null);
    try {
      if (action === "activate") await activateUser(user.id, token);
      else if (action === "deactivate") await deactivateUser(user.id, token);
      else await blockUser(user.id, token);
      loadData();
    } catch { alert(`Failed to ${action} user`); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-7xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">
            {isAdminMode ? "Admin Management" : "User Management"}
          </h2>
          <p className="text-xs text-[#555] mt-0.5">
            {isAdminMode
              ? "Manage admin and super admin accounts and their event assignments."
              : "View, suspend, or remove user accounts."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              type="text"
              placeholder={`Search ${isAdminMode ? "admins" : "users"}…`}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg pl-9 pr-4 py-2 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none w-56 transition-colors"
            />
          </div>
          {/* Add button */}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#C5A059] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#D4B86A] transition-colors"
          >
            {isAdminMode ? <Shield size={15} /> : <UserPlus size={15} />}
            {isAdminMode ? "Add Admin / Super Admin" : "Add User"}
          </button>
          <select value={`${sort}:${sortDir}`} onChange={e => { const [field, direction] = e.target.value.split(':') as ['name' | 'email' | 'status', 'asc' | 'desc']; setSort(field); setSortDir(direction); }} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-[#888]">
            <option value="name:asc">Name A-Z</option><option value="name:desc">Name Z-A</option><option value="email:asc">Email A-Z</option><option value="status:asc">Status A-Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#555] text-sm">Loading…</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
                <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Name</th>
                <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Email</th>
                <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Role</th>
                {isAdminMode && (
                  <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Events</th>
                )}
                <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold text-[#555] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111]">
              {displayUsers.map(u => {
                const displayName = u.full_name || (u.firstName ? `${u.firstName} ${u.lastName}` : "Unknown");
                return (
                <tr key={u.id} className="hover:bg-[#111]/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#C5A059] font-semibold shrink-0">
                        {(displayName[0] || "?").toUpperCase()}
                      </div>
                      <span className="text-sm text-[#DDD] font-medium">
                        {displayName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#888] text-xs">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#C5A059] font-semibold tracking-wide">
                      {u.role || u.roles?.[0]?.name || "—"}
                    </span>
                  </td>
                  {isAdminMode && (
                    <td className="px-5 py-3.5 text-xs text-[#666]">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={12} className="text-[#444]" />
                        {u.assignedEventIds?.length || 0} event{u.assignedEventIds?.length !== 1 ? "s" : ""}
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      u.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right relative" ref={openMenuId === u.id ? (menuRef as any) : undefined}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                        className="p-1.5 rounded-lg text-[#555] hover:text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {openMenuId === u.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-4 top-full mt-1 w-44 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                          {isAdminMode && (
                            <button
                              onClick={() => handleOpenModal(u)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                            >
                              <Edit2 size={13} className="text-[#C5A059]" /> Edit / Assign Events
                            </button>
                          )}
                          {u.status === "ACTIVE" ? (
                            <button
                              onClick={() => handleToggleStatus(u, "deactivate")}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                            >
                              <XCircle size={13} className="text-yellow-400" /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(u, "activate")}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                            >
                              <Check size={13} className="text-emerald-400" /> Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(u, "suspend")}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CCC] hover:bg-[#1a1a1a] transition-colors"
                          >
                            <ShieldAlert size={13} className="text-orange-400" /> Suspend
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={isAdminMode ? 6 : 5} className="py-16 text-center text-[#555] text-sm">
                    No {isAdminMode ? "admins" : "users"} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <span className="text-xs text-[#555]">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-xs text-[#888] disabled:opacity-40 hover:bg-[#1a1a1a] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0d0d0d] border border-[#222] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-semibold text-[#F5F5F5]">
                  {editingUser ? `Edit ${isAdminMode ? "Admin" : "User"}` : `Add ${isAdminMode ? "Admin" : "User"}`}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[#555] hover:text-[#CCC] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && <p className="text-xs text-red-400" role="alert">{formError}</p>}
                {!editingUser && (
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Email *</label>
                    <input
                      required type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Full Name *</label>
                    <input
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Phone</label>
                    <input
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Password *</label>
                    <input
                      required type="text"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="e.g. password123"
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Role *</label>
                    <select
                      value={formData.roleName}
                      onChange={e => setFormData({ ...formData, roleName: e.target.value })}
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-1.5 font-semibold">Status *</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-[#DDD] focus:border-[#C5A059]/50 outline-none transition-colors"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Event assignment — admin mode only */}
                {isAdminMode && formData.roleName !== 'SUPER_ADMIN' && events.length > 0 && (
                  <div>
                    <label className="block text-[10px] text-[#555] uppercase tracking-widest mb-2 font-semibold">
                      Assign Events
                    </label>
                    <div className="h-44 overflow-y-auto bg-[#111] border border-[#222] rounded-lg p-2 space-y-0.5">
                      {events.map(ev => {
                        const evtId = ev.publicId || ev.id;
                        return (
                        <label key={evtId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.assignedEventIds.includes(evtId)}
                            onChange={e => {
                              const ids = e.target.checked
                                ? [...formData.assignedEventIds, evtId]
                                : formData.assignedEventIds.filter(id => id !== evtId);
                              setFormData({ ...formData, assignedEventIds: ids });
                            }}
                            className="accent-[#C5A059]"
                          />
                          <span className="text-sm text-[#CCC]">{ev.title}</span>
                        </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-[#1a1a1a]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-[#222] text-[#888] hover:text-[#CCC] hover:bg-[#111] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#C5A059] text-black font-semibold hover:bg-[#D4B86A] transition-colors text-sm"
                  >
                    {submitting ? 'Saving…' : editingUser ? "Save Changes" : `Create ${isAdminMode ? "Admin" : "User"}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
