import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExamForm from './ExamForm';

interface ExamManagementModalProps {
  exam?: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

const ExamManagementModal: React.FC<ExamManagementModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        </DialogHeader>
        <ExamForm
          exam={exam}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ExamManagementModal;