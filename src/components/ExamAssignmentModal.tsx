import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Mail } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface ExamAssignmentModalProps {
  exam?: any;
  isOpen: boolean;
  onClose: () => void;
}

const ExamAssignmentModal: React.FC<ExamAssignmentModalProps> = ({
  exam,
  isOpen,
  onClose,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && exam) {
      fetchStudents();
      fetchAssignments();
    }
  }, [isOpen, exam]);

  const fetchStudents = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .not('id', 'is', null);

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = userRoles.map(role => role.user_id);
      const studentProfiles = profiles.filter(profile => studentIds.includes(profile.id));

      const studentsWithEmail = studentProfiles.map(profile => ({
        ...profile,
        email: `student${profile.id.slice(0, 8)}@example.com`, // Placeholder email
      }));

      setStudents(studentsWithEmail);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!exam) return;

    try {
      const { data, error } = await supabase
        .from('exam_assignments')
        .select('student_id')
        .eq('exam_id', exam.id);

      if (error) throw error;

      const assignedIds = data.map(assignment => assignment.student_id);
      setAssignedStudents(assignedIds);
      setSelectedStudents(assignedIds);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!exam) return;

    setSaving(true);
    try {
      // Remove existing assignments
      const { error: deleteError } = await supabase
        .from('exam_assignments')
        .delete()
        .eq('exam_id', exam.id);

      if (deleteError) throw deleteError;

      // Add new assignments
      if (selectedStudents.length > 0) {
        const assignments = selectedStudents.map(studentId => ({
          exam_id: exam.id,
          student_id: studentId,
          status: 'assigned',
        }));

        const { error: insertError } = await supabase
          .from('exam_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `Exam assigned to ${selectedStudents.length} student(s)`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save assignments',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Exam: {exam?.title}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Students</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <Checkbox
                      id={student.id}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{student.full_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {student.email}
                      </div>
                    </div>
                    {assignedStudents.includes(student.id) && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Previously Assigned
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedStudents.length} student(s) selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAssignments} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Assignments'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ExamAssignmentModal;