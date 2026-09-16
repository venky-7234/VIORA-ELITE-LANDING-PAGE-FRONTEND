import {
  assignApplication,
  addMockActivity,
  completeMockTask,
  createMockUser,
  deleteMockUser,
  getMockTasks,
  getMockAdminStats,
  getMockStats,
  mockState,
  persistMockState,
  resendMockInvitation,
  updateApplicationStatus,
  updateMockUser,
  updateMockSettings,
  updateUserStatus,
} from '../services/mockStore';
import { generateRoleToken } from '../components/navigation/DashboardSwitcher';

type JsonRecord = Record<string, any>;

const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const binaryResponse = (body: Uint8Array, type: string, status = 200) =>
  new Response(body as BodyInit, { status, headers: { 'Content-Type': type } });

const page = (items: JsonRecord[], size = 50, pageNumber = 0) => ({
  data: {
    content: items.slice(pageNumber * size, (pageNumber + 1) * size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    number: pageNumber,
    size,
  },
});

const readBody = async (init?: RequestInit): Promise<JsonRecord> => {
  if (!init?.body || typeof init.body !== 'string') return {};
  try { return JSON.parse(init.body) as JsonRecord; } catch { return {}; }
};

const getCurrentUser = (init?: RequestInit) => {
  const header = new Headers(init?.headers).get('Authorization');
  const token = header?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return mockState.users.find(user => user.email === payload?.email) || null;
  } catch {
    return null;
  }
};

export const mockRequest = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  await Promise.resolve();
  const url = new URL(typeof input === 'string' ? input : input.toString(), window.location.origin);
  const method = init?.method?.toUpperCase() || 'GET';
  const path = url.pathname.replace(/^.*\/api/, '');
  const body = await readBody(init);

  if (path === '/auth/google' && method === 'POST') {
    return response({ data: { token: 'mock-token', roles: ['ROLE_USER'], user: mockState.users[2] } });
  }
  if (path === '/auth/login' && method === 'POST') {
    const user = mockState.users.find(u => u.email === body.email) || mockState.users[0];
    const rawRoles = user.roles ? user.roles.map((r: any) => r.name) : [user.role || 'USER'];
    const roles = rawRoles.map((r: string) => r.startsWith('ROLE_') ? r : `ROLE_${r}`);
    const token = generateRoleToken(roles, user.email, `${user.firstName} ${user.lastName}`.trim());
    return response({ token, user });
  }
  if (path === '/auth/logout') return response({ data: true });
  if (path === '/users/me' && method === 'GET') {
    const u = getCurrentUser(init);
    if (!u) return response({ message: 'Unauthorized' }, 401);
    return response({ data: u });
  }
  if (path === '/users/me' && method === 'PUT') {
    const user = getCurrentUser(init);
    if (!user) return response({ message: 'User not found' }, 404);
    Object.assign(user, body);
    persistMockState();
    return response({ data: user });
  }
  if (path === '/users/me/password') {
    return response({ message: 'Password changes are not simulated in Mock Mode.' }, 501);
  }

  if (path === '/applications' && method === 'POST') {
    const nameParts = String(body.full_name || body.name || '').trim().split(/\s+/).filter(Boolean);
    const eventIdVal = body.event_id ?? body.eventId;
    const resolvedEvent = mockState.events.find(e =>
      e.publicId === eventIdVal || e.id === eventIdVal || String(e.id) === String(eventIdVal)
    ) || mockState.events[0];
    const application = {
      ...body,
      id: Date.now(), publicId: `APP-MOCK-${Date.now()}`, status: 'PENDING',
      name: body.full_name || body.name || '',
      firstName: body.firstName || nameParts[0] || '',
      lastName: body.lastName || nameParts.slice(1).join(' '),
      email: body.email || '',
      eventId: resolvedEvent?.publicId || null,
      eventTitle: body.eventTitle || resolvedEvent?.title || '',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockState.applications.unshift(application);
    persistMockState();
    return response({ data: application }, 201);
  }
  if (path === '/applications/my') return response({ data: mockState.applications[0] || null });
  if (path === '/applications' && method === 'GET') return response(page(mockState.applications, Number(url.searchParams.get('size') || 50), Number(url.searchParams.get('page') || 0)));
  if (path === '/applications/search' && method === 'POST') {
    const currentUser = getCurrentUser(init);
    const query = String(body.query || '').trim().toLowerCase();
    const matchesText = (value: unknown, filter: unknown) =>
      !filter || String(value || '').toLowerCase().includes(String(filter).trim().toLowerCase());
    const filtered = mockState.applications.filter(item => {
      const searchable = [item.publicId, item.name, item.firstName, item.lastName, item.email, item.company, item.phone, item.contactNumber, item.whatsapp].join(' ').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesStatus = !body.status || item.status === body.status;
      const matchesEvent = !body.eventId || item.eventId === body.eventId;
      const matchesAssignee = !body.assignedToMe || item.assignedAdminId === currentUser?.id || item.assignedTo === currentUser?.email;
      const matchesCity = matchesText(item.city, body.city);
      const matchesIndustry = matchesText(item.industry, body.industry);
      const matchesCompany = matchesText(item.company, body.company);
      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
      const matchesDateFrom = !body.dateFrom || (!Number.isNaN(createdAt) && createdAt >= new Date(body.dateFrom).getTime());
      const matchesDateTo = !body.dateTo || (!Number.isNaN(createdAt) && createdAt <= new Date(`${body.dateTo}T23:59:59.999Z`).getTime());
      return matchesQuery && matchesStatus && matchesEvent && matchesAssignee && matchesCity && matchesIndustry && matchesCompany && matchesDateFrom && matchesDateTo;
    });
    return response(page(filtered, Number(url.searchParams.get('size') || 50), Number(url.searchParams.get('page') || 0)));
  }
  if (path === '/applications/bulk-approve' && method === 'POST') {
    const applications = (body.publicIds || []).map((id: string) => mockState.applications.find((item: JsonRecord) => item.publicId === id));
    if (applications.some((item: JsonRecord | undefined) => !item || item.status !== 'PENDING')) return response({ message: 'Only pending applications can be approved' }, 400);
    const updated = (body.publicIds || []).map((id: string) => updateApplicationStatus(id, 'APPROVED'));
    return response({ data: updated });
  }
  if (path === '/applications/bulk-reject' && method === 'POST') {
    const applications = (body.publicIds || []).map((id: string) => mockState.applications.find((item: JsonRecord) => item.publicId === id));
    if (applications.some((item: JsonRecord | undefined) => !item || item.status !== 'PENDING')) return response({ message: 'Only pending applications can be rejected' }, 400);
    const updated = (body.publicIds || []).map((id: string) => updateApplicationStatus(id, 'REJECTED', body.reason));
    return response({ data: updated });
  }
  const applicationMatch = path.match(/^\/applications\/([^/]+)(?:\/(.+))?$/);
  if (applicationMatch) {
    const item = mockState.applications.find(application => application.publicId === applicationMatch[1]);
    const action = applicationMatch[2];
    if (!item) return response({ message: 'Application not found' }, 404);
    if (action === 'guest-profile') {
      const nameParts = String(item.name || '').trim().split(/\s+/);
      const invitation = mockState.invitations.find(inv => inv.applicationId === item.publicId);
      return response({ data: {
        ...item,
        firstName: item.firstName || nameParts[0] || '',
        lastName: item.lastName || nameParts.slice(1).join(' '),
        currentApplicationStatus: item.status,
        currentEventName: item.eventTitle,
        invitationStatus: invitation?.status,
        invitationNumber: invitation?.invitationNumber,
        timeline: [], history: [], audit: [],
      } });
    }
    if (action === 'approve') return response({ data: updateApplicationStatus(applicationMatch[1], 'APPROVED') });
    if (action === 'reject') return response({ data: updateApplicationStatus(applicationMatch[1], 'REJECTED', body.reason) });
    if (action === 'assign') {
      const admin = mockState.users.find(user => user.email === body.adminIdentifier || user.id === Number(body.adminIdentifier));
      return admin ? response({ data: assignApplication(applicationMatch[1], admin.id) }) : response({ message: 'Admin not found' }, 404);
    }
  }

  if (path === '/events' && method === 'GET') return response(page(mockState.events, Number(url.searchParams.get('size') || 50), Number(url.searchParams.get('page') || 0)));
  if (path === '/events' && method === 'POST') {
    const event: JsonRecord = { ...body, id: Date.now(), publicId: `EVT-MOCK-${Date.now()}`, status: 'DRAFT' };
    mockState.events.unshift(event);
    addMockActivity('CREATED', 'EVENT', event.publicId, `Super Admin created event ${event.title}`);
    persistMockState();
    return response({ data: event }, 201);
  }
  const eventMatch = path.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    const eventIndex = mockState.events.findIndex(item => item.publicId === eventMatch[1]);
    const event = mockState.events[eventIndex];
    if (!event) return response({ message: 'Event not found' }, 404);
    if (method === 'GET') return response({ data: event });
    if (method === 'PUT') {
      const updatedEvent = { ...event, ...body };
      mockState.events[eventIndex] = updatedEvent;
      addMockActivity('UPDATED', 'EVENT', event.publicId, `Super Admin updated event ${updatedEvent.title}`);
      persistMockState();
      return response({ data: updatedEvent });
    }
    if (method === 'DELETE') {
      mockState.events.splice(eventIndex, 1);
      
      const appsToDelete = mockState.applications.filter(app => app.eventId === event.publicId).map(app => app.publicId);
      mockState.applications = mockState.applications.filter(app => app.eventId !== event.publicId);
      mockState.invitations = mockState.invitations.filter(inv => inv.eventId !== event.publicId && !appsToDelete.includes(inv.applicationId));

      addMockActivity('DELETED', 'EVENT', event.publicId, `Super Admin deleted event ${event.title}`);
      persistMockState();
      return response({ data: true });
    }
  }
  const eventActionMatch = path.match(/^\/events\/([^/]+)\/(publish|cancel|archive|deactivate)$/);
  if (eventActionMatch && method === 'PUT') {
    const event = mockState.events.find(item => item.publicId === eventActionMatch[1]);
    if (!event) return response({ message: 'Event not found' }, 404);
    const statusByAction: Record<string, string> = {
      publish: 'PUBLISHED',
      cancel: 'CANCELLED',
      archive: 'ARCHIVED',
      deactivate: 'INACTIVE',
    };
    const nextStatus = statusByAction[eventActionMatch[2]];
    if (event.status === nextStatus) return response({ data: event });
    event.status = nextStatus;
    addMockActivity(eventActionMatch[2].toUpperCase(), 'EVENT', event.publicId, `Super Admin changed event ${event.title} to ${event.status}`);
    persistMockState();
    return response({ data: event });
  }

  if (path === '/users' || path === '/users/search') {
    const query = (url.searchParams.get('q') || '').toLowerCase();
    const users = query ? mockState.users.filter(user => `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(query)) : mockState.users;
    return response(page(users, Number(url.searchParams.get('size') || 50), Number(url.searchParams.get('page') || 0)));
  }
  if (path.startsWith('/super-admin/admins') && method === 'POST') return response({ success: true, data: createMockUser(body, 'ADMIN') }, 201);
  if (path.startsWith('/super-admin/users') && method === 'POST') return response({ success: true, data: createMockUser(body, 'USER') }, 201);
  const userAction = path.match(/^\/super-admin\/users\/(\d+)(?:\/(activate|deactivate|block))?$/);
  if (userAction) {
    const id = Number(userAction[1]);
    if (method === 'PUT') return response({ success: true, data: updateMockUser(id, body) });
    if (method === 'DELETE') { deleteMockUser(id); return response({ success: true, data: true }); }
    if (userAction[2]) return response({ success: true, data: updateUserStatus(id, userAction[2] === 'activate' ? 'ACTIVE' : userAction[2] === 'block' ? 'SUSPENDED' : 'INACTIVE') });
  }
  const assignedEventsMatch = path.match(/^\/users\/(\d+)$/);
  if (assignedEventsMatch && method === 'PUT') {
    const user = mockState.users.find(item => item.id === Number(assignedEventsMatch[1]));
    if (!user) return response({ message: 'User not found' }, 404);
    user.assignedEventIds = body.assignedEventIds || [];
    persistMockState();
    return response({ success: true, data: user });
  }
  if (path === '/invitations' || path.startsWith('/invitations/event/')) {
    const eventId = path.startsWith('/invitations/event/') ? decodeURIComponent(path.slice('/invitations/event/'.length)) : null;
    const invitations = eventId ? mockState.invitations.filter(item => item.eventId === eventId) : mockState.invitations;
    return response(page(invitations, Number(url.searchParams.get('size') || 20), Number(url.searchParams.get('page') || 0)));
  }
  const invitationToken = path.match(/^\/invitations\/token\/([^/]+)$/);
  if (invitationToken) {
    const invitation = mockState.invitations.find(item => item.token === decodeURIComponent(invitationToken[1]));
    return invitation ? response({ data: invitation }) : response({ message: 'Invitation not found' }, 404);
  }
  const invitationAction = path.match(/^\/invitations\/(\d+)\/(resend|download-pdf)$/);
  if (invitationAction?.[2] === 'resend' && method === 'POST') return response({ data: resendMockInvitation(Number(invitationAction[1])) });
  if (invitationAction?.[2] === 'download-pdf' && method === 'GET') {
    const invitation = mockState.invitations.find(item => item.id === Number(invitationAction[1]));
    if (!invitation) return response({ message: 'Invitation not found' }, 404);
    const text = `Viora Elite - ${invitation.guestName || 'Guest'} - ${invitation.eventTitle || 'The Imperium'}`.replace(/[()\\]/g, '');
    const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET\n`;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return binaryResponse(new TextEncoder().encode(pdf), 'application/pdf');
  }
  if (path.startsWith('/invitations/')) return response({ data: true });
  if (path === '/notifications') {
    const currentUser = getCurrentUser(init);
    if (!currentUser) return response({ message: 'Unauthorized' }, 401);
    const notifications = mockState.notifications.filter(item => item.recipientId === currentUser.id || item.recipientId == null);
    return response(page(notifications, Number(url.searchParams.get('size') || 50), Number(url.searchParams.get('page') || 0)));
  }
  if (path === '/notifications/unread-count') {
    const currentUser = getCurrentUser(init);
    if (!currentUser) return response({ message: 'Unauthorized' }, 401);
    return response({ data: mockState.notifications.filter(item => !item.isRead && (item.recipientId === currentUser.id || item.recipientId == null)).length });
  }
  const notificationRead = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (notificationRead || path === '/notifications/read-all') {
    const currentUser = getCurrentUser(init);
    if (!currentUser) return response({ message: 'Unauthorized' }, 401);
    mockState.notifications.forEach(item => {
      if (path === '/notifications/read-all' && (item.recipientId === currentUser.id || item.recipientId == null)) item.isRead = true;
      if (notificationRead && String(item.id) === notificationRead[1] && (item.recipientId === currentUser.id || item.recipientId == null)) item.isRead = true;
    });
    persistMockState();
    return response({ data: true });
  }

  if (path === '/tasks' && method === 'GET') return response({ data: { content: getMockTasks(), totalElements: mockState.tasks.length } });
  const taskAction = path.match(/^\/tasks\/([^/]+)\/complete$/);
  if (taskAction && method === 'PATCH') return response({ data: completeMockTask(taskAction[1]) });
  if (path === '/settings' && method === 'GET') return response({ data: mockState.settings || {} });
  if (path === '/settings' && method === 'PUT') return response({ data: updateMockSettings(body) });

  if (path === '/dashboard/user-metrics') return response({ data: { applicationStatus: mockState.applications[0]?.status || null, invitationStatusBadge: mockState.invitations[0]?.status || null, unreadNotifications: mockState.notifications.filter(item => !item.isRead).length, daysRemaining: 93, eventName: mockState.events[0]?.title, welcomeMessage: 'Welcome back.' } });
  if (path === '/dashboard/admin-summary') {
    const u = getCurrentUser(init);
    if (!u) return response({ message: 'Unauthorized' }, 401);
    return response({ data: getMockAdminStats(u.id) });
  }
  if (path === '/dashboard/summary') return response({ data: getMockStats() });
  if (path === '/dashboard/charts') {
    const appsByDate: Record<string, { total: number, approved: number, rejected: number }> = {};
    mockState.applications.forEach(app => {
      const date = (app.createdAt || new Date().toISOString()).slice(0, 10);
      if (!appsByDate[date]) appsByDate[date] = { total: 0, approved: 0, rejected: 0 };
      appsByDate[date].total++;
      if (app.status === 'APPROVED') appsByDate[date].approved++;
      if (app.status === 'REJECTED') appsByDate[date].rejected++;
    });

    const invsByDate: Record<string, number> = {};
    mockState.invitations.forEach(inv => {
      if (inv.status === 'SENT') {
        const date = (inv.lastSentAt || inv.createdAt || new Date().toISOString()).slice(0, 10);
        invsByDate[date] = (invsByDate[date] || 0) + 1;
      }
    });

    const applicationsReceived = Object.entries(appsByDate).map(([date, counts]) => ({ date, count: counts.total })).sort((a, b) => a.date.localeCompare(b.date));
    const applicationsApproved = Object.entries(appsByDate).map(([date, counts]) => ({ date, count: counts.approved })).sort((a, b) => a.date.localeCompare(b.date));
    const applicationsRejected = Object.entries(appsByDate).map(([date, counts]) => ({ date, count: counts.rejected })).sort((a, b) => a.date.localeCompare(b.date));
    const invitationsSent = Object.entries(invsByDate).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    const companies: Record<string, number> = {};
    const cities: Record<string, number> = {};
    mockState.applications.forEach(app => {
      if (app.company) companies[app.company] = (companies[app.company] || 0) + 1;
      if (app.city) cities[app.city] = (cities[app.city] || 0) + 1;
    });

    const topCompanies = Object.entries(companies).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const topCities = Object.entries(cities).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    return response({ data: {
      applicationsReceived,
      applicationsApproved,
      applicationsRejected,
      invitationsSent,
      topCompanies,
      topCities,
      invitationStats: { totalGenerated: mockState.invitations.length, totalSent: mockState.invitations.filter(item => item.status === 'SENT').length, totalResponded: 0, totalCancelled: 0 }
    } });
  }
  if (path === '/audit-logs') return response(page(mockState.activities, 50, 0));

  return response({ data: null }, 404);
};
