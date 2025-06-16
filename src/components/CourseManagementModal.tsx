
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CourseForm from './CourseForm';

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty_level?: string;
  is_published: boolean;
  created_at: string;
}

interface CourseManagementModalProps {
  course?: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

const CourseManagementModal = ({ 
  course, 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}: CourseManagementModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? 'Edit Course' : 'Create New Course'}
          </DialogTitle>
        </DialogHeader>
        <CourseForm
          course={course}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CourseManagementModal;
