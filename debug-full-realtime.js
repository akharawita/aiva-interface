// Comprehensive test for all real-time SSE events
import { EventSource } from 'eventsource';

async function testFullRealtimeFlow() {
    console.log('🧪 Testing complete real-time flow...');
    
    try {
        // Step 1: Create a session as owner
        console.log('📝 Creating session as owner...');
        const createResponse = await fetch('http://localhost:3000/planning-poker/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ownerName=Owner&sessionName=Full Test&description=Complete realtime test'
        });
        
        if (!createResponse.ok) {
            throw new Error(`Failed to create session: ${createResponse.status}`);
        }
        
        const url = createResponse.url;
        const sessionCode = url.match(/\/session\/([A-Z0-9]+)/)?.[1];
        if (!sessionCode) {
            throw new Error('Could not extract session code');
        }
        console.log('✅ Session created:', sessionCode);
        
        // Step 2: Set up SSE connection for owner
        console.log('🔗 Setting up owner SSE connection...');
        let ownerMessages = [];
        let ownerConnected = false;
        
        const ownerEventSource = new EventSource(`http://localhost:3000/planning-poker/sse/${sessionCode}`);
        
        ownerEventSource.onopen = () => {
            console.log('✅ Owner SSE connected!');
            ownerConnected = true;
        };
        
        ownerEventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log(`📨 OWNER received: ${data.type || 'update'} (participants: ${data.participants?.length || 0})`);
                ownerMessages.push(data);
            } catch (e) {
                console.log('📨 OWNER raw message:', event.data);
            }
        };
        
        ownerEventSource.onerror = (error) => {
            console.error('❌ Owner SSE error:', error);
        };
        
        // Wait for owner connection
        await new Promise(resolve => {
            const checkConnection = () => {
                if (ownerConnected) {
                    resolve();
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
        
        console.log('⏳ Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Participant joins
        console.log('👥 Participant 1 joining...');
        const join1Response = await fetch('http://localhost:3000/planning-poker/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `participantName=Alice&sessionCode=${sessionCode}`
        });
        
        if (!join1Response.ok) {
            throw new Error(`Alice join failed: ${join1Response.status}`);
        }
        
        const join1Url = join1Response.url;
        const aliceId = join1Url.match(/participantId=([^&]+)/)?.[1];
        console.log('✅ Alice joined, ID:', aliceId);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Another participant joins
        console.log('👥 Participant 2 joining...');
        const join2Response = await fetch('http://localhost:3000/planning-poker/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `participantName=Bob&sessionCode=${sessionCode}`
        });
        
        if (!join2Response.ok) {
            throw new Error(`Bob join failed: ${join2Response.status}`);
        }
        
        const join2Url = join2Response.url;
        const bobId = join2Url.match(/participantId=([^&]+)/)?.[1];
        console.log('✅ Bob joined, ID:', bobId);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 5: Alice votes
        console.log('🗳️ Alice voting...');
        const aliceVoteResponse = await fetch('http://localhost:3000/planning-poker/submit-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionCode: sessionCode,
                participantId: aliceId,
                vote: '5'
            })
        });
        
        if (!aliceVoteResponse.ok) {
            throw new Error(`Alice vote failed: ${aliceVoteResponse.status}`);
        }
        console.log('✅ Alice voted!');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 6: Bob votes
        console.log('🗳️ Bob voting...');
        const bobVoteResponse = await fetch('http://localhost:3000/planning-poker/submit-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionCode: sessionCode,
                participantId: bobId,
                vote: '8'
            })
        });
        
        if (!bobVoteResponse.ok) {
            throw new Error(`Bob vote failed: ${bobVoteResponse.status}`);
        }
        console.log('✅ Bob voted!');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 7: Owner reveals votes
        console.log('👁️ Owner revealing votes...');
        const revealResponse = await fetch('http://localhost:3000/planning-poker/reveal-votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionCode: sessionCode,
                ownerName: 'Owner'
            })
        });
        
        if (!revealResponse.ok) {
            throw new Error(`Reveal votes failed: ${revealResponse.status}`);
        }
        console.log('✅ Votes revealed!');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Analyze results
        console.log('\n📊 Complete Real-time Test Results:');
        console.log(`   - Owner SSE connection: ${ownerConnected ? '✅' : '❌'}`);
        console.log(`   - Total messages received by owner: ${ownerMessages.length}`);
        
        const eventTypes = ownerMessages.map(m => m.type || 'initial').filter(Boolean);
        const eventCounts = eventTypes.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        
        console.log('   - Event types received:');
        Object.entries(eventCounts).forEach(([type, count]) => {
            console.log(`     • ${type}: ${count}`);
        });
        
        // Check for specific events
        const hasParticipantJoined = ownerMessages.some(m => m.type === 'participant_joined');
        const hasVoteSubmitted = ownerMessages.some(m => m.type === 'vote_submitted');
        const hasVotesRevealed = ownerMessages.some(m => m.type === 'votes_revealed');
        
        console.log('\n   - Required events:');
        console.log(`     • Participant joined: ${hasParticipantJoined ? '✅' : '❌'}`);
        console.log(`     • Vote submitted: ${hasVoteSubmitted ? '✅' : '❌'}`);
        console.log(`     • Votes revealed: ${hasVotesRevealed ? '✅' : '❌'}`);
        
        // Check final state
        const finalMessage = ownerMessages[ownerMessages.length - 1];
        console.log('\n   - Final state:');
        console.log(`     • Participants: ${finalMessage.participants?.length || 0}`);
        console.log(`     • Votes: ${finalMessage.voteCount || 0}`);
        console.log(`     • Votes revealed: ${finalMessage.votesRevealed ? '✅' : '❌'}`);
        
        const success = hasParticipantJoined && hasVoteSubmitted && hasVotesRevealed;
        console.log(`\n🎯 Overall test result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        // Clean up
        ownerEventSource.close();
        
        return { success, ownerMessages: ownerMessages.length, eventCounts };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

testFullRealtimeFlow();