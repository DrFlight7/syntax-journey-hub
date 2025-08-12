
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Users, BarChart3, FileText } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import UserProfile from '@/components/UserProfile';
import TaskManagementModal from '@/components/TaskManagementModal';
import CourseManagementModal from '@/components/CourseManagementModal';
import CourseCard from '@/components/CourseCard';
import StudentProgressTable from '@/components/StudentProgressTable';
import ExamCard from '@/components/ExamCard';
import ExamManagementModal from '@/components/ExamManagementModal';
import ExamAssignmentModal from '@/components/ExamAssignmentModal';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty_level?: string;
  is_published: boolean;
  created_at: string;
}

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

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchExams();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch courses',
          variant: 'destructive',
        });
      } else {
        setCourses(data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exams:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch exams',
          variant: 'destructive',
        });
      } else {
        setExams(data || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exams',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleSubmitCourse = async (data: any) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (editingCourse) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCourse.id);

        if (error) throw error;

        setCourses(prev => 
          prev.map(course => 
            course.id === editingCourse.id 
              ? { ...course, ...data }
              : course
          )
        );

        toast({
          title: 'Success',
          description: 'Course updated successfully',
        });
      } else {
        // Create new course
        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert({
            ...data,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        setCourses(prev => [newCourse, ...prev]);

        toast({
          title: 'Success',
          description: 'Course created successfully',
        });
      }

      setIsCourseModalOpen(false);
      setEditingCourse(null);
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: 'Failed to save course',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      setCourses(prev => prev.filter(course => course.id !== courseId));

      toast({
        title: 'Success',
        description: 'Course deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleManageTasks = (course: Course) => {
    setSelectedCourse(course);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedCourse(null);
  };

  const closeCourseModal = () => {
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  };

  // Exam handlers
  const handleCreateExam = () => {
    setEditingExam(null);
    setIsExamModalOpen(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsExamModalOpen(true);
  };

  const handleSubmitExam = async (data: any) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const sanitizedData = {
        ...data,
        starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : null,
        ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      };
      if (editingExam) {
        // Update existing exam
        const { error } = await supabase
          .from('exams')
            .update({
              ...sanitizedData,
              updated_at: new Date().toISOString(),
            })
          .eq('id', editingExam.id);

        if (error) throw error;

        setExams(prev => 
          prev.map(exam => 
            exam.id === editingExam.id 
              ? { ...exam, ...data }
              : exam
          )
        );

        toast({
          title: 'Success',
          description: 'Exam updated successfully',
        });
      } else {
        // Create new exam
        const { data: newExam, error } = await supabase
          .from('exams')
            .insert({
              ...sanitizedData,
              created_by: user.id,
            })
          .select()
          .single();

        if (error) throw error;

        setExams(prev => [newExam, ...prev]);

        toast({
          title: 'Success',
          description: 'Exam created successfully',
        });
      }

      setIsExamModalOpen(false);
      setEditingExam(null);
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setDeletingExamId(examId);
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      setExams(prev => prev.filter(exam => exam.id !== examId));

      toast({
        title: 'Success',
        description: 'Exam deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        variant: 'destructive',
      });
    } finally {
      setDeletingExamId(null);
    }
  };

  const handleManageAssignments = (exam: Exam) => {
    setSelectedExam(exam);
    setIsAssignmentModalOpen(true);
  };

  const closeExamModal = () => {
    setIsExamModalOpen(false);
    setEditingExam(null);
  };

  const closeAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setSelectedExam(null);
  };

  return (
    <RoleGuard allowedRoles={['teacher']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="w-full bg-white shadow-lg border-b border-blue-100">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Teacher Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Manage your courses and track student progress</p>
              </div>
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                  <div className="text-2xl font-bold">{courses.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {courses.filter(c => c.is_published).length} published
                  </p>
                </div>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Exams</p>
                  <div className="text-2xl font-bold">{exams.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {exams.filter(e => e.is_published).length} published
                  </p>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Enrolled in your courses</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 p-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <div className="text-2xl font-bold">0%</div>
                  <p className="text-xs text-muted-foreground">Average across all courses</p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Courses Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
              <Button onClick={handleCreateCourse} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Course
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No courses yet</h3>
                  <p className="text-gray-500 text-center mb-4">
                    Create your first course to start teaching students
                  </p>
                  <Button onClick={handleCreateCourse} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Course
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEdit={handleEditCourse}
                    onDelete={handleDeleteCourse}
                    onManageTasks={handleManageTasks}
                    isDeleting={deletingCourseId === course.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Exams Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Exams</h2>
              <Button onClick={handleCreateExam} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Exam
              </Button>
            </div>

            {exams.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No exams yet</h3>
                  <p className="text-gray-500 text-center mb-4">
                    Create your first exam to test student knowledge
                  </p>
                  <Button onClick={handleCreateExam} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Exam
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onEdit={handleEditExam}
                    onDelete={handleDeleteExam}
                    onManageAssignments={handleManageAssignments}
                    isDeleting={deletingExamId === exam.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Student Progress Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Progress</h2>
            {user && <StudentProgressTable teacherId={user.id} />}
          </div>
        </main>

        {/* Task Management Modal */}
        <TaskManagementModal
          course={selectedCourse}
          isOpen={isTaskModalOpen}
          onClose={closeTaskModal}
        />

        {/* Course Management Modal */}
        <CourseManagementModal
          course={editingCourse}
          isOpen={isCourseModalOpen}
          onClose={closeCourseModal}
          onSubmit={handleSubmitCourse}
          isLoading={isSubmitting}
        />

        {/* Exam Management Modal */}
        <ExamManagementModal
          exam={editingExam}
          isOpen={isExamModalOpen}
          onClose={closeExamModal}
          onSubmit={handleSubmitExam}
          isLoading={isSubmitting}
        />

        {/* Exam Assignment Modal */}
        <ExamAssignmentModal
          exam={selectedExam}
          isOpen={isAssignmentModalOpen}
          onClose={closeAssignmentModal}
        />
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
