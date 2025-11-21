# Quick Start Guide

Get the Pixel Poll backend up and running in minutes!

## Prerequisites

- [Bun](https://bun.sh) installed on your system
- Basic knowledge of WebSockets and TypeScript

## Installation

1. **Clone the repository** (if you haven't already)
   ```bash
   cd pixelpoll-be
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start the server**
   ```bash
   bun run dev
   ```

   You should see:
   ```
   🦊 Elysia is running at localhost:3000
   ```

## Testing with the Example Client

1. **Open the test client**
   
   Open `example-client.html` in your browser (you can open it directly or serve it with a simple HTTP server).

2. **Create a room as the creator**
   - Room Name: `test-room`
   - Username: `alice`
   - Click "Connect to Room"
   - You'll see "Creator Controls" appear (you're the room creator!)

3. **Join as another user** (open a new browser window/tab)
   - Room Name: `test-room` (same room)
   - Username: `bob`
   - Click "Connect to Room"
   - You can see "User joined: bob" in the message log of both windows

4. **Create and start a poll** (as Alice, the creator)
   - Question Type: Poll
   - Question: "What's your favorite programming language?"
   - Answers: (already filled in)
   - Click "Start Question"
   - Both users will see the question appear

5. **Submit answers** (in both windows)
   - Select an answer
   - Click "Submit Answer"

6. **End the question** (as Alice)
   - Click "End Question"
   - Both users will see the results with vote counts

7. **Try a quiz** (as Alice)
   - Question Type: Quiz
   - Fill in the question and answers
   - Set correct answer index (0-based)
   - Set points: Starting Points: 1000, Decay Rate: 10, Negative Points: 50
   - Click "Start Question"
   - Both users answer
   - Click "End Question"
   - See quiz results with points and standings!

## API Testing with cURL

### Check Room Availability
```bash
curl "http://localhost:3000/room-availability?room-name=myroom"
```

Response:
```json
{"canCreate":true}
```

### Check if User Can Join
```bash
curl "http://localhost:3000/room-joinability?room-name=myroom&username=john"
```

Response:
```json
{"canJoin":false,"reason":"Room does not exist"}
```

## WebSocket Testing with JavaScript

Create a simple test in your browser console or Node.js:

```javascript
// Connect to a room
const ws = new WebSocket('ws://localhost:3000/ws/room/test-room?username=testuser');

ws.onopen = () => {
  console.log('Connected!');
  
  // Start a poll (only works if you're the first user/creator)
  ws.send(JSON.stringify({
    type: 'StartQuestion',
    question: {
      type: 'poll',
      question: 'Favorite color?',
      answers: ['Red', 'Blue', 'Green']
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
  
  // If question started, submit an answer
  if (message.type === 'QuestionStarted') {
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'SubmitAnswer',
        answer: 0  // Select first answer
      }));
    }, 1000);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Common Scenarios

### Scenario 1: Simple Poll

1. User creates room and becomes creator
2. Other users join
3. Creator starts a poll question
4. Users vote
5. Creator ends the question
6. Everyone sees vote results

### Scenario 2: Quiz Game

1. User creates room and becomes creator
2. Other users join
3. Creator starts a quiz question with:
   - Starting points: 1000
   - Decay rate: 10 points/second
   - Negative points: 50
4. Users race to answer correctly
5. Creator ends the question
6. Users see:
   - Their score for that question
   - Correct answer
   - Current standings/leaderboard

### Scenario 3: Multiple Questions

1. Room is created
2. Creator starts Question 1 → users answer → creator ends it
3. Creator starts Question 2 → users answer → creator ends it
4. Creator starts Question 3 → users answer → creator ends it
5. Final standings show cumulative points
6. Creator ends the room

## Understanding the Flow

```
Creator Flow:
1. Connect → becomes room creator
2. Start question → all users see it
3. End question → results calculated and sent to all
4. End room → all users disconnected, room deleted

Regular User Flow:
1. Connect → joins existing room
2. Receive question → select and submit answer
3. Receive results → see outcome and standings
4. Disconnect → marked as disconnected (can reconnect)

Quiz Scoring:
- Correct answer: startingPoints - (seconds × decayRate)
- Wrong answer: -negativePoints
- Total points never go below 0
```

## Troubleshooting

### "Cannot join room: Username already taken"
- Choose a different username
- Or disconnect the other user first

### "Room does not exist"
- Make sure someone created the room first
- Room names are case-sensitive

### Creator left and room ended
- This is expected behavior
- When the creator disconnects, the room is automatically deleted
- Create a new room to continue

### WebSocket connection fails
- Check that the server is running on port 3000
- Check your firewall settings
- Make sure you're using `ws://` not `wss://` for local development

## Next Steps

- Read [API.md](API.md) for complete API documentation
- Check [README.md](README.md) for architecture details
- Explore the source code in `src/` to understand the implementation
- Build your frontend to consume this API!

## Production Considerations

Before deploying to production, consider:

- Add Redis for persistent room storage
- Implement rate limiting to prevent abuse
- Add authentication/authorization
- Use `wss://` (WebSocket Secure) with SSL/TLS
- Configure CORS properly (don't use `*` in production)
- Add logging and monitoring
- Implement reconnection tokens for better UX
- Add room expiration/cleanup logic
- Consider horizontal scaling with Redis pub/sub

## Need Help?

- Check the message log in the example client for debugging
- Look at the server console for connection logs
- Review the types in `src/types.ts` for message formats
- Read the complete API documentation in `API.md`
