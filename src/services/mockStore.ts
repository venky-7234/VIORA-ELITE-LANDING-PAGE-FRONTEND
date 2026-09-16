import applicationsSeed from '../data/mock/applications.json';
import eventsSeed from '../data/mock/events.json';
import invitationsSeed from '../data/mock/invitations.json';
import notificationsSeed from '../data/mock/notifications.json';
import usersSeed from '../data/mock/users.json';

type RecordValue = Record<string, any>;

export interface MockState {
  applications: RecordValue[];
  events: RecordValue[];
  invitations: RecordValue[];
  notifications: RecordValue[];
  users: RecordValue[];
  tasks: RecordValue[];
  activities: RecordValue[];
  settings?: RecordValue;
}

const STORAGE_KEY = 'vioraelite.mock-state.v5';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeUser = (user: RecordValue): RecordValue => ({
  ...user,
  firstName: user.firstName || user.name?.split(' ')[0] || '',
  lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
  roles: user.roles || [{ name: String(user.role || 'USER').replace(/^ROLE_/, '') }],
  assignedEventIds: user.assignedEventIds || [],
});

const normalizeApplication = (application: RecordValue, events: RecordValue[]): RecordValue => {
  const nameParts = String(application.name || '').trim().split(/\s+/).filter(Boolean);
  const event = events.find(item => item.publicId === application.eventId);
  return {
    ...application,
    firstName: application.firstName || nameParts[0] || '',
    lastName: application.lastName || nameParts.slice(1).join(' '),
    eventTitle: application.eventTitle || event?.title || '',
  };
};

const normalizeState = (state: MockState): MockState => ({
  ...state,
  users: state.users.map(normalizeUser),
  applications: state.applications.map(application => normalizeApplication(application, state.events)),
});

const seedState = (): MockState => ({
  applications: clone(applicationsSeed.content),
  events: clone(eventsSeed.content),
  invitations: clone(invitationsSeed.content),
  notifications: clone(notificationsSeed.content),
  users: clone(usersSeed.content).map(normalizeUser),
  tasks: [],
  activities: [],
  settings: {},
});

const readState = (): MockState => {
  if (typeof window === 'undefined') return normalizeState(seedState());
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return normalizeState(seedState());
    const parsed = JSON.parse(stored);
    if (!parsed.applications || parsed.applications.length === 0 || !parsed.users || parsed.users.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return normalizeState(seedState());
    }
    return normalizeState({ ...seedState(), ...parsed });
  } catch {
    return normalizeState(seedState());
  }
};

export const mockState = readState();

export const persistMockState = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    window.dispatchEvent(new CustomEvent('mock-state-updated'));
  }
};

export const resetMockState = () => {
  Object.assign(mockState, normalizeState(seedState()));
  persistMockState();
};

const addActivity = (action: string, entity: string, entityId: string | number, description: string) => {
  mockState.activities.unshift({
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId: 1, actor: 'Super Admin', action, entity, entityId, description,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
};

const addNotification = (recipientId: string | number, type: string, title: string, message: string, relatedEntityId?: string) => {
  mockState.notifications.unshift({
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, recipientId, type, title, message,
    relatedEntityId, isRead: false, createdAt: new Date().toISOString(),
  });
};

export const addMockActivity = (action: string, entity: string, entityId: string | number, description: string) => {
  addActivity(action, entity, entityId, description);
  persistMockState();
};

export const resendMockInvitation = (id: number) => {
  const invitation = mockState.invitations.find(item => item.id === id);
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status === 'SENT' && invitation.lastSentAt) return invitation;
  invitation.status = 'SENT';
  invitation.lastSentAt = new Date().toISOString();
  const recipient = mockState.applications.find(item => item.publicId === invitation.applicationId)?.assignedAdminId;
  if (recipient) addNotification(recipient, 'INVITATION_RESENT', 'Invitation resent', `Invitation ${invitation.invitationNumber || invitation.publicId} was resent.`, invitation.publicId);
  addActivity('RESENT', 'INVITATION', invitation.publicId, `Super Admin resent invitation ${invitation.invitationNumber || invitation.publicId}`);
  persistMockState();
  return invitation;
};

export const getMockTasks = (assigneeId?: number) => assigneeId
  ? mockState.tasks.filter(task => task.assigneeId === assigneeId)
  : mockState.tasks;

export const completeMockTask = (taskId: string) => {
  const task = mockState.tasks.find(item => item.id === taskId);
  if (!task) throw new Error('Task not found');
  if (task.status === 'COMPLETED') return task;
  task.status = 'COMPLETED';
  task.completedAt = new Date().toISOString();
  addActivity('COMPLETED', 'TASK', taskId, `Task ${taskId} was completed`);
  persistMockState();
  return task;
};

export const assignApplication = (applicationId: string, adminId: number, actor = 'Super Admin') => {
  const application = mockState.applications.find(item => item.publicId === applicationId);
  const admin = mockState.users.find(item => item.id === adminId);
  if (!application || !admin) throw new Error('Application or admin not found');
  const isReviewer = admin.roles?.some((role: RecordValue) => ['ADMIN', 'MANAGER'].includes(role.name));
  if (!isReviewer) throw new Error('Applications can only be assigned to admins or managers');
  const previousAdminId = application.assignedAdminId;
  if (previousAdminId === adminId) return application;
  const previousAdmin = mockState.users.find(item => item.id === previousAdminId);
  if (previousAdmin?.assignedApplicationIds) {
    previousAdmin.assignedApplicationIds = previousAdmin.assignedApplicationIds.filter((id: string) => id !== applicationId);
  }
  mockState.tasks.forEach(task => {
    if (task.relatedEntityId === applicationId && task.status === 'PENDING') {
      task.status = 'CANCELLED';
      task.cancelledAt = new Date().toISOString();
    }
  });
  application.assignedAdminId = adminId;
  application.assignedAdminName = `${admin.firstName} ${admin.lastName}`.trim();
  application.assignedTo = admin.email;
  admin.assignedApplicationIds = [...new Set([...(admin.assignedApplicationIds || []), applicationId])];
  mockState.tasks.unshift({
    id: `TASK-${Date.now()}`, type: 'APPLICATION_REVIEW', status: 'PENDING',
    assigneeId: adminId, relatedEntityId: applicationId,
    title: 'Review assigned application', createdAt: new Date().toISOString(),
  });
  addNotification(adminId, 'APPLICATION_ASSIGNED', previousAdminId ? 'Application reassigned' : 'Application assigned', `${actor} assigned ${application.name || application.email} to you.`, applicationId);
  addActivity(previousAdminId ? 'REASSIGNED' : 'ASSIGNED', 'APPLICATION', applicationId, `${actor} assigned application ${applicationId} to ${admin.email}`);
  persistMockState();
  return application;
};

export const updateApplicationStatus = (applicationId: string, status: string, reason?: string) => {
  const application = mockState.applications.find(item => item.publicId === applicationId);
  if (!application) throw new Error('Application not found');
  if (application.status === status && application.rejectionReason === reason) return application;
  if (application.status !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(status)) {
    throw new Error('Only pending applications can be approved or rejected');
  }
  application.status = status;
  application.rejectionReason = reason;
  application.updatedAt = new Date().toISOString();
  if (application.assignedAdminId) {
    addNotification(application.assignedAdminId, `APPLICATION_${status}`, `Application ${status.toLowerCase()}`, `Application ${applicationId} is now ${status}.`, applicationId);
  }
  addActivity(status, 'APPLICATION', applicationId, `Application ${applicationId} changed to ${status}`);
  persistMockState();
  return application;
};

export const updateUserStatus = (id: number, status: string) => {
  const user = mockState.users.find(item => item.id === id);
  if (!user) throw new Error('User not found');
  if (user.status === status) return user;
  user.status = status;
  addActivity(status, 'USER', id, `Super Admin changed ${user.email} status to ${status}`);
  persistMockState();
  return user;
};

export const updateMockSettings = (settings: RecordValue) => {
  mockState.settings = { ...(mockState.settings || {}), ...settings };
  addActivity('UPDATED', 'SETTINGS', 'platform', 'Super Admin updated platform settings');
  persistMockState();
  return mockState.settings;
};

export const createMockUser = (data: RecordValue, role: string) => {
  const user = normalizeUser({ ...data, id: Date.now(), publicId: `USR-MOCK-${Date.now()}`, role, status: 'ACTIVE' });
  mockState.users.unshift(user);
  addActivity('CREATED', 'USER', user.id, `Super Admin created ${role} ${user.email}`);
  persistMockState();
  return user;
};

export const updateMockUser = (id: number, data: RecordValue) => {
  const user = mockState.users.find(item => item.id === id);
  if (!user) throw new Error('User not found');
  Object.assign(user, data, { roles: data.roleName ? [{ name: data.roleName }] : user.roles });
  addActivity('UPDATED', 'USER', id, `Super Admin updated ${user.email}`);
  persistMockState();
  return user;
};

export const deleteMockUser = (id: number) => {
  const index = mockState.users.findIndex(item => item.id === id);
  if (index < 0) throw new Error('User not found');
  const [user] = mockState.users.splice(index, 1);
  addActivity('DELETED', 'USER', id, `Super Admin deleted ${user.email}`);
  persistMockState();
};


export const getMockStats = () => {
  if (mockState.applications.length === 0 || mockState.users.length === 0) {
    resetMockState();
  }
  return {
    pendingApplications: mockState.applications.filter(item => item.status === 'PENDING').length,
    approvedApplications: mockState.applications.filter(item => item.status === 'APPROVED').length,
    rejectedApplications: mockState.applications.filter(item => item.status === 'REJECTED').length,
    totalInvitationsSent: mockState.invitations.filter(item => ['SENT', 'GENERATED'].includes(item.status)).length,
    totalEvents: mockState.events.length,
    activeAdmins: mockState.users.filter(item => item.roles?.some((role: RecordValue) => role.name === 'ADMIN') && item.status === 'ACTIVE').length,
    totalApplications: mockState.applications.length,
    totalUsers: mockState.users.length,
    unreadNotifications: mockState.notifications.filter(item => !item.isRead).length,
  };
};

export const getMockAdminStats = (adminId: number) => {
  const admin = mockState.users.find(user => user.id === adminId);
  const applications = mockState.applications.filter(item =>
    item.assignedAdminId === adminId || item.assignedTo === admin?.email
  );
  const invitations = mockState.invitations.filter(invitation =>
    applications.some(application => application.publicId === invitation.applicationId)
  );
  const today = new Date().toISOString().slice(0, 10);
  return {
    assignedGuests: applications.length,
    pendingApplications: applications.filter(item => item.status === 'PENDING').length,
    approvedApplications: applications.filter(item => item.status === 'APPROVED').length,
    rejectedApplications: applications.filter(item => item.status === 'REJECTED').length,
    generatedInvitations: invitations.filter(item => ['SENT', 'GENERATED'].includes(item.status)).length,
    todaysApplications: applications.filter(item => item.createdAt?.slice(0, 10) === today).length,
    todaysApprovals: applications.filter(item => item.status === 'APPROVED' && item.updatedAt?.slice(0, 10) === today).length,
  };
};
