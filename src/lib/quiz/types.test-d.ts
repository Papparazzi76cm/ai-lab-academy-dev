import {
  StudentQuizAnswer,
  StudentQuizQuestion,
  AdminQuizAnswer,
  QuestionResultDetail,
} from "./types";

// 1. StudentQuizAnswer rejects is_correct
export const invalidStudentAnswer: StudentQuizAnswer = {
  id: "sa-1",
  question_id: "q-1",
  answer_text: "Option",
  position: 0,
  // @ts-expect-error is_correct is not allowed
  is_correct: true,
};

// 2. StudentQuizQuestion rejects explanation
export const invalidStudentQuestion: StudentQuizQuestion = {
  id: "sq-1",
  quiz_id: "quiz-1",
  type: "single_choice",
  question_text: "Question text",
  points: 1,
  position: 0,
  // @ts-expect-error explanation is not allowed
  explanation: "Exposing explanation to student before submission",
  answers: [],
};

// 3. StudentQuizQuestion rejects answers with is_correct
export const invalidStudentQuestionAnswers: StudentQuizQuestion = {
  id: "sq-2",
  quiz_id: "quiz-1",
  type: "single_choice",
  question_text: "Question text",
  points: 1,
  position: 0,
  answers: [
    {
      id: "sa-2",
      question_id: "q-1",
      answer_text: "Option",
      position: 0,
      // @ts-expect-error is_correct is not allowed in StudentQuizAnswer
      is_correct: true,
    },
  ],
};

// 4. AdminQuizAnswer accepts is_correct
export const validAdminAnswer: AdminQuizAnswer = {
  id: "aa-1",
  question_id: "q-1",
  answer_text: "Admin Option",
  is_correct: true,
  position: 0,
};

// 5. QuizResultAnswer (QuestionResultDetail['answers'][number]) accepts is_correct optional
type QuizResultAnswer = QuestionResultDetail["answers"][number];

export const validQuizResultAnswerWithCorrect: QuizResultAnswer = {
  id: "qra-1",
  answer_text: "Result Option",
  position: 0,
  selected: true,
  is_correct: true,
};

export const validQuizResultAnswerWithoutCorrect: QuizResultAnswer = {
  id: "qra-2",
  answer_text: "Result Option",
  position: 1,
  selected: false,
};
