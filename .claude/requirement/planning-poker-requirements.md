# Planning Poker Agile Feature Requirements

## Overview
Planning Poker is an agile estimation technique where team members estimate the effort or relative size of development goals by playing numbered cards face-down to the table, instead of speaking them aloud. This feature will enable teams to conduct planning poker sessions within the application.

## Core Features

### 1. Session Management
- **Create Session**: Users can create new planning poker sessions by providing their name, session name, and description
- **Session Code**: Each session gets a unique shareable code (e.g., ABC123) for easy joining
- **Session Status**: Sessions can be in states: Active, Paused, Completed
- **Session Owner**: The creator (identified by name) has admin privileges (start/stop voting, reveal cards, etc.)
- **Room Locking**: Session owners can lock/unlock the room to control both participant joining and voting permissions
- **Anonymous Participants**: Users join sessions by entering their name and session code - no account required

### 2. Story Management
- **Add Stories**: Session owners can add user stories/tasks to estimate
- **Story Details**: Each story has title, description, and acceptance criteria
- **Notion Integration**: Stories can reference Notion pages/cards for detailed context
- **Story Status**: Stories can be: Pending, Voting, Completed
- **Story Ordering**: Stories can be reordered within a session
- **External References**: Display Notion page previews and links within story cards

### 3. Voting System
- **Card Values**: Standard Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) plus special cards (?, ☕)
- **Secret Voting**: Votes are hidden until all participants vote or session owner reveals
- **Vote Reveal**: Show all votes simultaneously to avoid anchoring bias with average calculation
- **Re-voting**: Allow revoting if consensus isn't reached via vote reset
- **Lock Control**: Room lock/unlock controls both joining AND voting permissions
- **Voting States**: 
  - Unlocked: All participants can vote freely
  - Locked: Voting disabled for all participants (discussion/review state)
- **Visual Feedback**: Current user highlighted with rainbow gradient border
- **Vote Display**: Unified participant view showing all votes when revealed
- **AI Review**: AI-powered analysis of voting results providing insights and recommendations

### 4. User Interface
- **Poker Cards**: Visual card interface for selecting estimates (responsive sizing)
- **Participant Cards**: Unified grid showing all participants with vote status
- **Current User Highlighting**: Rainbow gradient border for current user's card
- **Vote Count Display**: Real-time vote count displayed next to "All Participants" header
- **Average Calculation**: Automatic average display when votes revealed (numeric votes only)
- **Responsive Design**: Adaptive grid layout (2-8 columns based on screen size)
- **Session Management**: Functional lock/unlock and end session controls
- **Single Column Layout**: Full-width sections for optimal space usage
- **AI Review Panel**: Expandable section showing AI analysis with progressive loading
- **Notion Integration**: Story cards display Notion page previews with lazy loading and skeleton states
- **External References**: Quick access to detailed story information from Notion workspace
- **Client-Side Performance**: AI and Notion features render client-side for responsive experience
- **Progressive Enhancement**: Core features work immediately, enhanced features load asynchronously

### 5. AI-Powered Analysis
- **Vote Pattern Analysis**: AI analyzes voting spread and identifies consensus levels
- **Estimation Insights**: Provides recommendations based on voting patterns (high variance, outliers, etc.)
- **Story Complexity Assessment**: Suggests if story needs breakdown based on vote distribution
- **Team Alignment Review**: Identifies when team has strong consensus vs. significant disagreement
- **Historical Comparisons**: Compares current votes with similar stories from past sessions
- **Recommendation Engine**: Suggests next steps (re-vote, discuss, accept estimate, split story)
- **Confidence Score**: AI confidence level in the team's estimation accuracy

### 6. Notion Integration
- **Page Linking**: Stories can reference specific Notion pages via URL
- **Client-Side Previews**: Notion previews render client-side with skeleton loading states
- **Content Preview**: Display Notion page title, excerpt, and thumbnail within story cards
- **Lazy Loading**: Notion metadata loaded only when story cards become visible
- **Automatic Sync**: Fetch and cache Notion page metadata for quick access
- **Deep Linking**: Direct links to Notion pages open in new tabs
- **Rich Context**: AI analysis can consider Notion page content for better insights
- **Team Workspace**: Support for shared Notion workspaces and page permissions
- **Progressive Loading**: Core story content loads immediately, Notion previews enhance progressively
- **Offline Graceful**: Story estimation works even when Notion API unavailable

### 7. Real-time Features
- **Live Updates**: Participants see updates in real-time (new stories, vote status)
- **Notifications**: Alert when voting starts, when all votes are in, etc.
- **Presence Indicators**: Show which participants are currently active

## User Roles

### Session Owner (Anonymous)
- Create and manage sessions by providing their name
- Add/edit/remove stories
- Start and stop voting rounds
- Reveal votes with automatic average calculation
- Reset votes to allow re-voting
- Share session link/code with participants
- Lock/unlock room to control both participant access AND voting permissions
- End session permanently (saves to database and removes from memory)
- View all participants in responsive grid with current user highlighted
- Access AI analysis and recommendations after votes are revealed
- Use AI insights to guide discussion and decide on final estimates
- Link stories to Notion pages for detailed context and requirements
- Preview Notion page content directly within story cards

### Participant (Anonymous)
- Join sessions by entering their name and session code/link (when unlocked)
- Vote on stories (when session is unlocked)
- View voting results with average calculation when revealed
- See themselves highlighted with rainbow border in participant grid
- View real-time vote count and participant status
- View AI analysis and insights about the voting results
- Access linked Notion pages for detailed story context
- View Notion page previews within story cards
- Participate in discussions (future: chat feature)

## Technical Requirements

### Database Architecture: Hybrid Approach

#### **In-Memory Storage (Node.js Map or Redis)**
**Purpose**: Fast real-time operations for active sessions

**Stored Data:**
- Active sessions currently in use
- Current participants and their connection status  
- Pending votes (before reveal)
- Real-time session state
- WebSocket connections
- Current story being voted on
- Room lock status (locked/unlocked) affecting both joining and voting

**Benefits:**
- Sub-second response times for voting
- Instant real-time updates to all participants
- No database bottlenecks during active voting
- Perfect for temporary, ephemeral data

#### **SQLite Persistence**
**Purpose**: Permanent storage for completed sessions and historical data

**Stored Data:**
- Completed sessions (for history)
- Final story estimates
- Session metadata (name, creation time, owner)
- Archived participant lists
- Export/reporting data

**Database Models:**
- **PlanningPokerSession**: Session details, owner name, status, unique session code
- **PlanningPokerStory**: Story details, final estimate, status, optional Notion page URL
- **PlanningPokerParticipant**: Anonymous participant with name and session relationship
- **PlanningPokerVote**: Final votes with values after session completion
- **NotionPageCache**: Cached Notion page metadata (title, excerpt, thumbnail, expiry)

#### **Data Flow:**

1. **Session Creation**: Store in memory + generate session code
2. **Active Session**: All real-time data lives in memory only
3. **Session Completion**: Memory data migrated to SQLite, removed from memory
4. **Recovery**: Active sessions lost on restart (users can rejoin), completed data preserved

#### **Synchronization Triggers:**
- Session marked as "completed"
- Stories receive final estimates
- Periodic backup (every 30 minutes)
- Server shutdown (graceful cleanup)

### API Endpoints
- Session CRUD operations (memory + SQLite)
- Story CRUD operations (memory during active, SQLite when complete)
- Real-time voting operations (memory only)
- WebSocket connections for real-time updates
- Session history and reporting (SQLite only)
- **Client-Side AI Endpoints**:
  - `POST /api/ai/analyze-votes` - Streaming AI analysis of vote patterns
  - `GET /api/ai/cache/{hash}` - Retrieve cached AI analysis results
- **Client-Side Notion Endpoints**:
  - `GET /api/notion/page/{pageId}/metadata` - Fetch page title, excerpt, thumbnail
  - `POST /api/notion/validate-url` - Validate and parse Notion URLs
  - `GET /api/notion/cache/{pageId}` - Retrieve cached page metadata

### Session Access & Authorization
- No user authentication required - anonymous access
- Session owners identified by session creation and owner name
- Participants join by providing name and session code
- Session codes prevent unauthorized access to sessions
- Participants can only vote on stories in sessions they've joined
- Active session data lost on server restart (acceptable trade-off for performance)

### AI Integration
- **Client-Side Rendering**: AI analysis components render on client with loading states
- **Claude API Integration**: Use Anthropic's Claude API for intelligent analysis
- **Async Processing**: AI analysis triggered client-side after vote reveal
- **Real-time Updates**: AI insights appear progressively as analysis completes
- **Vote Analysis**: Process voting data to identify patterns and provide insights
- **Context Awareness**: AI considers story content, vote distribution, and team dynamics
- **Response Caching**: Cache AI responses client-side and server-side for performance
- **Fallback Handling**: Graceful degradation when AI service is unavailable
- **Progressive Enhancement**: Core voting works without AI, enhanced with AI insights

### Notion API Integration
- **Client-Side Rendering**: Notion previews render client-side with skeleton loading states
- **Lazy Loading**: Notion page metadata loaded asynchronously when story cards are visible
- **OAuth Integration**: Secure authentication with Notion workspaces
- **Page Access**: Read access to linked Notion pages via API
- **Progressive Loading**: Story cards render immediately, Notion previews load progressively
- **Metadata Caching**: Cache page titles, excerpts, and thumbnails client-side and server-side
- **Rate Limiting**: Respect Notion API rate limits with intelligent caching
- **Permission Handling**: Handle private pages and workspace access gracefully
- **Content Extraction**: Extract relevant story details from Notion page structure
- **Offline Support**: Show cached Notion previews when offline, graceful fallback to URLs

## User Stories

### As a Scrum Master, I want to:
- Create planning poker sessions by entering my name
- Generate a shareable session code/link for my team
- Add user stories that need estimation
- Start and manage voting rounds
- See all team votes after everyone has voted
- Set the final agreed estimate for each story
- Lock the room once all team members have joined to prevent interruptions
- Get AI-powered insights about voting patterns and team consensus
- Use AI recommendations to decide whether to re-vote or accept estimates
- Understand when story complexity suggests breaking down into smaller tasks
- Link planning poker stories to detailed Notion pages for full context
- Import story details directly from Notion workspace to save time

### As a Team Member, I want to:
- Join planning poker sessions by entering my name and session code
- Vote on user stories using standard poker cards
- See when everyone has voted (without seeing the actual votes)
- View the results after votes are revealed with AI analysis
- Understand AI insights about why estimates vary and what it means
- Access full story details and requirements via linked Notion pages
- See story context without leaving the planning poker interface
- Participate in multiple sessions with the same or different names

### As a Product Owner, I want to:
- Quickly join estimation sessions without creating accounts
- View session results in real-time
- See which stories took longest to reach consensus
- Get AI insights about story complexity and estimation accuracy
- Use AI recommendations to improve story writing and acceptance criteria
- Keep detailed story documentation in Notion while using planning poker for estimation
- See how estimation results relate to original story specifications
- Access session results via session code for future reference

## Acceptance Criteria

### Session Creation
- User can create a session by providing their name, session name, and optional description
- Session generates a unique shareable code/link automatically
- Session creator becomes the owner with admin privileges
- No account creation or email verification required
- Sessions are created in unlocked state by default (participants can join freely)

### Voting Process
- Participants can select from standard Fibonacci cards (1,2,3,5,8,13,21,?,☕)
- Votes remain hidden until all participants vote or owner reveals
- Participants can change their vote before reveal
- After reveal, participants can discuss and revote if needed

### Story Management
- Session owner can add stories with title and description
- Stories can be edited before voting begins
- Final estimates are permanently recorded
- Stories can be marked as complete

### Session Joining
- Participants can join by entering session code and their name
- Duplicate names in the same session are allowed but discouraged
- No registration or authentication required
- Participants can rejoin sessions using the same name if disconnected
- Join attempts are blocked when room is locked (with appropriate error message)

### Room Locking
- Session owners can toggle room lock status at any time
- Locked rooms prevent new participants from joining AND disable voting for all participants
- Existing participants remain in the session when room is locked but cannot vote
- Clear visual indicator shows lock status to all participants  
- Unlock allows new participants to join and enables voting for all participants
- Lock state useful for discussion/review phases between voting rounds

### AI Analysis
- AI analysis is automatically triggered client-side when votes are revealed
- Analysis panel shows skeleton loading state while AI processes data
- AI insights appear progressively as analysis completes (streaming response)
- Analysis considers vote distribution, story content, and historical patterns
- AI provides clear, actionable recommendations in plain language
- Analysis includes confidence scores and reasoning for recommendations
- Results are displayed in an expandable panel below voting results
- AI recommendations include: accept estimate, re-vote, split story, discuss further
- Analysis works offline gracefully when AI service unavailable (shows cached results)
- AI responses are cached client-side and server-side for similar vote patterns
- Loading states and error boundaries handle AI service failures gracefully

### Notion Integration
- Session owners can add Notion page URLs when creating or editing stories
- Valid Notion URLs are automatically detected and processed client-side
- Story cards render immediately with skeleton placeholders for Notion previews
- Notion page metadata loads asynchronously using intersection observer (lazy loading)
- Story cards display Notion page title, excerpt, and thumbnail preview when loaded
- Clicking Notion links opens pages in new tabs/windows
- Notion page metadata is cached client-side (localStorage) and server-side for 24 hours
- Integration works gracefully when Notion API is unavailable (shows URL only)
- Private Notion pages handle permission errors appropriately
- Loading states show shimmer effects while Notion data loads
- AI analysis can incorporate Notion page content when available
- Story creation form includes optional Notion URL field with real-time validation

### Real-time Updates
- All participants see live updates when:
  - New participants join (showing their names)
  - Room lock status changes (locked/unlocked indicator)
  - Participants are removed by session owner
  - Voting starts for a story
  - Participants submit votes (without revealing values)
  - Votes are revealed
  - Final estimates are set

## Technical Implementation Notes

### Memory Management
- Use Node.js Map for simplicity (recommended) or Redis for distributed deployments
- Implement session cleanup to prevent memory leaks
- Set session timeout (e.g., 24 hours of inactivity)

### Real-time Communication
- WebSocket connections for instant updates
- Server-Sent Events as fallback
- Handle connection drops and reconnections gracefully

### Performance Considerations
- Expected load: 50+ concurrent sessions, 500+ active participants
- Memory usage: ~1MB per active session with 10 participants
- Database writes only on session completion (minimal load)
- **Client-Side Performance**:
  - AI analysis rendered client-side with streaming responses (200-500ms first response)
  - Notion previews lazy-loaded using intersection observer (reduces initial page load)
  - Client-side caching reduces API calls by 70-80% for repeated operations
  - Progressive enhancement ensures core voting works without external dependencies
  - Skeleton loading states provide immediate visual feedback (perceived performance)
  - Error boundaries prevent AI/Notion failures from breaking core functionality

### Error Handling
- Graceful degradation if memory storage fails
- Session recovery prompts for disconnected users
- Automatic cleanup of stale sessions

## Future Enhancements
- **Advanced AI Features**: 
  - Story complexity prediction before voting
  - Personalized voting suggestions based on individual patterns
  - Cross-session learning and historical team performance analysis
  - Natural language story analysis for better complexity assessment
- **Enhanced Notion Integration**:
  - Bulk import stories from Notion databases
  - Two-way sync of estimates back to Notion pages
  - Story template creation from Notion page structures
  - Integration with Notion's task management and project tracking
- Integration with popular project management tools (Jira, Trello, etc.)
- Chat/discussion feature during sessions
- Session analytics and reporting dashboard
- Custom card sets beyond Fibonacci
- Time tracking for voting rounds
- Export session results to CSV/PDF with AI insights
- Redis cluster support for high availability
- Session recording and playback
- Mobile app support
- Integration with video conferencing tools