export type CodeSnippet = {
  filePath: string;
  code: string;
  explanation: string;
  language: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type CodingExercise = {
  title: string;
  description: string;
  language: 'javascript' | 'python';
  boilerplate: string;
  solution: string;
  validationScript: string;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  codeFragments: CodeSnippet[];
  furtherReading: { title: string; url: string }[];
  codingExercises: CodingExercise[];
  quizzes: QuizQuestion[];
};

export type Curriculum = {
  projectName: string;
  description: string;
  patterns: string[];
  lessons: Lesson[];
};
