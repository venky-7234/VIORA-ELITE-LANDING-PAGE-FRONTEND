const fs = require('fs');
let content = fs.readFileSync('src/components/modules/ApplicationsModule.tsx', 'utf8');
const start = content.indexOf('  const handleConfirmReject = async () => {');
const end = content.indexOf('            <span className="text-xs text-[#888]">{selectedIds.size} selected</span>');
if (start !== -1 && end !== -1) {
  const replacement = `  const handleConfirmReject = async () => {
    if (!rejectTarget || !rejectionReason.trim() || busyAction) return;
    const target = rejectTarget;
    setBusyAction(\`reject:\${target}\`);
    try {
      await rejectApplication(target, rejectionReason.trim(), token);
      setRejectTarget(null);
      setRejectionReason('');
    } catch { toast.error('Rejection failed'); }
    finally { setBusyAction(null); fetchApps(); }
  };
  const handleAssign = async (appId: string, adminId: string) => {
    if (busyAction) return;
    setAssignDD(null);
    setOpenMenu(null);
    setBusyAction(\`assign:\${appId}\`);
    try { await assignAdmin(appId, adminId, token); } catch (e: any) { toast.error(e.message || 'Assign failed'); }
    finally { setBusyAction(null); fetchApps(); }
  };
  const handleBulkApprove = async () => {
    if (!selectedIds.size || busyAction) return;
    setBusyAction('bulk-approve');
    try { await bulkApproveApplications(Array.from(selectedIds), token); setSelected(new Set()); } catch { toast.error('Bulk approve failed'); }
    finally { setBusyAction(null); fetchApps(); }
  };
  const handleBulkReject = async () => {
    if (!selectedIds.size || busyAction) return;
    setRejectionReason('');
    setRejectTarget('bulk');
  };
  const handleConfirmBulkReject = async () => {
    if (rejectTarget !== 'bulk' || !rejectionReason.trim() || busyAction) return;
    setBusyAction('bulk-reject');
    try {
      await bulkRejectApplications(Array.from(selectedIds), rejectionReason.trim(), token);
      setSelected(new Set());
      setRejectTarget(null);
      setRejectionReason('');
    } catch { toast.error('Bulk reject failed'); }
    finally { setBusyAction(null); fetchApps(); }
  };

  const TABS: StatusTab[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'];
  const displayApplications = [...applications].sort((a, b) => {
    const left = String(a[sort] || '').toLowerCase();
    const right = String(b[sort] || '').toLowerCase();
    return (left < right ? -1 : left > right ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
  });

  return (
    <div className="space-y-5 max-w-7xl pb-64">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Applications</h2>
          <p className="text-xs text-[#555] mt-0.5">Review and process guest applications.</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
`;
  content = content.slice(0, start) + replacement + content.slice(end);
  fs.writeFileSync('src/components/modules/ApplicationsModule.tsx', content);
  console.log('Fixed');
} else {
  console.log('Markers not found');
}
