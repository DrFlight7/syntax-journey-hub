
interface LessonContentProps {
  title: string;
  content: string;
}

const LessonContent = ({ title, content }: LessonContentProps) => {
  return (
    <div className="prose prose-lg max-w-none">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-blue-200">
          {title}
        </h1>
      </div>
      
      <div 
        className="lesson-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default LessonContent;
