// User types
export interface User {
  username: string;
  points: number;
  isCreator: boolean;
  connected: boolean;
}

// Question types
export type QuestionType = "poll" | "quiz";

export interface BaseQuestion {
  type: QuestionType;
  question: string;
  answers: string[];
}

export interface PollQuestion extends BaseQuestion {
  type: "poll";
}

export interface QuizQuestion extends BaseQuestion {
  type: "quiz";
  correctAnswer: number; // index of correct answer
  startingPoints: number;
  decayRate: number; // points lost per second
  negativePoints: number; // points lost for wrong answer
}

export type Question = PollQuestion | QuizQuestion;

// Answer tracking
export interface UserAnswer {
  username: string;
  answer: number; // index of selected answer
  timestamp: number; // when the answer was submitted
}

// Active question state
export interface ActiveQuestion {
  question: Question;
  startTime: number;
  answers: UserAnswer[];
}

// Room state
export interface Room {
  name: string;
  users: Map<string, User>;
  activeQuestion: ActiveQuestion | null;
}

// WebSocket message types
export type WSMessage =
  | JoinErrorMessage
  | UserInfoMessage
  | QuestionStartedMessage
  | QuestionEndedMessage
  | RoomEndedMessage
  | UserJoinedMessage
  | UserLeftMessage;

export interface JoinErrorMessage {
  type: "JoinError";
  reason: string;
}

export interface UserInfoMessage {
  type: "UserInfo";
  username: string;
  isCreator: boolean;
  currentUsers: string[];
}

export interface QuestionStartedMessage {
  type: "QuestionStarted";
  question: Question;
}

export interface QuestionEndedMessage {
  type: "QuestionEnded";
  results: QuestionResults;
}

export interface RoomEndedMessage {
  type: "RoomEnded";
  reason: string;
}

export interface UserJoinedMessage {
  type: "UserJoined";
  username: string;
}

export interface UserLeftMessage {
  type: "UserLeft";
  username: string;
}

// Results types
export interface PollResults {
  type: "poll";
  question: string;
  answers: string[];
  votes: number[]; // count of votes for each answer
  totalVotes: number;
}

export interface QuizResults {
  type: "quiz";
  question: string;
  answers: string[];
  correctAnswer: number;
  votes: number[]; // count of votes for each answer
  userScore: number; // points earned by current user for this question
  standings: Standing[];
}

export interface Standing {
  username: string;
  points: number;
}

export type QuestionResults = PollResults | QuizResults;

// Client-to-server message types
export type ClientMessage =
  | StartQuestionMessage
  | SubmitAnswerMessage
  | EndQuestionMessage
  | EndRoomMessage;

export interface StartQuestionMessage {
  type: "StartQuestion";
  question: Question;
}

export interface SubmitAnswerMessage {
  type: "SubmitAnswer";
  answer: number;
}

export interface EndQuestionMessage {
  type: "EndQuestion";
}

export interface EndRoomMessage {
  type: "EndRoom";
}
