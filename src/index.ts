import { Elysia } from "elysia";
import { RoomManager } from "./roomManager";
import type {
  ClientMessage,
  WSMessage,
  QuestionResults,
  Standing,
} from "./types";

const roomManager = new RoomManager();

// Store WebSocket connections per room
const roomConnections = new Map<string, Map<string, any>>();

const app = new Elysia()
  // CORS headers for frontend communication
  .onRequest(({ set }) => {
    set.headers["Access-Control-Allow-Origin"] = "*";
    set.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type";
  })

  // Root endpoint
  .get("/", () => "Pixel Poll Backend API")

  // Check if room name is available for creation
  .get("/room-availability", ({ query, set }) => {
    const roomName = query["room-name"];

    if (!roomName) {
      set.status = 400;
      return { canCreate: false, reason: "Room name is required" };
    }

    return roomManager.canCreateRoom(roomName);
  })

  // Check if user can join a room
  .get("/room-joinability", ({ query, set }) => {
    const roomName = query["room-name"];
    const username = query["username"];

    if (!roomName || !username) {
      set.status = 400;
      return { canJoin: false, reason: "Room name and username are required" };
    }

    return roomManager.canJoinRoom(roomName, username);
  })

  // WebSocket endpoint for room communication
  .ws("/ws/room/:roomName", {
    query: { username: undefined as string | undefined },

    open(ws) {
      const roomName = ws.data.params.roomName;
      const username = ws.data.query.username;

      if (!username || !roomName) {
        ws.send(
          JSON.stringify({
            type: "JoinError",
            reason: "Username and room name are required",
          }),
        );
        ws.close();
        return;
      }

      // Check if user can join
      const { canJoin, reason } = roomManager.canJoinRoom(roomName, username);

      if (!canJoin) {
        ws.send(
          JSON.stringify({
            type: "JoinError",
            reason: reason || "Cannot join room",
          }),
        );
        ws.close();
        return;
      }

      // Join the room
      const { isCreator } = roomManager.joinRoom(roomName, username);

      // Store WebSocket connection
      if (!roomConnections.has(roomName)) {
        roomConnections.set(roomName, new Map());
      }
      roomConnections.get(roomName)!.set(username, ws);

      // Send user info to the connected user
      const connectedUsers = roomManager.getConnectedUsers(roomName);
      ws.send(
        JSON.stringify({
          type: "UserInfo",
          username,
          isCreator,
          currentUsers: connectedUsers,
        }),
      );

      // Notify others that user joined
      broadcastToRoom(
        roomName,
        {
          type: "UserJoined",
          username,
        },
        username,
      );

      console.log(
        `User ${username} joined room ${roomName} (creator: ${isCreator})`,
      );
    },

    message(ws, message) {
      const roomName = ws.data.params.roomName;
      const username = ws.data.query.username;

      if (!username || !roomName) return;

      try {
        const clientMessage: ClientMessage = JSON.parse(message as string);

        switch (clientMessage.type) {
          case "StartQuestion": {
            // Only room creator can start questions
            if (!roomManager.isRoomCreator(roomName, username)) {
              ws.send(
                JSON.stringify({
                  type: "Error",
                  message: "Only room creator can start questions",
                }),
              );
              return;
            }

            const success = roomManager.startQuestion(
              roomName,
              clientMessage.question,
            );

            if (success) {
              // Broadcast question to all users in the room
              broadcastToRoom(roomName, {
                type: "QuestionStarted",
                question: clientMessage.question,
              });
              console.log(`Question started in room ${roomName}`);
            }
            break;
          }

          case "SubmitAnswer": {
            const success = roomManager.submitAnswer(
              roomName,
              username,
              clientMessage.answer,
            );

            if (success) {
              console.log(
                `User ${username} submitted answer in room ${roomName}`,
              );
            }
            break;
          }

          case "EndQuestion": {
            // Only room creator can end questions
            if (!roomManager.isRoomCreator(roomName, username)) {
              ws.send(
                JSON.stringify({
                  type: "Error",
                  message: "Only room creator can end questions",
                }),
              );
              return;
            }

            // End question and get results for all users
            const allResults = roomManager.endQuestion(roomName);
            if (!allResults) return;

            // Send personalized results to each user
            allResults.forEach((results, username) => {
              const userWs = roomConnections.get(roomName)?.get(username);
              if (userWs) {
                userWs.send(
                  JSON.stringify({
                    type: "QuestionEnded",
                    results,
                  }),
                );
              }
            });

            console.log(`Question ended in room ${roomName}`);
            break;
          }

          case "EndRoom": {
            // Only room creator can end the room
            if (!roomManager.isRoomCreator(roomName, username)) {
              ws.send(
                JSON.stringify({
                  type: "Error",
                  message: "Only room creator can end the room",
                }),
              );
              return;
            }

            // Get standings before ending room
            const standings = roomManager.getStandings(roomName);

            // Broadcast room ended message with standings
            broadcastToRoom(roomName, {
              type: "RoomEnded",
              reason: "Room creator ended the room",
              standings,
            } as any);

            // Close all connections
            const connections = roomConnections.get(roomName);
            if (connections) {
              connections.forEach((userWs) => {
                userWs.close();
              });
              roomConnections.delete(roomName);
            }

            // Delete room data
            roomManager.endRoom(roomName);

            console.log(`Room ${roomName} ended by creator`);
            break;
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },

    close(ws) {
      const roomName = ws.data.params.roomName;
      const username = ws.data.query.username;

      if (!username || !roomName) return;

      // Remove WebSocket connection
      const connections = roomConnections.get(roomName);
      if (connections) {
        connections.delete(username);

        if (connections.size === 0) {
          roomConnections.delete(roomName);
        }
      }

      // Mark user as disconnected
      roomManager.disconnectUser(roomName, username);

      // Check if this was the room creator leaving
      const room = roomManager.getRoom(roomName);
      if (room) {
        const user = Array.from(room.users.values()).find(
          (u) => u.username === username,
        );

        if (user && user.isCreator) {
          // Room creator left - end the room
          const standings = roomManager.getStandings(roomName);

          broadcastToRoom(roomName, {
            type: "RoomEnded",
            reason: "Room creator left the room",
            standings,
          } as any);

          // Close all remaining connections
          if (connections) {
            connections.forEach((userWs) => {
              userWs.close();
            });
          }
          roomConnections.delete(roomName);

          roomManager.endRoom(roomName);
          console.log(`Room ${roomName} ended (creator left)`);
        } else {
          // Regular user left
          broadcastToRoom(
            roomName,
            {
              type: "UserLeft",
              username,
            },
            username,
          );
          console.log(`User ${username} left room ${roomName}`);
        }
      }
    },
  })

  .listen(3000);

// Helper function to broadcast message to all users in a room
function broadcastToRoom(
  roomName: string,
  message: WSMessage | any,
  excludeUsername?: string,
) {
  const connections = roomConnections.get(roomName);
  if (!connections) return;

  const messageStr = JSON.stringify(message);

  connections.forEach((ws, username) => {
    if (excludeUsername && username === excludeUsername) return;
    ws.send(messageStr);
  });
}

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
