import React from 'react';
import {
  X,
  History,
  Clock,
  UserCheck,
  PlusCircle,
  Edit3,
  UploadCloud,
  Download,
  ArrowRight,
} from 'lucide-react';
import { AuditLogEntry } from '../types';
import { ensureInitialAuditHistory, DEFAULT_AUDIT_USER } from '../utils/auditHelper';

interface AuditHistoryModalProps {
  entityType: 'Customer' | 'Supplier';
  entityId: string;
  entityName: string;
  auditHistory?: AuditLogEntry[];
  onClose: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  entityType,
  entityId,
  entityName,
  auditHistory,
  onClose,
}) => {
  const normalizedHistory = ensureInitialAuditHistory(auditHistory, DEFAULT_AUDIT_USER);

  // Sort chronological timeline newest-first
  const sortedEntries = [...normalizedHistory].sort((a, b) => {
    const tA = a.isoTimestamp ? Date.parse(a.isoTimestamp) : 0;
    const tB = b.isoTimestamp ? Date.parse(b.isoTimestamp) : 0;
    if (tA !== tB) return tB - tA;
    return 0;
  });

  // Identify original creation entry (oldest entry or earliest CREATED/IMPORTED)
  const creationEntry =
    [...normalizedHistory]
      .sort((a, b) => {
        const tA = a.isoTimestamp ? Date.parse(a.isoTimestamp) : 0;
        const tB = b.isoTimestamp ? Date.parse(b.isoTimestamp) : 0;
        return tA - tB;
      })
      .find((entry) => entry.action === 'CREATED' || entry.action === 'IMPORTED') ||
    sortedEntries[sortedEntries.length - 1];

  const handleExportHistory = () => {
    const payload = {
      entityType,
      entityId,
      entityName,
      exportedAt: new Date().toISOString(),
      totalEntries: sortedEntries.length,
      auditHistory: sortedEntries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `SunLight_${entityType}_AuditHistory_${safeId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getBadgeStyle = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'CREATED':
        return {
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-950',
          icon: <PlusCircle className="w-3.5 h-3.5" />,
        };
      case 'IMPORTED':
        return {
          pill: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
          dot: 'bg-sky-500 ring-sky-100 dark:ring-sky-950',
          icon: <UploadCloud className="w-3.5 h-3.5" />,
        };
      case 'UPDATED':
      default:
        return {
          pill: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
          dot: 'bg-amber-500 ring-amber-100 dark:ring-amber-950',
          icon: <Edit3 className="w-3.5 h-3.5" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[80] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Dark Teal Gradient Header */}
        <div className="bg-gradient-to-r from-[#0b3b48] to-[#155e75] text-white px-5 py-4 flex items-center justify-between border-b border-teal-800/80 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-white/15 text-amber-300 border border-white/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-white/15 text-teal-100 border border-white/20">
                  {entityType} Audit Trail
                </span>
                <span className="text-[11px] font-mono text-teal-100/90">
                  {sortedEntries.length} {sortedEntries.length === 1 ? 'Event' : 'Events'}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white truncate mt-0.5">
                {entityId} • {entityName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-teal-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            aria-label="Close Audit History"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Creation Summary Strip */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Created On
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                {creationEntry?.timestamp || '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Created By
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {creationEntry?.performedBy || DEFAULT_AUDIT_USER}
              </span>
            </div>
          </div>
        </div>

        {/* Chronological Timeline (Newest First) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {sortedEntries.map((entry) => {
              const badge = getBadgeStyle(entry.action);
              const hasChanges = entry.changes && entry.changes.length > 0;

              return (
                <div key={entry.id} className="relative">
                  {/* Timeline Node Dot */}
                  <span
                    className={`absolute -left-6 top-1.5 w-[18px] h-[18px] rounded-full ring-4 ${badge.dot} flex items-center justify-center`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>

                  {/* Timeline Entry Card */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs overflow-hidden">
                    {/* Entry Meta Header */}
                    <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.pill}`}
                        >
                          {badge.icon}
                          <span>{entry.action}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          by {entry.performedBy || DEFAULT_AUDIT_USER}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{entry.timestamp}</span>
                      </div>
                    </div>

                    {/* Body / Field Comparison Grid */}
                    <div className="p-3.5 text-xs">
                      {hasChanges ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                                <th className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 w-[28%]">
                                  Field Name
                                </th>
                                <th className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 w-[36%]">
                                  Previous Value
                                </th>
                                <th className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 w-[36%]">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {entry.changes!.map((ch, idx) => (
                                <tr key={`${entry.id}-${ch.field}-${idx}`}>
                                  <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 align-top">
                                    {ch.field}
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <span className="inline-block px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 line-through decoration-rose-400/80 break-words max-w-[210px]">
                                      {ch.oldValue || '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <div className="flex items-start gap-1">
                                      <ArrowRight className="w-3 h-3 text-emerald-500 mt-1 shrink-0 hidden sm:inline" />
                                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold break-words max-w-[210px]">
                                        {ch.newValue || '—'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {entry.action === 'CREATED'
                            ? `${entityType} master record registered in Sun Light Electric ERP.`
                            : entry.action === 'IMPORTED'
                            ? `${entityType} record imported via Excel bulk upload.`
                            : `Record saved without field-level modifications.`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export History</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#155370] hover:bg-[#1a668a] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
