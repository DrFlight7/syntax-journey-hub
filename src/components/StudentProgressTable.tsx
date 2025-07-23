import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, BookOpen, TrendingUp } from 'lucide-react';

interface StudentProgress {
  student_id: string;
  student_name: string;
  student_email: string;
  student_avatar: string | null;
  course_id: string;
  course_title: string;
  completed_tasks: number;
  total_tasks: number;
  completion_percentage: number;
  last_activity: string | null;
  current_task_title: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface StudentProgressTableProps {
  teacherId: string;
}

const StudentProgressTable: React.FC<StudentProgressTableProps> = ({ teacherId }) => {
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoursesAndProgress();
  }, [teacherId]);

  useEffect(() => {
    if (selectedCourse !== 'all') {
      fetchProgressForCourse(selectedCourse);
    } else {
      fetchCoursesAndProgress();
    }
  }, [selectedCourse]);

  const fetchCoursesAndProgress = async () => {
    try {
      setLoading(true);

      // First, get all courses created by the teacher
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('created_by', teacherId)
        .eq('is_published', true);

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
      }

      setCourses(coursesData || []);

      // Then get student progress for all courses
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          course_id,
          completed_tasks,
          total_tasks,
          completion_percentage,
          last_activity_at,
          current_task_id,
          courses!inner(
            id,
            title,
            created_by
          ),
          profiles!inner(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('courses.created_by', teacherId)
        .eq('courses.is_published', true);

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return;
      }

      // Get current task titles
      const progressWithTasks = await Promise.all(
        (progressData || []).map(async (progress: any) => {
          let currentTaskTitle = null;
          if (progress.current_task_id) {
            const { data: taskData } = await supabase
              .from('tasks')
              .select('title')
              .eq('id', progress.current_task_id)
              .single();
            currentTaskTitle = taskData?.title || null;
          }

          // Get user email from auth metadata through profiles
          const { data: authData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', progress.user_id)
            .single();

          return {
            student_id: progress.user_id,
            student_name: progress.profiles?.full_name || 'Unknown',
            student_email: `user-${progress.user_id.slice(0, 8)}`, // Simplified since we can't access auth.users
            student_avatar: progress.profiles?.avatar_url,
            course_id: progress.course_id,
            course_title: progress.courses?.title || 'Unknown Course',
            completed_tasks: progress.completed_tasks || 0,
            total_tasks: progress.total_tasks || 0,
            completion_percentage: progress.completion_percentage || 0,
            last_activity: progress.last_activity_at,
            current_task_title: currentTaskTitle,
          };
        })
      );

      setStudentProgress(progressWithTasks);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressForCourse = async (courseId: string) => {
    try {
      setLoading(true);

      const { data: progressData, error } = await supabase
        .from('user_progress')
        .select(`
          user_id,
          course_id,
          completed_tasks,
          total_tasks,
          completion_percentage,
          last_activity_at,
          current_task_id,
          courses!inner(
            id,
            title
          ),
          profiles!inner(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('course_id', courseId);

      if (error) {
        console.error('Error fetching course progress:', error);
        return;
      }

      const progressWithTasks = await Promise.all(
        (progressData || []).map(async (progress: any) => {
          let currentTaskTitle = null;
          if (progress.current_task_id) {
            const { data: taskData } = await supabase
              .from('tasks')
              .select('title')
              .eq('id', progress.current_task_id)
              .single();
            currentTaskTitle = taskData?.title || null;
          }

          return {
            student_id: progress.user_id,
            student_name: progress.profiles?.full_name || 'Unknown',
            student_email: `user-${progress.user_id.slice(0, 8)}`,
            student_avatar: progress.profiles?.avatar_url,
            course_id: progress.course_id,
            course_title: progress.courses?.title || 'Unknown Course',
            completed_tasks: progress.completed_tasks || 0,
            total_tasks: progress.total_tasks || 0,
            completion_percentage: progress.completion_percentage || 0,
            last_activity: progress.last_activity_at,
            current_task_title: currentTaskTitle,
          };
        })
      );

      setStudentProgress(progressWithTasks);
    } catch (error) {
      console.error('Error fetching course progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (completionPercentage: number) => {
    if (completionPercentage === 100) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (completionPercentage > 0) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">Not Started</Badge>;
    }
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getStats = () => {
    const totalStudents = new Set(studentProgress.map(sp => sp.student_id)).size;
    const activeStudents = new Set(
      studentProgress
        .filter(sp => sp.completion_percentage > 0)
        .map(sp => sp.student_id)
    ).size;
    const avgCompletion = studentProgress.length > 0
      ? Math.round(studentProgress.reduce((sum, sp) => sum + sp.completion_percentage, 0) / studentProgress.length)
      : 0;

    return { totalStudents, activeStudents, avgCompletion };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-row items-center justify-between space-y-0 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-row items-center justify-between space-y-0 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Students</p>
              <div className="text-2xl font-bold">{stats.activeStudents}</div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-row items-center justify-between space-y-0 p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
              <div className="text-2xl font-bold">{stats.avgCompletion}%</div>
            </div>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Student Progress Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Student Progress</CardTitle>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {studentProgress.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No student activity yet</h3>
              <p className="text-gray-500">
                Students will appear here once they start working on your published courses
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Current Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentProgress.map((progress, index) => (
                  <TableRow key={`${progress.student_id}-${progress.course_id}-${index}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={progress.student_avatar || undefined} />
                          <AvatarFallback>
                            {progress.student_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{progress.student_name}</div>
                          <div className="text-sm text-muted-foreground">{progress.student_email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{progress.course_title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {progress.completed_tasks} of {progress.total_tasks} tasks
                        </div>
                        <Progress value={progress.completion_percentage} className="w-[100px]" />
                        <div className="text-xs text-muted-foreground">
                          {Math.round(progress.completion_percentage)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {progress.current_task_title || 'Not started'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(progress.completion_percentage)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatLastActivity(progress.last_activity)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProgressTable;