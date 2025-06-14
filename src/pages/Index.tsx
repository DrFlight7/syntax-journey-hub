
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LessonContent from "../components/LessonContent";
import InteractiveCodeEditor from "../components/InteractiveCodeEditor";
import UserProfile from "../components/UserProfile";
import SubscriptionBanner from "../components/SubscriptionBanner";
import { Button } from "@/components/ui/button";

const lesson = {
  title: "Introduction to Python Variables",
  content: `
    <h2>Welcome to Python Programming!</h2>
    <p>In this lesson, you'll learn about <strong>variables</strong> in Python. Variables are fundamental building blocks that allow you to store and manipulate data.</p>
    
    <h3>What is a Variable?</h3>
    <p>A variable is like a container that holds a value. Think of it as a labeled box where you can store information and retrieve it later.</p>
    
    <h3>Creating Variables</h3>
    <p>In Python, creating a variable is simple:</p>
    <pre><code>name = "Alice"
age = 25
height = 5.6</code></pre>
    
    <h3>Variable Rules</h3>
    <ul>
      <li>Variable names must start with a letter or underscore</li>
      <li>They can contain letters, numbers, and underscores</li>
      <li>Variable names are case-sensitive</li>
      <li>Avoid using Python keywords (like <code>if</code>, <code>for</code>, <code>while</code>)</li>
    </ul>
    
    <h3>Try It Yourself!</h3>
    <p>Use the code editor on the right to create your own variables and print them out. Try the example code or experiment with your own!</p>
  `,
  initialCode: `# Welcome to Python!
# Let's create some variables

name = "Your Name"
age = 20
favorite_color = "blue"

# Print the variables
print("Hello, my name is", name)
print("I am", age, "years old")
print("My favorite color is", favorite_color)

# Try creating your own variables below:
`
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="w-full bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-center flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Interactive Coding Platform
              </h1>
            </div>
            <div className="flex items-center">
              <UserProfile />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg text-gray-600 font-medium">
              Learn to code interactively with real-time feedback!
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex justify-center items-start p-4 md:p-6">
        <div className="w-full max-w-7xl">
          {/* Subscription Banner */}
          <SubscriptionBanner />
          
          <div className="flex flex-col lg:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Lesson Content Section */}
            <section className="w-full lg:w-1/2 p-6 md:p-8 overflow-y-auto max-h-[80vh] border-r border-gray-200 bg-gradient-to-b from-white to-gray-50">
              <LessonContent title={lesson.title} content={lesson.content} />
            </section>

            {/* Interactive Code Editor Section */}
            <section className="w-full lg:w-1/2 p-6 md:p-8 bg-gray-900 flex flex-col">
              <InteractiveCodeEditor initialCode={lesson.initialCode} />
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-800 text-white text-center p-4 mt-auto">
        <p className="text-sm">
          &copy; 2025 Interactive Coding Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
