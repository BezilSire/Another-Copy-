import React, { useState } from 'react';
import { Report } from '../types';
import { api } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { XCircleIcon } from './icons/XCircleIcon';

const ReportStatusBadge: React.FC<{ status: 'new' | 'resolved' }> = ({ status }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize';
  if (status === 'new') {
    return <span className={`${baseClasses} bg-red-800 text-red-300`}>New</span>;
  }
  return <span className={`${baseClasses} bg-slate-700 text-slate-300`}>Resolved</span>;
};

const ReportReviewModal: React.FC<{
    report: Report;
    onClose: () => void;
    onResolve: (reportId: string, postId: string, authorId: string) => void;
    onDismiss: (reportId: string) => void;
    onViewProfile: (userId: string) => void;
}> = ({ report, onClose, onResolve, onDismiss, onViewProfile }) => {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                         <div className="flex justify-between items-start">
                            <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">Review Report</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div>
                                <span className="font-semibold text-gray-400">Reported By: </span> 
                                <button onClick={() => onViewProfile(report.reporterId)} className="text-white hover:underline">{report.reporterName}</button>
                            </div>
                            <p><span className="font-semibold text-gray-400">Reason:</span> <span className="capitalize">{report.reason.replace(/_/g, ' ')}</span></p>
                            {report.details && <p><span className="font-semibold text-gray-400">Details:</span> {report.details}</p>}
                             <div className="mt-4 pt-4 border-t border-slate-700">
                                <h4 className="font-semibold text-gray-400 mb-2">Original Post Content:</h4>
                                <blockquote className="p-3 bg-slate-700/50 border-l-4 border-slate-500 rounded-r-lg italic text-gray-300">
                                    "{report.postContent}"
                                </blockquote>
                                <div className="text-sm mt-2">
                                     <span className="font-semibold text-gray-400">Post Author: </span>
                                     <button onClick={() => onViewProfile(report.postAuthorId)} className="text-white hover:underline">View Author's Profile</button>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button onClick={() => onResolve(report.id, report.postId, report.postAuthorId)} className="w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-red-600 text-white hover:bg-red-700">Uphold & Penalize (-25)</button>
                        <button onClick={() => onDismiss(report.id)} className="mt-3 sm:mt-0 sm:mr-3 w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 bg-slate-600 text-gray-300 hover:bg-slate-500">Dismiss Report</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ReportsViewProps {
    reports: Report[];
    onViewProfile: (userId: string) => void;
    onResolve: (reportId: string, postId: string, authorId: string) => Promise<void>;
    onDismiss: (reportId: string) => Promise<void>;
}


export const ReportsView: React.FC<ReportsViewProps> = ({ reports, onViewProfile, onResolve, onDismiss }) => {
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const { addToast } = useToast();

    const handleResolve = async (reportId: string, postId: string, authorId: string) => {
        try {
            await onResolve(reportId, postId, authorId);
            addToast("Report resolved. Post deleted and user penalized.", "success");
        } catch (error) {
            addToast("Failed to resolve report.", "error");
        } finally {
            setSelectedReport(null);
        }
    };

    const handleDismiss = async (reportId: string) => {
         try {
            await onDismiss(reportId);
            addToast("Report has been dismissed.", "info");
        } catch (error) {
            addToast("Failed to dismiss report.", "error");
        } finally {
            setSelectedReport(null);
        }
    };
    
    return (
    <>
      <div className="mt-6 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Reason</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Reporter</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Date</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0">
                        <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 capitalize">{report.reason.replace(/_/g, ' ')}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">
                        <button onClick={() => onViewProfile(report.reporterId)} className="hover:underline">{report.reporterName}</button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{new Date(report.date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {report.status === 'new' && (
                        <button onClick={() => setSelectedReport(report)} className="text-green-400 hover:text-green-300">
                            Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedReport && (
          <ReportReviewModal 
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onResolve={handleResolve}
            onDismiss={handleDismiss}
            onViewProfile={onViewProfile}
          />
      )}
    </>
  );
};