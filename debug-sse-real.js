// Enhanced test to verify SSE broadcasting is working
import { EventSource } from 'eventsource';

async function testSSEFlow() {
    console.log('🧪 Testing complete SSE flow...');
    
    try {
        // Step 1: Create a session
        console.log('📝 Creating session...');
        const createResponse = await fetch('http://localhost:3000/planning-poker/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ownerName=TestOwner&sessionName=SSE Flow Test&description=Testing SSE Broadcasting'
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
        
        // Step 2: Join the session
        console.log('👥 Joining session...');
        const joinResponse = await fetch('http://localhost:3000/planning-poker/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `participantName=TestParticipant&sessionCode=${sessionCode}`
        });
        
        if (!joinResponse.ok) {
            throw new Error(`Failed to join session: ${joinResponse.status}`);
        }
        
        const joinUrl = joinResponse.url;
        const participantId = joinUrl.match(/participantId=([^&]+)/)?.[1];
        if (!participantId) {
            throw new Error('Could not extract participant ID');
        }
        console.log('✅ Joined session, participantId:', participantId);
        
        // Step 3: Set up SSE connection
        console.log('🔗 Setting up SSE connection...');
        let sseMessages = [];
        let connectionEstablished = false;
        
        const eventSource = new EventSource(`http://localhost:3000/planning-poker/sse/${sessionCode}`);
        
        eventSource.onopen = () => {
            console.log('✅ SSE connection established!');
            connectionEstablished = true;
        };
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 SSE message received:', data.type || 'update', 'at', new Date().toLocaleTimeString());
                console.log('   Data:', JSON.stringify(data, null, 2));
                sseMessages.push(data);
            } catch (e) {
                console.log('📨 Raw SSE message:', event.data);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('❌ SSE error:', error);
        };
        
        // Wait for connection to establish
        await new Promise(resolve => {
            const checkConnection = () => {
                if (connectionEstablished) {
                    resolve();
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
        
        console.log('⏳ Waiting 2 seconds before submitting vote...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 4: Submit a vote and check for SSE broadcast
        console.log('🗳️ Submitting vote...');
        const voteResponse = await fetch('http://localhost:3000/planning-poker/submit-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionCode: sessionCode,
                participantId: participantId,
                vote: '8'
            })
        });
        
        if (!voteResponse.ok) {
            throw new Error(`Vote submission failed: ${voteResponse.status}`);
        }
        
        console.log('✅ Vote submitted!');
        
        // Wait for SSE message
        console.log('⏳ Waiting for SSE broadcast (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check results
        console.log('\n📊 SSE Test Results:');
        console.log(`   - Connection established: ${connectionEstablished ? '✅' : '❌'}`);
        console.log(`   - Messages received: ${sseMessages.length}`);
        
        if (sseMessages.length > 0) {
            const voteMessage = sseMessages.find(msg => msg.type === 'vote_submitted');
            if (voteMessage) {
                console.log('✅ Vote broadcast received via SSE!');
                console.log('   - Participant name:', voteMessage.participantName);
                console.log('   - Vote count:', voteMessage.voteCount);
            } else {
                console.log('❌ No vote_submitted message received via SSE');
                console.log('   - Received messages:', sseMessages.map(m => m.type || 'unknown'));
            }
        } else {
            console.log('❌ No SSE messages received at all');
        }
        
        // Clean up
        eventSource.close();
        
        return {
            success: connectionEstablished && sseMessages.length > 0,
            messagesReceived: sseMessages.length,
            voteMessageReceived: sseMessages.some(msg => msg.type === 'vote_submitted')
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

testSSEFlow();