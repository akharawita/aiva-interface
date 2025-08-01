// Test script to verify that participant joining triggers real-time SSE updates for the owner
import { EventSource } from 'eventsource';

async function testJoinRealtime() {
    console.log('🧪 Testing participant join real-time updates...');
    
    try {
        // Step 1: Create a session as owner
        console.log('📝 Creating session as owner...');
        const createResponse = await fetch('http://localhost:3000/planning-poker/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ownerName=Owner&sessionName=Join Test&description=Testing join broadcasts'
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
        
        // Step 2: Set up SSE connection as the owner to monitor updates
        console.log('🔗 Setting up SSE connection for owner...');
        let sseMessages = [];
        let connectionEstablished = false;
        
        const eventSource = new EventSource(`http://localhost:3000/planning-poker/sse/${sessionCode}`);
        
        eventSource.onopen = () => {
            console.log('✅ Owner SSE connection established!');
            connectionEstablished = true;
        };
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Owner received SSE message:', data.type || 'update', 'at', new Date().toLocaleTimeString());
                if (data.type) {
                    console.log('   Event type:', data.type);
                    console.log('   Participant count:', data.participantCount || data.participants?.length);
                    if (data.participantName) {
                        console.log('   Participant name:', data.participantName);
                    }
                }
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
        
        console.log('⏳ Waiting 2 seconds before participant joins...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Have a participant join the session
        console.log('👥 Participant joining session...');
        const joinResponse = await fetch('http://localhost:3000/planning-poker/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `participantName=NewParticipant&sessionCode=${sessionCode}`
        });
        
        if (!joinResponse.ok) {
            throw new Error(`Participant join failed: ${joinResponse.status}`);
        }
        
        console.log('✅ Participant joined session!');
        
        // Wait for SSE broadcast
        console.log('⏳ Waiting for owner to receive join notification via SSE (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check results
        console.log('\n📊 Join Real-time Test Results:');
        console.log(`   - Owner SSE connection established: ${connectionEstablished ? '✅' : '❌'}`);
        console.log(`   - Messages received by owner: ${sseMessages.length}`);
        
        if (sseMessages.length > 0) {
            const joinMessage = sseMessages.find(msg => msg.type === 'participant_joined');
            if (joinMessage) {
                console.log('✅ Participant join broadcast received by owner via SSE!');
                console.log('   - New participant name:', joinMessage.participantName);
                console.log('   - New participant count:', joinMessage.participantCount);
            } else {
                console.log('❌ No participant_joined message received by owner via SSE');
                console.log('   - Received message types:', sseMessages.map(m => m.type || 'unknown'));
            }
            
            // Check if participant count increased
            const latestMessage = sseMessages[sseMessages.length - 1];
            const participantCount = latestMessage.participantCount || latestMessage.participants?.length || 0;
            console.log('   - Current participant count in latest message:', participantCount);
        } else {
            console.log('❌ No SSE messages received by owner at all');
        }
        
        // Clean up
        eventSource.close();
        
        return {
            success: connectionEstablished && sseMessages.length > 0,
            messagesReceived: sseMessages.length,
            joinMessageReceived: sseMessages.some(msg => msg.type === 'participant_joined')
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false, error: error.message };
    }
}

testJoinRealtime();