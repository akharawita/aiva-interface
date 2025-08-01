# Planning Poker Database Data Flow

## Architecture Overview

```
[Client Apps] <--> [Server Memory] <--> [SQLite DB]
(Browsers/WSs)     (Active Data)       (Persistent)
   Real-time         Fast Access       Long-term Storage
```

## Data Flow Scenarios

### 1. Session Creation Flow

```
User Input (Name, Session Name, Description)
           |
    Generate Session Code
           |
    Store in Memory Map:
    {
      sessionId: "ABC123",
      name: "Sprint Planning",
      ownerName: "Alice",
      status: "active", 
      isLocked: false,
      participants: [],
      stories: [],
      createdAt: timestamp
    }
           |
    Return Session Code to User
```

**Memory Storage:**
- Immediate availability for real-time operations
- Session accessible via unique code

### 2. Participant Joining Flow

```
User Input (Name + Session Code)
           |
    Check if Session Exists in Memory
           |
    Check if Room is Locked
           |
         [IF UNLOCKED]
           |
    Add Participant to Memory:
    participants: [
      {
        id: "participant_1",
        name: "Bob",
        connectionId: "ws_123",
        joinedAt: timestamp
      }
    ]
           |
    Broadcast to All Participants:
    "Bob joined the session"
           |
    Send Current Session State to New Participant
```

**Error Cases:**
- Session not found -> Error message
- Room locked -> "Room is locked" message
- Duplicate connection -> Handle reconnection

### 3. Story Management Flow

```
Owner Adds Story
           |
    Update Memory Map:
    stories: [
      {
        id: "story_1",
        title: "User Login Feature",
        description: "As a user...",
        status: "pending",
        votes: {},
        finalEstimate: null
      }
    ]
           |
    Broadcast to All Participants:
    "New story added: User Login Feature"
```

### 4. Voting Flow

```
Participant Submits Vote
           |
    Update Memory Map:
    stories[0].votes = {
      "participant_1": "5",
      "participant_2": "hidden", // pending
      "participant_3": "hidden"
    }
           |
    Broadcast Vote Status (without revealing):
    "Bob has voted (2/3 votes in)"
           |
    [ALL VOTES IN OR OWNER REVEALS]
           |
    Broadcast All Votes:
    {
      "Bob": "5",
      "Charlie": "8", 
      "Dave": "5"
    }
```

### 5. Room Locking Flow

```
Owner Toggles Lock
           |
    Update Memory Map:
    isLocked: true
           |
    Broadcast to All Participants:
    "Room is now locked"
           |
    [NEW JOIN ATTEMPTS]
           |
    Check Lock Status -> Block with Message
```

### 6. Session Completion Flow

```
Owner Marks Session Complete
           |
    Migrate Memory Data to SQLite:
    
    INSERT INTO PlanningPokerSession:
    - id, name, ownerName, status: "completed"
    - createdAt, completedAt
    
    INSERT INTO PlanningPokerParticipant:
    - For each participant in memory
    
    INSERT INTO PlanningPokerStory:
    - For each story with final estimates
    
    INSERT INTO PlanningPokerVote:
    - For each final vote
           |
    Remove Session from Memory
           |
    Notify Participants: "Session completed"
```

## Memory Data Structure

### Active Session Map
```javascript
const activeSessions = new Map();

// Session Structure
{
  "ABC123": {
    // Basic Info
    sessionId: "ABC123",
    name: "Sprint 15 Planning",
    description: "Estimate user stories for sprint 15",
    ownerName: "Alice",
    status: "active", // active, paused, completed
    isLocked: false,
    createdAt: "2024-01-15T10:00:00Z",
    
    // Participants
    participants: [
      {
        id: "participant_1",
        name: "Bob",
        connectionId: "ws_connection_123",
        joinedAt: "2024-01-15T10:05:00Z",
        isConnected: true
      }
    ],
    
    // Stories
    stories: [
      {
        id: "story_1",
        title: "User Login",
        description: "Implement OAuth login",
        status: "voting", // pending, voting, completed
        votes: {
          "participant_1": "5",
          "participant_2": "hidden"
        },
        finalEstimate: null,
        createdAt: "2024-01-15T10:10:00Z"
      }
    ],
    
    // Current State
    currentStory: "story_1",
    votingOpen: true,
    
    // WebSocket Connections
    connections: ["ws_123", "ws_124", "ws_125"]
  }
}
```

## SQLite Schema & Data Flow

### Database Models

```sql
-- Completed Sessions Only
CREATE TABLE PlanningPokerSession (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    ownerName TEXT NOT NULL,
    status TEXT NOT NULL, -- completed
    createdAt DATETIME NOT NULL,
    completedAt DATETIME NOT NULL
);

CREATE TABLE PlanningPokerStory (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    finalEstimate TEXT, -- final agreed estimate
    status TEXT NOT NULL,
    createdAt DATETIME NOT NULL,
    FOREIGN KEY (sessionId) REFERENCES PlanningPokerSession(id)
);

CREATE TABLE PlanningPokerParticipant (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    name TEXT NOT NULL,
    joinedAt DATETIME NOT NULL,
    FOREIGN KEY (sessionId) REFERENCES PlanningPokerSession(id)
);

CREATE TABLE PlanningPokerVote (
    id TEXT PRIMARY KEY,
    storyId TEXT NOT NULL,
    participantId TEXT NOT NULL,
    value TEXT NOT NULL, -- final vote value
    createdAt DATETIME NOT NULL,
    FOREIGN KEY (storyId) REFERENCES PlanningPokerStory(id),
    FOREIGN KEY (participantId) REFERENCES PlanningPokerParticipant(id)
);
```

## Synchronization Points

### Memory -> SQLite Triggers

1. **Session Completion**
   ```
   Session marked complete -> Full data migration
   ```

2. **Periodic Backup** (Optional)
   ```
   Every 30 minutes -> Save session snapshots
   ```

3. **Graceful Shutdown**
   ```
   Server shutdown -> Migrate all active sessions
   ```

4. **Story Finalization**
   ```
   Final estimate set -> Save story + votes to SQLite
   ```

## Error Handling & Recovery

### Connection Issues
```
WebSocket Disconnect
        |
Mark participant as disconnected
        |
Keep participant in memory (30 min timeout)
        |
[Reconnection] -> Restore session state
[Timeout] -> Remove participant
```

### Memory Issues
```
Memory Full/Error
        |
Emergency backup to SQLite
        |
Graceful session termination
        |
Notify participants of technical issue
```

### Data Corruption
```
Invalid Vote/Story Data
        |
Log error + continue with valid data
        |
Notify session owner of issue
        |
Maintain session integrity
```

## Performance Considerations

### Memory Usage
- **Per Session**: ~50KB baseline + ~5KB per participant
- **Target Load**: 100 concurrent sessions = ~5MB memory
- **Cleanup**: Remove inactive sessions after 24 hours

### Database Load
- **Writes**: Only on session completion (minimal)
- **Reads**: Historical data queries (infrequent)
- **Indexes**: sessionId, createdAt for efficient queries

### Real-time Performance
- **Vote Updates**: <50ms response time
- **Broadcast**: All participants notified simultaneously
- **Scaling**: Handle 500+ concurrent participants across sessions

## Monitoring Points

1. **Active Sessions Count**
2. **Memory Usage per Session**
3. **WebSocket Connection Count**
4. **Session Completion Rate**
5. **Average Session Duration**
6. **Participant Join/Leave Frequency**