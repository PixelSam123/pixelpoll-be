# pixelpoll-be

Pixel Poll Backend
Currently just an experimental MVP

## Modes

Currently supports two modes

1. Poll
2. Multiple Choice Quiz

## How it works (generally)

1. User goes to the homepage and creates room. If room already exists, request is rejected, user is asked to choose another name or use another text field to join the room instead
2. User gets redirected to the room page, if he created the room, he becomes room creator.
3. Room creator can create a queue of polls/quizzes
4. Room creator can choose any moment to start/deploy a poll/quiz from the queue
5. Users can join/leave the room at any time by entering username and room name in the homepage. If existing username is in the room, user is asked to choose another username
6. Once a poll/quiz is started, all users in the room can see the poll/quiz and vote/answer
7. Once the poll/quiz is finished, results are shown
8. If it's a quiz, users get their score and correct answers shown. In a quiz, per question the user can set initial points, points decay rate, and negative points for wrong answers
9. Room creator can choose to start another poll/quiz from the queue or create a new one
10. Room creator can end the room at any time, which will disconnect all users and delete the room. When room is ended, all data is deleted from the server
11. When a user is disconnected by himself or by the server, the current points standings in the room is shown to himself as an exit screen
12. Users can leave the room at any time. User is not deleted from the room until the room is ended by the room creator. User can reconnect to the room with the same username if the room is still active.

## How it works (the flow)

## Getting Started
To get started with this template, simply paste this command into your terminal:
```bash
bun create elysia ./elysia-example
```

## Development
To start the development server run:
```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.
