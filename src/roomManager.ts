import type {
  Room,
  User,
  Question,
  UserAnswer,
  ActiveQuestion,
  QuestionResults,
  PollResults,
  QuizResults,
  Standing,
} from "./types";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  // Check if a room name is available for creation
  canCreateRoom(roomName: string): { canCreate: boolean; reason?: string } {
    if (!roomName || roomName.trim() === "") {
      return { canCreate: false, reason: "Room name cannot be empty" };
    }

    if (this.rooms.has(roomName)) {
      return { canCreate: false, reason: "Room already exists" };
    }

    return { canCreate: true };
  }

  // Check if a user can join a room
  canJoinRoom(
    roomName: string,
    username: string,
  ): { canJoin: boolean; reason?: string } {
    if (!username || username.trim() === "") {
      return { canJoin: false, reason: "Username cannot be empty" };
    }

    if (!this.rooms.has(roomName)) {
      return { canJoin: false, reason: "Room does not exist" };
    }

    const room = this.rooms.get(roomName)!;
    const existingUser = room.users.get(username);

    if (existingUser && existingUser.connected) {
      return { canJoin: false, reason: "Username already taken in this room" };
    }

    return { canJoin: true };
  }

  // Create or join a room
  joinRoom(roomName: string, username: string): { isCreator: boolean } {
    let room = this.rooms.get(roomName);
    let isCreator = false;

    // Create room if it doesn't exist
    if (!room) {
      room = {
        name: roomName,
        users: new Map(),
        activeQuestion: null,
      };
      this.rooms.set(roomName, room);
      isCreator = true;
    }

    // Check if user is reconnecting
    const existingUser = room.users.get(username);
    if (existingUser) {
      existingUser.connected = true;
      isCreator = existingUser.isCreator;
    } else {
      // Add new user
      const user: User = {
        username,
        points: 0,
        isCreator,
        connected: true,
      };
      room.users.set(username, user);
    }

    return { isCreator };
  }

  // Disconnect a user from a room
  disconnectUser(roomName: string, username: string): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    const user = room.users.get(username);
    if (user) {
      user.connected = false;
    }
  }

  // Check if user is the room creator
  isRoomCreator(roomName: string, username: string): boolean {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    const user = room.users.get(username);
    return user?.isCreator ?? false;
  }

  // Get room
  getRoom(roomName: string): Room | undefined {
    return this.rooms.get(roomName);
  }

  // Start a question
  startQuestion(roomName: string, question: Question): boolean {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    // Don't allow starting a new question if one is already active
    if (room.activeQuestion) return false;

    room.activeQuestion = {
      question,
      startTime: Date.now(),
      answers: [],
    };

    return true;
  }

  // Submit an answer
  submitAnswer(roomName: string, username: string, answer: number): boolean {
    const room = this.rooms.get(roomName);
    if (!room || !room.activeQuestion) return false;

    // Check if answer index is valid
    if (answer < 0 || answer >= room.activeQuestion.question.answers.length) {
      return false;
    }

    // Check if user already answered
    const existingAnswerIndex = room.activeQuestion.answers.findIndex(
      (a) => a.username === username,
    );

    if (existingAnswerIndex !== -1) {
      // Update existing answer
      room.activeQuestion.answers[existingAnswerIndex] = {
        username,
        answer,
        timestamp: Date.now(),
      };
    } else {
      // Add new answer
      room.activeQuestion.answers.push({
        username,
        answer,
        timestamp: Date.now(),
      });
    }

    return true;
  }

  // End a question and calculate results for all users
  endQuestion(roomName: string): Map<string, QuestionResults> | null {
    const room = this.rooms.get(roomName);
    if (!room || !room.activeQuestion) return null;

    const { question, startTime, answers } = room.activeQuestion;
    const userResults = new Map<string, QuestionResults>();

    // Calculate votes
    const votes = new Array(question.answers.length).fill(0);
    answers.forEach((userAnswer) => {
      votes[userAnswer.answer]++;
    });

    // Update points for quiz questions
    if (question.type === "quiz") {
      answers.forEach((userAnswer) => {
        const user = room.users.get(userAnswer.username);
        if (!user) return;

        if (userAnswer.answer === question.correctAnswer) {
          // Calculate points with decay
          const elapsedSeconds = (userAnswer.timestamp - startTime) / 1000;
          const pointsLost = elapsedSeconds * question.decayRate;
          const earnedPoints = Math.max(
            0,
            question.startingPoints - pointsLost,
          );
          user.points += earnedPoints;
        } else {
          // Wrong answer - deduct points
          user.points = Math.max(0, user.points - question.negativePoints);
        }
      });

      // Get current standings (after updating points)
      const standings: Standing[] = Array.from(room.users.values())
        .map((user) => ({
          username: user.username,
          points: user.points,
        }))
        .sort((a, b) => b.points - a.points);

      // Calculate results for each user
      room.users.forEach((user) => {
        const userAnswer = answers.find((a) => a.username === user.username);
        let userScore = 0;

        if (userAnswer) {
          if (userAnswer.answer === question.correctAnswer) {
            const elapsedSeconds = (userAnswer.timestamp - startTime) / 1000;
            const pointsLost = elapsedSeconds * question.decayRate;
            userScore = Math.max(0, question.startingPoints - pointsLost);
          } else {
            userScore = -question.negativePoints;
          }
        }

        userResults.set(user.username, {
          type: "quiz",
          question: question.question,
          answers: question.answers,
          correctAnswer: question.correctAnswer,
          votes,
          userScore,
          standings,
        } as QuizResults);
      });
    } else {
      // Poll results - same for everyone
      const pollResults: PollResults = {
        type: "poll",
        question: question.question,
        answers: question.answers,
        votes,
        totalVotes: answers.length,
      };

      room.users.forEach((user) => {
        userResults.set(user.username, pollResults);
      });
    }

    // Clear active question
    room.activeQuestion = null;

    return userResults;
  }

  // Get current standings for a room
  getStandings(roomName: string): Standing[] {
    const room = this.rooms.get(roomName);
    if (!room) return [];

    return Array.from(room.users.values())
      .map((user) => ({
        username: user.username,
        points: user.points,
      }))
      .sort((a, b) => b.points - a.points);
  }

  // End a room and delete all data
  endRoom(roomName: string): void {
    this.rooms.delete(roomName);
  }

  // Get all connected users in a room
  getConnectedUsers(roomName: string): string[] {
    const room = this.rooms.get(roomName);
    if (!room) return [];

    return Array.from(room.users.values())
      .filter((user) => user.connected)
      .map((user) => user.username);
  }
}
