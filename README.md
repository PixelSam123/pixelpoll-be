# pixelpoll-be

Pixel Poll Backend
Currently just an experimental MVP

## Implementation Status

✅ **COMPLETED** - Full backend implementation using Elysia with WebSockets

### Features Implemented
- Room creation and management
- WebSocket-based real-time communication
- Poll mode with vote counting
- Quiz mode with scoring system (points decay & negative points)
- User reconnection support
- Room creator permissions
- Automatic room cleanup when creator leaves
- Standings/leaderboard system

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

App has separate frontend and backend repo. This frontend is just an SSG that communicates with the backend via HTTP and Websockets.

1. Homepage has app name (Pixel Poll), a form to create a room, and a form to join a room. Form has a username, room name, and a select for choosing whether to create or join a room. On submit, frontend calls a HTTP `/new-room-availability` to the backend with query parameter `room-name=` to check if the room name is available (only when creating a room). It returns `canCreate` and `reason` in a JSON. If joining a room, instead `room-joinability` with query parameter `room-name` and `username` is called. It returns `canJoin` and `reason` in a JSON. If available (or joining a room), user is redirected in the frontend to `/room/:roomName?username=:username`. If can't create or can't join, an error message is shown with the reason from the backend.
2. When in the room page is created, client site connects to backend websocket endpoint `/ws/room/:roomName?username=:username`. Backend checks if room exists, if not, create the room and mark the first person that enters the room as the room creator. If room exists, check if username is already taken in the room, if yes, return a JSON message with type "JoinError" and disconnect. If no, add user to the room. Backend keeps track of all users in the room, and whether they are the room creator or not. Also store the user's points for the purposes of a quiz question (starting at 0).
3. For room creator, the question queue is purely implemented on the frontend. Frontend stores the poll/quiz queue in local storage. Ideally, the question queue UI is a modal to prevent having to navigate to another page. There's two types of questions: Poll and Quiz. Poll has a question and multiple answers (2 minimum). Quiz has a question, multiple answers (2 minimum), and one correct answer. Additionally, quiz questions have starting points, decay rate, and negative points for wrong answers. Room creator can add questions to the queue by filling a form and clicking "Add to Queue". Room creator can also start a question from the queue by clicking "Start Question". This sends a websocket message to the backend with type "StartQuestion" and the question data. Backend then broadcasts the question to all users in the room with a message of type "QuestionStarted" and the question data.
4. When users receive a "QuestionStarted" message, they render the question and possible answers. Users can select an answer and click "Submit Answer". This sends a websocket message to the backend with type "SubmitAnswer" and the selected answer. Backend records the answer for the user.
5. When the room creator decides to end the question, they click "End Question". This sends a websocket message to the backend with type "EndQuestion". Backend then calculates the results based on the answers received. For a poll, it counts the number of votes for each answer. For a quiz, it calculates the points for each user based on their answers, starting points, decay rate, and negative points. Backend then broadcasts the results to all users in the room with a message of type "QuestionEnded" and the results data.
6. When users receive a "QuestionEnded" message, they render the results. For a poll, it shows the number of votes for each answer. For a quiz, it shows the correct answer, number of votes for each answer, and the user's points for that question. Also render a list of current standings in the room based on total points.
7. Room creator can choose to start another question from the queue or create a new one. Users can leave the room at any time by closing the browser tab or clicking "Leave Room". This disconnects the websocket. If the room creator leaves, the room is ended and all users are disconnected with a message of type "RoomEnded". Backend sends a "QuestionEnded" broadcast and deletes all data for the room when it is ended.
8. When a user is disconnected, either by leaving or by the room ending, they see an exit screen with their total points and current standings in the room.
9. Users can reconnect to the room with the same username if the room is still active by going to `/room/:roomName?username=:username` again.
10. The cycle continues until the room creator decides to end the room.

## Project Structure

```
pixelpoll-be/
├── src/
│   ├── index.ts          # Main server with HTTP & WebSocket endpoints
│   ├── types.ts          # TypeScript type definitions
│   └── roomManager.ts    # Room state management logic
├── API.md                # Complete API documentation
├── example-client.html   # Test client for development
└── README.md             # This file
```

## Getting Started

### Installation

Install dependencies:
```bash
bun install
```

### Development

Start the development server:
```bash
bun run dev
```

The server will start at `http://localhost:3000`

### Testing

Open `example-client.html` in multiple browser windows to test:
1. Open the first window - this user becomes the room creator
2. Open additional windows with different usernames
3. Use creator controls to start polls/quizzes
4. Submit answers from different windows
5. End questions to see results

## API Endpoints

### HTTP Endpoints

- `GET /` - Health check
- `GET /room-availability?room-name=<name>` - Check if room name is available
- `GET /room-joinability?room-name=<name>&username=<username>` - Check if user can join room

### WebSocket Endpoint

- `WS /ws/room/:roomName?username=:username` - Connect to room

See [API.md](API.md) for complete documentation.

## Architecture

### Room Management
- Rooms are created on-demand when first user connects
- First user becomes the room creator with special permissions
- Rooms are deleted when creator disconnects or explicitly ends the room

### Quiz Scoring
Points are calculated using:
```
Correct: max(0, startingPoints - (elapsedSeconds × decayRate))
Wrong: -negativePoints (total points can't go below 0)
```

### State Management
- All room state is stored in memory via `RoomManager`
- WebSocket connections are tracked per room
- Users can reconnect and maintain their points

## Technologies Used

- **Elysia** - Fast and type-safe web framework for Bun
- **Bun** - JavaScript runtime and toolkit
- **WebSockets** - Real-time bidirectional communication
- **TypeScript** - Type safety and better developer experience

## Development Notes

- No database required - all state is in-memory
- CORS enabled for all origins (configure for production)
- WebSocket connections automatically cleaned up on disconnect
- Room data automatically deleted when room ends

## Future Enhancements

Potential improvements for production:
- Add Redis for persistent room storage
- Implement rate limiting
- Add authentication/authorization
- Store quiz results history
- Add room passwords/privacy settings
- Implement reconnection token system
- Add analytics and logging
