# Planning Poker Database Documentation

## Overview
This planning poker application uses **SQLite** with **Prisma ORM** for data persistence. The database architecture focuses specifically on planning poker functionality with a hybrid approach: active sessions in memory for performance, completed sessions in database for persistence.

## Database Configuration
- **Database**: SQLite 3
- **ORM**: Prisma with TypedSQL support
- **Location**: `prisma/data.db`
- **Migrations**: Located in `prisma/migrations/`

## 🎮 Planning Poker Schema

### Data Architecture Strategy
The application uses a **hybrid data approach**:
- **Active Sessions**: Stored in memory for real-time performance
- **Completed Sessions**: Persisted to database for historical data

### Database Models

#### `PlanningPokerSession` Model
Stores completed planning poker sessions with metadata and ownership.

```sql
CREATE TABLE PlanningPokerSession (
  id VARCHAR PRIMARY KEY,               -- CUID identifier
  sessionCode VARCHAR UNIQUE NOT NULL,  -- 6-character session code (ABC123)
  name VARCHAR NOT NULL,                -- Session name
  description VARCHAR,                  -- Optional session description
  ownerName VARCHAR NOT NULL,           -- Session owner name
  status VARCHAR DEFAULT 'completed',   -- Only completed sessions stored
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  completedAt DATETIME                  -- When session was completed
);
```

**Key Features:**
- Unique 6-character session codes for easy joining
- Only completed sessions are persisted (active sessions in memory)
- Indexed on sessionCode and createdAt for fast queries

#### `PlanningPokerParticipant` Model
Participants who joined planning poker sessions.

```sql
CREATE TABLE PlanningPokerParticipant (
  id VARCHAR PRIMARY KEY,               -- CUID identifier
  name VARCHAR NOT NULL,                -- Participant display name
  sessionId VARCHAR NOT NULL,           -- Foreign key to PlanningPokerSession
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  FOREIGN KEY (sessionId) REFERENCES PlanningPokerSession(id) ON DELETE CASCADE
);
```

**Relationships:**
- Many participants per session
- Cascading delete when session is removed

#### `PlanningPokerStory` Model
Stories that were estimated during planning poker sessions.

```sql
CREATE TABLE PlanningPokerStory (
  id VARCHAR PRIMARY KEY,               -- CUID identifier
  title VARCHAR NOT NULL,               -- Story title
  description VARCHAR,                  -- Story description
  finalEstimate VARCHAR,                -- Final agreed estimate (1, 2, 3, 5, 8, 13, 21, etc)
  status VARCHAR DEFAULT 'completed',   -- Only completed stories stored
  sessionId VARCHAR NOT NULL,           -- Foreign key to PlanningPokerSession
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  FOREIGN KEY (sessionId) REFERENCES PlanningPokerSession(id) ON DELETE CASCADE
);
```

**Key Features:**
- Final estimates using Fibonacci sequence
- Only stories with final estimates are stored
- Linked to session for organization

#### `PlanningPokerVote` Model
Individual votes cast by participants for specific stories.

```sql
CREATE TABLE PlanningPokerVote (
  id VARCHAR PRIMARY KEY,               -- CUID identifier
  value VARCHAR NOT NULL,               -- Vote value: '1', '2', '3', '5', '8', '13', '21', '?', 'coffee'
  storyId VARCHAR NOT NULL,             -- Foreign key to PlanningPokerStory
  participantId VARCHAR NOT NULL,       -- Foreign key to PlanningPokerParticipant
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  UNIQUE(storyId, participantId),       -- One vote per participant per story
  FOREIGN KEY (storyId) REFERENCES PlanningPokerStory(id) ON DELETE CASCADE,
  FOREIGN KEY (participantId) REFERENCES PlanningPokerParticipant(id) ON DELETE CASCADE
);
```

**Key Features:**
- Supports Fibonacci sequence and special values (?, ☕)
- Unique constraint ensures one vote per participant per story
- Cascading deletes maintain data integrity

## 📊 In-Memory Data Structure

### Active Session Model
While sessions are active, they exist in memory for optimal performance:

```typescript
interface PlanningPokerSession {
  sessionId: string                     // Unique session identifier
  sessionCode: string                   // 6-character join code
  name: string                         // Session name
  description?: string                 // Optional description
  ownerName: string                   // Session owner
  status: 'active' | 'paused' | 'completed'
  isLocked: boolean                   // Prevents new participants
  createdAt: Date
  participants: PlanningPokerParticipant[]
  stories: PlanningPokerStory[]       // Current stories being estimated
  currentStory?: string               // Currently active story
  votingOpen: boolean                 // Whether voting is active
  connections: string[]               // WebSocket connection IDs
  votes: Record<string, string>       // participantId -> vote mapping
  votesRevealed: boolean             // Whether votes are visible
}
```

### Participant Model (In-Memory)
```typescript
interface PlanningPokerParticipant {
  id: string                         // Generated participant ID
  name: string                       // Display name
  connectionId?: string              // Connection identifier
  joinedAt: Date                     // When they joined
  isConnected: boolean              // Current connection status
}
```

## 🔄 Data Flow Architecture

### Session Lifecycle

#### 1. Session Creation
```typescript
// Generate unique session code
const sessionCode = generateSessionCode() // -> "ABC123"

// Store in memory for active use
activeSessions.set(sessionCode, {
  sessionId: sessionCode,
  sessionCode,
  name: "Sprint Planning",
  ownerName: "Product Owner",
  status: "active",
  participants: [],
  votes: {},
  votesRevealed: false,
  // ... other properties
})
```

#### 2. Real-Time Operations
All voting and participant management happens in memory:
- Participant joins/leaves
- Vote submissions
- Vote revelations
- Session locking/unlocking

#### 3. Session Completion & Persistence
When owner completes session, data flows from memory to database:

```typescript
// Memory → Database transformation
const dbSession = await prisma.planningPokerSession.create({
  data: {
    sessionCode: session.sessionCode,
    name: session.name,
    description: session.description,
    ownerName: session.ownerName,
    status: 'completed',
    completedAt: new Date()
  }
})

// Create participants with foreign key references
for (const participant of session.participants) {
  const dbParticipant = await prisma.planningPokerParticipant.create({
    data: {
      name: participant.name,
      joinedAt: participant.joinedAt,
      sessionId: dbSession.id
    }
  })
}

// Store stories and votes if any were completed
// Only stories with final estimates are persisted
```

## 📈 Database Indexes & Performance

### Strategic Indexing
```sql
-- Session lookup optimization
CREATE INDEX idx_planningpokersession_sessionCode ON PlanningPokerSession(sessionCode);
CREATE INDEX idx_planningpokersession_createdAt ON PlanningPokerSession(createdAt);

-- Participant queries
CREATE INDEX idx_planningpokerparticipant_sessionId ON PlanningPokerParticipant(sessionId);

-- Story and vote lookups
CREATE INDEX idx_planningpokerstory_sessionId ON PlanningPokerStory(sessionId);
CREATE INDEX idx_planningpokervote_storyId ON PlanningPokerVote(storyId);
```

### Performance Optimizations
- **Session Code Lookup**: O(1) hash table lookup in memory
- **Participant Management**: In-memory arrays for instant updates
- **Vote Tracking**: Hash map for O(1) vote access
- **Database Writes**: Only on session completion

## 🔧 Connection Management

### SSE Connection Storage
```typescript
// Global map for SSE connections
const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// Connection lifecycle
sseConnections.set(sessionCode, new Set())  // Session starts
sseConnections.get(sessionCode)?.add(controller)  // Participant connects
sseConnections.get(sessionCode)?.delete(controller)  // Participant disconnects
sseConnections.delete(sessionCode)  // Session ends
```

### Memory Management
- **Session Cleanup**: Inactive sessions removed after 24 hours
- **Connection Cleanup**: Dead SSE connections automatically removed
- **Garbage Collection**: References cleared when sessions complete

## 🗃️ Data Persistence Strategy

### What Gets Stored
✅ **Completed Sessions**
- Session metadata (name, description, owner)
- Participant list with join times
- Stories with final estimates
- Individual votes for each story

❌ **Not Stored**
- Active session state
- Temporary votes during voting rounds
- SSE connection information
- Real-time session events

### Why This Approach
1. **Performance**: In-memory operations are sub-millisecond
2. **Scalability**: Reduced database load during active sessions
3. **Simplicity**: Clear separation between active and historical data
4. **Cost**: Lower storage costs by only persisting completed data

## 📋 Migration History

### Planning Poker Migration (20250723161822_add_planning_poker_models)
Added complete planning poker functionality:
- Created session management tables
- Established participant and voting models
- Set up proper relationships and constraints
- Added performance indexes

```sql
-- Key tables created:
- PlanningPokerSession
- PlanningPokerParticipant  
- PlanningPokerStory
- PlanningPokerVote

-- Key constraints:
- Unique session codes
- One vote per participant per story
- Cascading deletes for data integrity
```

## 🔒 Data Integrity & Security

### Constraints & Validation
- **Unique Session Codes**: Prevents collision in join process
- **Cascading Deletes**: Maintains referential integrity
- **Vote Uniqueness**: One vote per participant per story
- **Required Fields**: Essential data always present

### Security Features
- **Session Code Generation**: Cryptographically secure random codes
- **Owner Validation**: Only session owners can complete sessions
- **Input Sanitization**: All user inputs validated and sanitized
- **Connection Management**: Proper cleanup prevents memory leaks

## 🚀 Production Considerations

### Backup Strategy
- **Database Location**: `prisma/data.db` in production
- **Migration Safety**: All schema changes version controlled
- **Data Export**: Completed sessions can be exported for analysis

### Monitoring
- **Session Count**: Track active sessions in memory
- **Connection Count**: Monitor SSE connections per session
- **Memory Usage**: Track memory consumption of active sessions
- **Database Growth**: Monitor size of completed session data

This database architecture provides optimal performance for real-time planning poker sessions while maintaining comprehensive historical data for completed sessions.