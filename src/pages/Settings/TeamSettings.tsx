import React, { useState } from 'react';
import { UserPlus, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const TeamSettings: React.FC = () => {
  const [members, setMembers] = useState([
    {
      id: '1',
      name: 'Alex Morgan',
      email: 'alex.morgan@acme.com',
      role: 'Platform Engineer',
      status: 'ACTIVE',
      lastActive: 'Just now',
    },
    {
      id: '2',
      name: 'Elena Rostova',
      email: 'elena.rostova@acme.com',
      role: 'SRE Lead',
      status: 'ACTIVE',
      lastActive: '12 min ago',
    },
    {
      id: '3',
      name: 'David Chen',
      email: 'david.chen@acme.com',
      role: 'Developer',
      status: 'ACTIVE',
      lastActive: '1 hour ago',
    },
    {
      id: '4',
      name: 'Kavita Patel',
      email: 'kavita.patel@acme.com',
      role: 'Admin',
      status: 'ACTIVE',
      lastActive: '3 hours ago',
    },
    {
      id: '5',
      name: 'Marcus Vance',
      email: 'marcus.vance@acme.com',
      role: 'Developer',
      status: 'ACTIVE',
      lastActive: 'Yesterday',
    },
  ]);

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Team Members & Role-Based Access</h3>
          <p className="text-slate-500 mt-0.5">
            Manage engineering workspace permissions, release signoff authorities, and audit actors.
          </p>
        </div>

        <Button variant="primary" size="xs" icon={<UserPlus size={13} />}>
          Invite Engineer
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Member</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Last Active</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {members.map(member => (
              <tr key={member.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{member.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] font-medium text-slate-800">
                  <select
                    defaultValue={member.role}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Platform Engineer">Platform Engineer</option>
                    <option value="Developer">Developer</option>
                    <option value="SRE Lead">SRE</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {member.status}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                  {member.lastActive}
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-slate-400 hover:text-slate-700 text-xs font-medium">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
