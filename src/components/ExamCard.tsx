import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Exam {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_published: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
}

interface ExamCardProps {
  exam: Exam;
  onEdit: (exam: Exam) => void;
  onDelete: (examId: string) => void;
  onManageAssignments: (exam: Exam) => void;
  isDeleting?: boolean;
}

const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  onEdit,
  onDelete,
  onManageAssignments,
  isDeleting = false,
}) => {
  const isScheduled = exam.starts_at && exam.ends_at;
  const isActive = isScheduled && 
    new Date() >= new Date(exam.starts_at!) && 
    new Date() <= new Date(exam.ends_at!);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-800 mb-2">
              {exam.title}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={exam.is_published ? "default" : "secondary"}>
                {exam.is_published ? "Published" : "Draft"}
              </Badge>
              {isActive && (
                <Badge variant="destructive">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {exam.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {exam.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{exam.duration_minutes} minutes</span>
          </div>
          
          {isScheduled && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(exam.starts_at!), 'MMM d, yyyy HH:mm')} - {format(new Date(exam.ends_at!), 'HH:mm')}
                </span>
              </div>
            </>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Created {format(new Date(exam.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(exam)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageAssignments(exam)}
            className="flex items-center gap-1"
          >
            <Users className="h-3 w-3" />
            Assign
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(exam.id)}
            disabled={isDeleting}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExamCard;