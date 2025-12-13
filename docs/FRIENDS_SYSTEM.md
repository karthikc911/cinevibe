# Friends System Documentation

## Overview

The CineMate Friends System allows users to connect with each other, send friend requests, share movie recommendations, and maintain threaded conversations about movies.

## Features

### 1. **User Search**
- Search for users by name or email
- Real-time search with 500ms debounce
- Shows friendship status for each user:
  - `Friends` - Already connected
  - `Pending` - Request sent/received
  - `Add Friend` - Can send request

### 2. **Friend Requests**
- Send friend requests to any user
- Accept or reject incoming requests
- View sent requests (pending status)
- Cancel sent requests
- Automatic updates to friends list when accepting

### 3. **Friends List**
- View all accepted friends
- See friend's language and genre preferences
- Remove friends
- Quick access to recommend movies

### 4. **Movie Recommendations**
- Send movie recommendations to friends
- Include personal messages with recommendations
- Track if recommendation has been seen
- View sent and received recommendations separately

### 5. **Threaded Comments**
- Comment on movie recommendations
- Reply to comments (nested replies)
- Real-time comment threads
- Automatic "seen" marking when receiver comments

## Database Schema

### Friendship Model
```prisma
model Friendship {
  id         String   // Unique friendship ID
  requesterId String  // User who sent the request
  addresseeId String  // User who received the request
  status     String   // "pending", "accepted", "rejected", "blocked"
  createdAt  DateTime
  updatedAt  DateTime
}
```

### FriendMovieRecommendation Model
```prisma
model FriendMovieRecommendation {
  id          String   // Unique recommendation ID
  senderId    String   // User who recommended
  receiverId  String   // User who received
  movieId     Int      // Movie ID (from TMDB or DB)
  movieTitle  String   // Movie title
  movieYear   Int?     // Movie year
  message     String?  // Optional personal message
  seen        Boolean  // Has receiver seen it?
  createdAt   DateTime
  comments    RecommendationComment[]
}
```

### RecommendationComment Model
```prisma
model RecommendationComment {
  id              String   // Unique comment ID
  recommendationId String  // Parent recommendation
  userId          String   // User who commented
  parentId        String?  // Parent comment (for replies)
  content         String   // Comment text
  createdAt       DateTime
  updatedAt       DateTime
  replies         RecommendationComment[] // Nested replies
}
```

## API Endpoints

### Search Users
```
GET /api/friends/search?q={searchQuery}
Response: { users: User[] }
```

### Friend Requests

**Get Requests**
```
GET /api/friends/requests
Response: { 
  received: FriendRequest[], 
  sent: FriendRequest[] 
}
```

**Send Request**
```
POST /api/friends/requests
Body: { userId: string }
Response: { message, request }
```

**Accept/Reject Request**
```
PATCH /api/friends/requests/{id}
Body: { action: "accept" | "reject" }
Response: { message, friendship }
```

**Cancel Request**
```
DELETE /api/friends/requests/{id}
Response: { message }
```

### Friends

**List Friends**
```
GET /api/friends
Response: { friends: Friend[] }
```

**Remove Friend**
```
DELETE /api/friends
Body: { friendshipId: string }
Response: { message }
```

### Movie Recommendations

**List Recommendations**
```
GET /api/friends/recommendations
Response: { 
  received: MovieRecommendation[], 
  sent: MovieRecommendation[] 
}
```

**Send Recommendation**
```
POST /api/friends/recommendations
Body: { 
  friendId: string, 
  movieId: number, 
  movieTitle: string, 
  movieYear: number | null,
  message: string | null 
}
Response: { message, recommendation }
```

### Comments

**Get Comments**
```
GET /api/friends/recommendations/{id}/comments
Response: { comments: Comment[] }
```

**Add Comment/Reply**
```
POST /api/friends/recommendations/{id}/comments
Body: { 
  content: string, 
  parentId: string | null 
}
Response: { message, comment }
```

## UI Features

### Search Bar
- Located at the top of the Friends page
- Real-time search with loading indicator
- Shows user avatar, name, email, and action button
- Different badges for different friendship statuses

### Three Main Tabs

#### 1. Friends Tab
- Grid layout of friend cards
- Shows friend's preferences (languages, genres)
- "Recommend Movie" button for each friend
- Remove friend option
- Empty state when no friends

#### 2. Requests Tab
- **Received Requests**: Green badges, Accept/Reject buttons
- **Sent Requests**: Yellow badges, Pending status
- Clear separation between incoming and outgoing requests

#### 3. Recommendations Tab
- **Recommendations for You**: 
  - Pink badges for new/unseen
  - Personal message display
  - Comment threads (collapsible)
  - Reply functionality
- **Your Recommendations**: 
  - Shows sent recommendations
  - Seen/Pending status

### Comment System
- Nested comment threads
- User avatars with color gradients
- Timestamps for all comments
- Reply-to functionality
- Real-time updates

## User Flow Examples

### Adding a Friend
1. Go to Friends page
2. Type friend's name or email in search bar
3. Click "Add Friend" button
4. Friend receives request in Requests tab
5. Friend accepts/rejects
6. Both users see each other in Friends tab

### Recommending a Movie
1. Go to Friends tab
2. Click "Recommend Movie" on a friend's card
3. (Future: Select movie from search page)
4. Add optional personal message
5. Click "Send Recommendation"
6. Friend sees it in Recommendations tab

### Commenting on a Recommendation
1. Go to Recommendations tab
2. Click "Comments" button on a recommendation
3. Type comment in text area
4. Click send button
5. Comment appears in thread
6. Click "Reply" to respond to specific comments

## Security Features

- ✅ Session-based authentication required for all endpoints
- ✅ User can only respond to friend requests sent to them
- ✅ User can only cancel friend requests they sent
- ✅ User can only comment on recommendations they're part of
- ✅ User can only send recommendations to accepted friends
- ✅ User can only remove their own friends

## Logging

All friend-related actions are logged with context:
- `FRIENDS_SEARCH` - User search operations
- `FRIEND_REQUESTS` - Request send/accept/reject/cancel
- `FRIENDS` - Friends list operations
- `FRIEND_RECOMMENDATIONS` - Movie recommendation operations
- `RECOMMENDATION_COMMENTS` - Comment operations

Each log includes:
- User IDs and names
- Action taken
- Result (success/error)
- Relevant metadata

## Future Enhancements

- [ ] Integrate movie card "Share with Friend" button
- [ ] Add notification system for friend requests/recommendations
- [ ] Movie recommendation feed/timeline
- [ ] Group movie watch parties
- [ ] Friend activity feed
- [ ] Block/unblock users
- [ ] Private messaging
- [ ] Movie watch history comparison

## Testing

To test the friends system:

1. **Create Multiple Accounts**: Sign up with different emails
2. **Search for Users**: Use search bar to find other users
3. **Send Friend Requests**: Add friends and verify they receive requests
4. **Accept Requests**: Log in as different user and accept
5. **Recommend Movies**: Use placeholder form to test flow
6. **Add Comments**: Create conversation threads

## Integration Points

The friends system integrates with:
- **Authentication**: NextAuth session management
- **Database**: PostgreSQL with Prisma ORM
- **Logging**: Centralized logging system
- **UI**: Shadcn/ui components with Framer Motion animations

## Notes

- Friend relationships are bidirectional (one Friendship record per pair)
- Movie recommendations include full comment history
- Comments support unlimited nesting (threaded replies)
- All timestamps are stored in UTC
- User search excludes current user automatically

