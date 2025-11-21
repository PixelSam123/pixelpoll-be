# Pixel Poll Backend API Documentation

## Overview

The Pixel Poll backend provides HTTP endpoints for room management and WebSocket connections for real-time polling and quiz functionality.

**Base URL**: `http://localhost:3000`

---

## HTTP Endpoints

### 1. Root Endpoint

```
GET /
```

**Description**: Health check endpoint

**Response**:
```
Pixel Poll Backend API
```

---

### 2. Check Room Availability

```
GET /room-availability
```

**Description**: Check if a room name is available for creation

**Query Parameters**:
- `room-name` (required): The desired room name

**Response**:
```json
{
  "canCreate": true
}
```

Or if unavailable:
```json
{
  "canCreate": false,
  "reason": "Room already exists"
}
```

**Example**:
```
GET /room-availability?room-name=myroom
```

---

### 3. Check Room Joinability

```
GET /room-joinability
```

**Description**: Check if a user can join an existing room

**Query Parameters**:
- `room-name` (required): The room name to join
- `username` (required): The desired username

**Response**:
```json
{
  "canJoin": true
}
```

Or if unable to join:
```json
{
  "canJoin": false,
  "reason": "Username already taken in this room"
}
```

**Example**:
```
GET /room-joinability?room-name=myroom&username=john
```

---

## WebSocket Endpoint

### Connection

```
WS /ws/room/:roomName?username=:username
```

**Description**: Connect to a room for real-time communication

**Parameters**:
- `roomName` (path): The room to connect to
- `username` (query): The user's username

**Example**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/room/myroom?username=john');
```

---

## WebSocket Messages

### Server → Client Messages

#### 1. JoinError

Sent when a user cannot join the room

```json
{
  "type": "JoinError",
  "reason": "Username already taken in this room"
}
```

---

#### 2. UserJoined

Broadcast when a user joins the room

```json
{
  "type": "UserJoined",
  "username": "john"
}
```

---

#### 3. UserLeft

Broadcast when a user leaves the room

```json
{
  "type": "UserLeft",
  "username": "john"
}
```

---

#### 4. QuestionStarted

Broadcast when the room creator starts a question

**Poll Example**:
```json
{
  "type": "QuestionStarted",
  "question": {
    "type": "poll",
    "question": "What's your favorite color?",
    "answers": ["Red", "Blue", "Green", "Yellow"]
  }
}
```

**Quiz Example**:
```json
{
  "type": "QuestionStarted",
  "question": {
    "type": "quiz",
    "question": "What is 2 + 2?",
    "answers": ["3", "4", "5", "6"],
    "correctAnswer": 1,
    "startingPoints": 1000,
    "decayRate": 10,
    "negativePoints": 50
  }
}
```

---

#### 5. QuestionEnded

Sent to each user with their personalized results

**Poll Results**:
```json
{
  "type": "QuestionEnded",
  "results": {
    "type": "poll",
    "question": "What's your favorite color?",
    "answers": ["Red", "Blue", "Green", "Yellow"],
    "votes": [5, 12, 8, 3],
    "totalVotes": 28
  }
}
```

**Quiz Results**:
```json
{
  "type": "QuestionEnded",
  "results": {
    "type": "quiz",
    "question": "What is 2 + 2?",
    "answers": ["3", "4", "5", "6"],
    "correctAnswer": 1,
    "votes": [2, 15, 3, 1],
    "userScore": 850,
    "standings": [
      { "username": "alice", "points": 2500 },
      { "username": "bob", "points": 1800 },
      { "username": "john", "points": 850 }
    ]
  }
}
```

---

#### 6. RoomEnded

Broadcast when the room is closed

```json
{
  "type": "RoomEnded",
  "reason": "Room creator ended the room",
  "standings": [
    { "username": "alice", "points": 2500 },
    { "username": "bob", "points": 1800 }
  ]
}
```

---

### Client → Server Messages

#### 1. StartQuestion

**Permissions**: Room creator only

Start a new poll or quiz question

**Poll Example**:
```json
{
  "type": "StartQuestion",
  "question": {
    "type": "poll",
    "question": "What's your favorite color?",
    "answers": ["Red", "Blue", "Green", "Yellow"]
  }
}
```

**Quiz Example**:
```json
{
  "type": "StartQuestion",
  "question": {
    "type": "quiz",
    "question": "What is 2 + 2?",
    "answers": ["3", "4", "5", "6"],
    "correctAnswer": 1,
    "startingPoints": 1000,
    "decayRate": 10,
    "negativePoints": 50
  }
}
```

**Quiz Parameters**:
- `correctAnswer`: Index (0-based) of the correct answer
- `startingPoints`: Maximum points for answering correctly
- `decayRate`: Points deducted per second after question starts
- `negativePoints`: Points deducted for wrong answers

---

#### 2. SubmitAnswer

Submit an answer to the current question

```json
{
  "type": "SubmitAnswer",
  "answer": 1
}
```

**Parameters**:
- `answer`: Index (0-based) of the selected answer

---

#### 3. EndQuestion

**Permissions**: Room creator only

End the current question and calculate results

```json
{
  "type": "EndQuestion"
}
```

---

#### 4. EndRoom

**Permissions**: Room creator only

End the room and disconnect all users

```json
{
  "type": "EndRoom"
}
```

---

## Quiz Scoring System

### Point Calculation

For correct answers:
```
points = max(0, startingPoints - (elapsedSeconds * decayRate))
```

For wrong answers:
```
points deducted = negativePoints
```

### Example

Question settings:
- Starting Points: 1000
- Decay Rate: 10 points/second
- Negative Points: 50

Scenarios:
1. User answers correctly after 5 seconds: `1000 - (5 * 10) = 950 points`
2. User answers correctly after 30 seconds: `1000 - (30 * 10) = 700 points`
3. User answers correctly after 150 seconds: `1000 - (150 * 10) = 0 points` (capped at 0)
4. User answers incorrectly: `-50 points` (user's total can't go below 0)

---

## Room Behavior

### Room Creation
- First user to connect creates the room
- They become the room creator
- Room creator has special permissions

### User Reconnection
- Users can reconnect with the same username
- Their points are preserved
- They can rejoin even if they were disconnected

### Room Deletion
Room is deleted when:
1. Room creator explicitly ends the room (EndRoom message)
2. Room creator disconnects (closes WebSocket)

When room ends:
- All users receive `RoomEnded` message with final standings
- All connections are closed
- All room data is deleted from server

---

## Error Handling

### Error Message Format
```json
{
  "type": "Error",
  "message": "Description of the error"
}
```

### Common Errors
- `"Username and room name are required"` - Missing connection parameters
- `"Username already taken in this room"` - Username conflict
- `"Only room creator can start questions"` - Permission denied
- `"Only room creator can end questions"` - Permission denied
- `"Only room creator can end the room"` - Permission denied

---

## CORS

The API has CORS enabled for all origins (`*`) to allow frontend connections from any domain.

---

## Example Client Implementation

```javascript
// Connect to room
const ws = new WebSocket('ws://localhost:3000/ws/room/myroom?username=john');

// Handle connection open
ws.onopen = () => {
  console.log('Connected to room');
};

// Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'JoinError':
      console.error('Cannot join:', message.reason);
      break;
      
    case 'QuestionStarted':
      console.log('New question:', message.question);
      break;
      
    case 'QuestionEnded':
      console.log('Results:', message.results);
      break;
      
    case 'RoomEnded':
      console.log('Room closed:', message.reason);
      console.log('Final standings:', message.standings);
      break;
  }
};

// Submit an answer
function submitAnswer(answerIndex) {
  ws.send(JSON.stringify({
    type: 'SubmitAnswer',
    answer: answerIndex
  }));
}

// Start a question (creator only)
function startQuestion(question) {
  ws.send(JSON.stringify({
    type: 'StartQuestion',
    question: question
  }));
}

// End question (creator only)
function endQuestion() {
  ws.send(JSON.stringify({
    type: 'EndQuestion'
  }));
}

// End room (creator only)
function endRoom() {
  ws.send(JSON.stringify({
    type: 'EndRoom'
  }));
}
```
