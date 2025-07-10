import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  initial_code: z.string().min(1, 'Initial code is required'),
  expected_output: z.string().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string()).optional(),
  order_index: z.number().min(1, 'Order must be at least 1'),
  test_cases: z.string().optional(),
  month: z.string().optional(),
  week: z.string().optional(),
  theory_concept: z.string().optional(),
  real_world_application: z.string().optional(),
  learning_objectives: z.array(z.string()).optional()
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string;
  initial_code: string;
  expected_output: string | null;
  difficulty_level: string;
  tags: string[];
  order_index: number;
  test_cases: any;
  month?: string;
  week?: string;
  theory_concept?: string;
  real_world_application?: string;
  learning_objectives?: string[];
}

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  taskCount: number;
}

const TaskForm = ({ task, onSubmit, onCancel, loading = false, taskCount }: TaskFormProps) => {
  const [tags, setTags] = React.useState<string[]>(task?.tags || []);
  const [tagInput, setTagInput] = React.useState('');
  const [learningObjectives, setLearningObjectives] = React.useState<string[]>(task?.learning_objectives || []);
  const [objectiveInput, setObjectiveInput] = React.useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      instructions: task?.instructions || '',
      initial_code: task?.initial_code || '',
      expected_output: task?.expected_output || '',
      difficulty_level: (task?.difficulty_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      order_index: task?.order_index || taskCount + 1,
      test_cases: task?.test_cases ? JSON.stringify(task.test_cases, null, 2) : '',
      month: task?.month || '',
      week: task?.week || '',
      theory_concept: task?.theory_concept || '',
      real_world_application: task?.real_world_application || ''
    }
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const addObjective = () => {
    if (objectiveInput.trim() && !learningObjectives.includes(objectiveInput.trim())) {
      const newObjectives = [...learningObjectives, objectiveInput.trim()];
      setLearningObjectives(newObjectives);
      setValue('learning_objectives', newObjectives);
      setObjectiveInput('');
    }
  };

  const removeObjective = (objectiveToRemove: string) => {
    const newObjectives = learningObjectives.filter(obj => obj !== objectiveToRemove);
    setLearningObjectives(newObjectives);
    setValue('learning_objectives', newObjectives);
  };

  const handleFormSubmit = (data: TaskFormData) => {
    // Parse test_cases if provided
    let parsedTestCases = null;
    if (data.test_cases) {
      try {
        parsedTestCases = JSON.parse(data.test_cases);
      } catch (error) {
        console.error('Invalid JSON in test cases:', error);
        return;
      }
    }

    onSubmit({
      ...data,
      tags,
      learning_objectives: learningObjectives,
      test_cases: parsedTestCases
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              {...register('month')}
              placeholder="e.g., January"
            />
          </div>

          <div>
            <Label htmlFor="week">Week</Label>
            <Input
              id="week"
              {...register('week')}
              placeholder="e.g., Week 1"
            />
          </div>

          <div>
            <Label htmlFor="order_index">Task Order *</Label>
            <Input
              id="order_index"
              type="number"
              {...register('order_index', { valueAsNumber: true })}
            />
            {errors.order_index && (
              <p className="text-red-500 text-sm mt-1">{errors.order_index.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="difficulty_level">Difficulty Level *</Label>
            <Select onValueChange={(value) => setValue('difficulty_level', value as 'beginner' | 'intermediate' | 'advanced')}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Enter task title"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>
      </div>

      {/* Pedagogical Content */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Pedagogical Content</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="theory_concept">Theory/Concept</Label>
            <Textarea
              id="theory_concept"
              {...register('theory_concept')}
              placeholder="Explain the theoretical concept or principle behind this task"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="real_world_application">Real-world Application</Label>
            <Textarea
              id="real_world_application"
              {...register('real_world_application')}
              placeholder="Describe how this concept applies in real-world scenarios"
              rows={3}
            />
          </div>

          <div>
            <Label>Learning Objectives</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="Add a learning objective"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addObjective();
                  }
                }}
              />
              <Button type="button" onClick={addObjective}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {learningObjectives.map((objective) => (
                <Badge key={objective} variant="secondary" className="flex items-center gap-1">
                  {objective}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeObjective(objective)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Content */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-lg font-semibold text-orange-900 mb-4">Task Content</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe what this task teaches"
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="instructions">Instructions *</Label>
            <Textarea
              id="instructions"
              {...register('instructions')}
              placeholder="Detailed instructions for completing this task (separate each instruction with a new line)"
              rows={4}
            />
            {errors.instructions && (
              <p className="text-red-500 text-sm mt-1">{errors.instructions.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="initial_code">Initial Code *</Label>
            <Textarea
              id="initial_code"
              {...register('initial_code')}
              placeholder="# Starting code for students"
              rows={6}
              className="font-mono text-sm"
            />
            {errors.initial_code && (
              <p className="text-red-500 text-sm mt-1">{errors.initial_code.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="expected_output">Expected Output</Label>
            <Textarea
              id="expected_output"
              {...register('expected_output')}
              placeholder="Expected output when code is run correctly"
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="test_cases">Test Cases (JSON)</Label>
            <Textarea
              id="test_cases"
              {...register('test_cases')}
              placeholder='[{"input": "example", "expected": "result"}]'
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;