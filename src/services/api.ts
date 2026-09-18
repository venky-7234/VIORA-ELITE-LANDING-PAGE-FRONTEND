import { API_URL, MOCK_MODE } from '../config/env';
import { apiRequest } from '../api/client';
import { resetMockState } from './mockStore';

const BASE_URL = API_URL;
const fetch = (input: RequestInfo | URL, init?: RequestInit) => apiRequest(input.toString(), init);

export const normalizeListResponse = (response: any): any[] => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.content)) return response.data.content;
  if (Array.isArray(response?.data?.data?.content)) return response.data.data.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response)) return response;
  return [];
};

export const normalizeRole = (role: string | any): string => {
  const roleName = typeof role === 'string' ? role : (role?.name || '');
  if (!roleName) return 'ROLE_USER';
  const upper = roleName.toUpperCase();
  if (upper === 'SUPER_ADMIN') return 'ROLE_SUPER_ADMIN';
  if (upper === 'ADMIN') return 'ROLE_MANAGER';
  if (upper === 'MEMBER') return 'ROLE_USER';
  if (upper.startsWith('ROLE_')) return upper;
  return `ROLE_${upper}`;
};

export const googleLogin = async (payload: { idToken: string }) => {
  const response = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Google Login failed');
  }
  return response.json();
};

export const standardLogin = async (payload: { email: string; password: string }) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }
  return response.json();
};

export const getUserProfile = async (token: string) => {
  const response = await fetch(`${BASE_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
};

export const updatePassword = async (passwordData: any, token: string) => {
  const response = await fetch(`${BASE_URL}/users/me/password`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(passwordData)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update password');
  }
  return response.json();
};

// ── Application Submission ───────────────────────────────────────────────────

export interface ApplicationPayload {
  name:                 string;
  eventId?:             string | number;
  phoneCountryCode?:    string;
  contactNumber?:       string;
  notes?:               string;
  email:                string;
  whatsappCountryCode?: string;
  whatsapp?:            string;
  company?:             string;
  journey?:             string;
  linkedinUrl?:         string;
  instagramUrl?:        string;
  facebookUrl?:         string;
  websiteUrl?:          string;
  annualTurnover?:      string;
  whatValue?:           string;
  tribe?:               string;
  // legacy / backward-compat
  dob?:                 string;
  city?:                string;
  industry?:            string;
  referredBy?:          string;
  confirmed?:           boolean;
}

/** Error thrown when the server returns field-level validation errors. */
export class ValidationError extends Error {
  fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>) {
    super('Validation failed');
    this.fieldErrors = fieldErrors;
  }
}

export const submitApplication = async (payload: ApplicationPayload) => {
  if (!payload.eventId) {
    throw new Error('Applications for this event have ended');
  }

  const backendPayload = {
    full_name: payload.name,
    email: payload.email,
    event_id: payload.eventId,
    eventId: payload.eventId,
    phone: payload.contactNumber ? `${payload.phoneCountryCode || ''}${payload.contactNumber}` : undefined,
    whatsapp: payload.whatsapp ? `${payload.whatsappCountryCode || ''}${payload.whatsapp}` : undefined,
    whatsappNumber: payload.whatsapp ? `${payload.whatsappCountryCode || ''}${payload.whatsapp}` : undefined,
    city: payload.city,
    profession: payload.industry,
    oc: payload.industry,
    organization: payload.company,
    linkedin_url: payload.linkedinUrl,
    instagram_url: payload.instagramUrl,
    application_message: payload.journey || payload.notes,
    confirmed: payload.confirmed === true,
  };

  const response = await fetch(`${BASE_URL}/applications`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(backendPayload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // Backend returns { errorCode: 'VALIDATION_ERROR', data: { field: 'message' } }
    if (err.errorCode === 'VALIDATION_ERROR' && err.data) {
      throw new ValidationError(err.data as Record<string, string>);
    }
    throw new Error(err.message || 'Application submission failed');
  }

  return response.json();
};

export const getApplicationStreamUrl = (token: string): string | null => {
  if (MOCK_MODE) return null;
  return `${BASE_URL}/applications/stream?token=${encodeURIComponent(token)}`;
};

export const fetchApplications = async (token: string, page = 0, size = 50) => {
  const response = await fetch(`${BASE_URL}/applications?page=${page}&size=${size}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch applications');
  return response.json();
};

const normalizeApplication = (app: any) => ({
  ...app,
  publicId: String(app.publicId ?? app.application_id ?? app.id),
  eventTitle: app.eventTitle ?? app.event_name,
  createdAt: app.createdAt ?? app.submitted_at,
  fullName: app.fullName ?? app.full_name,
  company: app.company ?? app.organization,
});

export const searchApplications = async (filters: any, page = 0, size = 50, sortBy = 'createdAt', sortDir = 'DESC', token: string) => {
  const payload = {
    assignedToMe: filters.assignedToMe ?? false,
    status: filters.status,
    query: filters.query || "",
    eventId: filters.eventId || filters.event_id || null
  };

  const response = await fetch(`${BASE_URL}/applications/search?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) throw new Error('Search failed');
  const result = await response.json();

  return {
    ...result,
    data: {
      ...result.data,
      content: (result.data?.content ?? []).map(normalizeApplication),
    },
  };
};

export const getImperiumApplications = async (filters: any, page = 0, size = 50, sortBy = 'createdAt', sortDir = 'DESC', token: string) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sortBy,
    sortDir,
  });

  if (filters.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
  if (filters.query) queryParams.append('query', filters.query);

  const response = await fetch(`${BASE_URL}/applications/imperium?${queryParams.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch Imperium applications');
  const result = await response.json();

  return {
    ...result,
    data: {
      ...result.data,
      content: (result.data?.content ?? result.data ?? []).map(normalizeApplication),
    },
  };
};

export const getWebsiteApplications = async (filters: any, page = 0, size = 50, sortBy = 'createdAt', sortDir = 'DESC', token: string) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sortBy,
    sortDir,
  });

  if (filters.status && filters.status !== 'ALL') queryParams.append('status', filters.status);
  if (filters.query) queryParams.append('query', filters.query);

  const response = await fetch(`${BASE_URL}/applications/website?${queryParams.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch Website applications');
  const result = await response.json();

  return {
    ...result,
    data: {
      ...result.data,
      content: (result.data?.content ?? result.data ?? []).map(normalizeApplication),
    },
  };
};

export const getImperiumApplicationSummary = async (token: string) => {
  const response = await fetch(`${BASE_URL}/applications/imperium/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch Imperium summary');
  return response.json();
};

export const getWebsiteApplicationSummary = async (token: string) => {
  const response = await fetch(`${BASE_URL}/applications/website/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch Website summary');
  return response.json();
};

export const approveApplication = async (publicId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/${publicId}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Approval failed');
  return response.json();
};

export const rejectApplication = async (publicId: string, reason: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/${publicId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
  if (!response.ok) throw new Error('Rejection failed');
  return response.json();
};

export const fetchDashboardStats = async (token: string, eventId?: string | null) => {
  let url = `${BASE_URL}/dashboard/summary`;
  if (eventId) {
    url += `?eventId=${eventId}`;
  }
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to load stats');
  return response.json();
};



export const getGuestProfile = async (publicId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/${publicId}/guest-profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to load guest profile');
  return response.json();
};

/** Fetch guests (approved applications) for assignment purposes */
export const fetchGuests = async (token: string, page = 0, size = 100) => {
  const response = await fetch(`${BASE_URL}/applications/search?page=${page}&size=${size}&sortBy=createdAt&sortDir=DESC`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  if (!response.ok) throw new Error('Failed to fetch guests');
  return response.json();
};

export const bulkApproveApplications = async (publicIds: string[], token: string) => {
  const response = await fetch(`${BASE_URL}/applications/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ publicIds })
  });
  if (!response.ok) throw new Error('Bulk approve failed');
  return response.json();
};

export const bulkRejectApplications = async (publicIds: string[], reason: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/bulk-reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ publicIds, reason })
  });
  if (!response.ok) throw new Error('Bulk reject failed');
  return response.json();
};

export const assignAdmin = async (publicId: string, adminIdentifier: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/${publicId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ admin_id: adminIdentifier })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Assign admin failed');
  }
  return response.json();
};

export const fetchAdmins = async (token: string) => {
  const response = await fetch(`${BASE_URL}/users?size=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Fetch admins failed');
  return response.json();
};

export const fetchEvents = async (token?: string, page = 0, size = 50) => {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}/events?page=${page}&size=${size}`, { headers });
  if (!response.ok) throw new Error('Fetch events failed');
  return response.json();
};

export const createEvent = async (eventData: any, token: string) => {
  const response = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(eventData)
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Create event failed: ${errText}`);
  }
  return response.json();
};

export const updateEvent = async (publicId: string, eventData: any, token: string) => {
  const response = await fetch(`${BASE_URL}/events/${publicId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(eventData)
  });
  if (!response.ok) throw new Error('Update event failed');
  return response.json();
};

export const deleteEvent = async (publicId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/events/${publicId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Delete event failed');
  if (response.status === 204) return { success: true };
  return response.json().catch(() => ({ success: true }));
};

export const changeEventStatus = async (publicId: string, action: string, token: string) => {
  const response = await fetch(`${BASE_URL}/events/${publicId}/${action}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Change status ${action} failed`);
  return response.json();
};

export const fetchUsers = async (token: string, page = 0, size = 20) => {
  const response = await fetch(`${BASE_URL}/users?page=${page}&size=${size}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const searchUsers = async (query: string, token: string, page = 0, size = 20) => {
  const response = await fetch(`${BASE_URL}/users/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search users');
  return response.json();
};

export const createUser = async (userData: any, token: string, isAdmin = false) => {
  const requestedRole = String(userData?.role || '').toUpperCase();
  const url = requestedRole === 'SUPER_ADMIN'
    ? `${BASE_URL}/super-admin/super-admins`
    : isAdmin
      ? `${BASE_URL}/super-admin/admins`
      : `${BASE_URL}/super-admin/users`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    let msg = 'Failed to create user';
    try { const errData = await response.json(); if (errData.message) msg = errData.message; } catch(e) {}
    throw new Error(msg);
  }
  return response.json();
};

export const updateUser = async (id: number, userData: any, token: string) => {
  const response = await fetch(`${BASE_URL}/super-admin/users/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    let msg = 'Failed to update user';
    try { const errData = await response.json(); if (errData.message) msg = errData.message; } catch(e) {}
    throw new Error(msg);
  }
  return response.json();
};

export const deleteUser = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/super-admin/users/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete user');
  return response.json();
};

export const activateUser = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/super-admin/users/${id}/activate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to activate user');
  return response.json();
};

export const deactivateUser = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/super-admin/users/${id}/deactivate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to deactivate user');
  return response.json();
};

export const blockUser = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/super-admin/users/${id}/block`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to suspend/block user');
  return response.json();
};

export const fetchAuditLogs = async (token: string, page = 0, size = 50) => {
  const response = await fetch(`${BASE_URL}/audit-logs?page=${page}&size=${size}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
};

export const fetchInvitations = async (token: string, page = 0, size = 20, eventId?: string | null) => {
  const url = eventId 
    ? `${BASE_URL}/invitations/event/${eventId}?page=${page}&size=${size}`
    : `${BASE_URL}/invitations?page=${page}&size=${size}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch invitations');
  return response.json();
};

export const fetchInvitationByToken = async (token: string) => {
  const response = await fetch(`${BASE_URL}/invitations/token/${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('Invitation not found');
  return response.json();
};

export const fetchTasks = async (token: string) => {
  const response = await fetch(`${BASE_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
};

export const completeTask = async (taskId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/tasks/${encodeURIComponent(taskId)}/complete`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to complete task');
  return response.json();
};

export const fetchSettings = async (token: string) => {
  const response = await fetch(`${BASE_URL}/settings`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
};

export const saveSettings = async (settings: any, token: string) => {
  const response = await fetch(`${BASE_URL}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(settings) });
  if (!response.ok) throw new Error('Failed to save settings');
  return response.json();
};

export const resendInvitation = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/invitations/${id}/resend`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to resend invitation');
  return response.json();
};



export const downloadInvitationPdfBlob = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/invitations/${id}/download-pdf`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to download PDF');
  return response.blob();
};

export const getAdminDashboardSummary = async (token: string) => {
  const response = await fetch(`${BASE_URL}/dashboard/admin-summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch admin dashboard summary');
  const res = await response.json();
  return res.data;
};

export const fetchUnreadNotificationCount = async (token: string) => {
  const response = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch unread notification count');
  return response.json();
};

/** Fetch all users (admin-accessible endpoint) */
export const fetchAllUsers = async (token: string, page = 0, size = 50) => {
  const response = await fetch(`${BASE_URL}/users/search?page=${page}&size=${size}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

/** Update a user's assigned events (admin-accessible PUT /users/{id}) */
export const adminAssignEventsToUser = async (userId: number, assignedEventIds: string[], token: string) => {
  const response = await fetch(`${BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ assigned_event_ids: assignedEventIds }),
  });
  if (!response.ok) throw new Error('Failed to assign events to user');
  return response.json();
};

/** Assign a guest application to a user (reuses the existing assign endpoint) */
export const assignGuestToUser = async (applicationPublicId: string, userIdentifier: string, token: string) => {
  const response = await fetch(`${BASE_URL}/applications/${applicationPublicId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ adminIdentifier: userIdentifier }),
  });
  if (!response.ok) throw new Error('Failed to assign guest to user');
  return response.json();
};

/** Assign an event to an admin */
export const assignEventToAdmin = async (eventId: string, adminId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/events/${eventId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ adminId }),
  });
  if (!response.ok) throw new Error('Failed to assign event to admin');
  return response.json();
};

export const getMyApplication = async (token: string) => {
  const response = await fetch(`${BASE_URL}/applications/my`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch application');
  return response.json();
};

export const getEvent = async (eventId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch event');
  return response.json();
};

export const fetchAnalytics = async (token: string, eventId?: string) => {
  const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  const response = await fetch(`${BASE_URL}/dashboard/charts${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

export const fetchUserMetrics = async (token: string) => {
  const response = await fetch(`${BASE_URL}/dashboard/user-metrics`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch user metrics');
  return response.json();
};

export const fetchNotifications = async (token: string) => {
  const response = await fetch(`${BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationRead = async (id: number, token: string) => {
  const response = await fetch(`${BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to mark notification as read');
  return response.json();
};

export const markAllNotificationsRead = async (token: string) => {
  const response = await fetch(`${BASE_URL}/notifications/read-all`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to mark notifications as read');
  return response.json();
};

export const updateUserProfile = async (profileData: any, token: string) => {
  const response = await fetch(`${BASE_URL}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
};

export const logout = async (token: string) => {
  const response = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Logout failed');
  return response.json();
};

export const resetMockData = () => {
  resetMockState();
};
