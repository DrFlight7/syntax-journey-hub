import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const examSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration_minutes: z.number().min(1, 'Duration must be at least 1 minute'),
  is_published: z.boolean(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

type ExamFormData = z.infer<typeof examSchema>;

interface ExamFormProps {
  exam?: any;
  onSubmit: (data: ExamFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ExamForm: React.FC<ExamFormProps> = ({
  exam,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: exam?.title || '',
      description: exam?.description || '',
      instructions: exam?.instructions || '',
      duration_minutes: exam?.duration_minutes || 60,
      is_published: exam?.is_published || false,
      starts_at: exam?.starts_at ? new Date(exam.starts_at).toISOString().slice(0, 16) : '',
      ends_at: exam?.ends_at ? new Date(exam.ends_at).toISOString().slice(0, 16) : '',
    },
  });

  const isPublished = watch('is_published');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exam ? 'Edit Exam' : 'Create New Exam'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter exam title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter exam description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              {...register('instructions')}
              placeholder="Enter exam instructions for students"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
            <Input
              id="duration_minutes"
              type="number"
              {...register('duration_minutes', { valueAsNumber: true })}
              placeholder="60"
              min="1"
            />
            {errors.duration_minutes && (
              <p className="text-sm text-red-600 mt-1">{errors.duration_minutes.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="starts_at">Start Time (Optional)</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                {...register('starts_at')}
              />
            </div>

            <div>
              <Label htmlFor="ends_at">End Time (Optional)</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                {...register('ends_at')}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={isPublished}
              onCheckedChange={(checked) => setValue('is_published', checked)}
            />
            <Label htmlFor="is_published">Publish exam</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : exam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExamForm;