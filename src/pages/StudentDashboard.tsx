
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Clock, Award } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import UserProfile from '@/components/UserProfile';

interface Achievement {
  id: string;
  title: string;
  description: string;
  badge_icon: string;
  points: number;
  earned_at?: string;
}

interface UserProgress {
  completed_tasks: number;
  total_tasks: number;
  completion_percentage: number;
  current_task_id: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: false });

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
      } else {
        setAchievements(allAchievements || []);
      }

      // Fetch user achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select(`
          earned_at,
          achievements (
            id, title, description, badge_icon, points
          )
        `)
        .eq('user_id', user.id);

      if (userAchievementsError) {
        console.error('Error fetching user achievements:', userAchievementsError);
      } else {
        const earnedAchievements = userAchievementsData?.map(ua => ({
          ...ua.achievements,
          earned_at: ua.earned_at
        })) || [];
        setUserAchievements(earnedAchievements);
      }

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching progress:', progressError);
      } else {
        setProgress(progressData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = userAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
  const completionRate = progress ? (progress.completion_percentage || 0) : 0;

  return (
    <RoleGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="w-full bg-white shadow-lg border-b border-blue-100">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Student Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Track your progress and achievements</p>
              </div>
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{progress?.completed_tasks || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      out of {progress?.total_tasks || 0} total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
                    <Progress value={completionRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userAchievements.length}</div>
                    <p className="text-xs text-muted-foreground">
                      out of {achievements.length} available
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalPoints}</div>
                    <p className="text-xs text-muted-foreground">Achievement points earned</p>
                  </CardContent>
                </Card>
              </div>

              {/* Achievements Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Achievements</h2>
                
                {userAchievements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Earned Achievements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userAchievements.map((achievement) => (
                        <Card key={achievement.id} className="border-green-200 bg-green-50">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{achievement.badge_icon}</span>
                              <div>
                                <CardTitle className="text-base text-green-800">
                                  {achievement.title}
                                </CardTitle>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  {achievement.points} points
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <CardDescription className="text-green-700">
                              {achievement.description}
                            </CardDescription>
                            {achievement.earned_at && (
                              <p className="text-xs text-green-600 mt-2">
                                Earned: {new Date(achievement.earned_at).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Achievements */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Available Achievements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements
                      .filter(achievement => !userAchievements.some(ua => ua.id === achievement.id))
                      .map((achievement) => (
                        <Card key={achievement.id} className="border-gray-200 bg-gray-50">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl grayscale">{achievement.badge_icon}</span>
                              <div>
                                <CardTitle className="text-base text-gray-600">
                                  {achievement.title}
                                </CardTitle>
                                <Badge variant="outline">
                                  {achievement.points} points
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <CardDescription>
                              {achievement.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </RoleGuard>
  );
};

export default StudentDashboard;
