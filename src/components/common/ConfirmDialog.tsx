import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: AlertOctagon,
      bg: 'bg-rose-50 text-rose-600 border-rose-200',
      btnVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 text-amber-600 border-amber-200',
      btnVariant: 'primary' as const,
    },
    primary: {
      icon: Info,
      bg: 'bg-blue-50 text-blue-600 border-blue-200',
      btnVariant: 'primary' as const,
    },
  }[variant];

  const Icon = iconConfig.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={iconConfig.btnVariant}
            onClick={() => {
              onConfirm();
            }}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-full border flex items-center justify-center shrink-0',
            iconConfig.bg
          )}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">{description}</div>
        </div>
      </div>
    </Modal>
  );
};
