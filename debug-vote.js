// Simple script to test vote submission and SSE broadcasting
async function testVoteFlow() {
    console.log('🧪 Testing complete vote flow...');
    
    try {
        // Step 1: Create a session
        console.log('📝 Creating session...');
        const createResponse = await fetch('http://localhost:3000/planning-poker/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ownerName=TestOwner&sessionName=Debug Session&description=Testing SSE'
        });
        
        if (createResponse.ok) {
            const url = createResponse.url;
            const sessionCode = url.match(/\/session\/([A-Z0-9]+)/)?.[1];
            console.log('✅ Session created:', sessionCode);
            
            if (sessionCode) {
                // Step 2: Join the session 
                console.log('👥 Joining session...');
                const joinResponse = await fetch('http://localhost:3000/planning-poker/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `participantName=TestParticipant&sessionCode=${sessionCode}`
                });
                
                if (joinResponse.ok) {
                    const joinUrl = joinResponse.url;
                    const participantId = joinUrl.match(/participantId=([^&]+)/)?.[1];
                    console.log('✅ Joined session, participantId:', participantId);
                    
                    if (participantId) {
                        // Step 3: Submit a vote
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
                        
                        if (voteResponse.ok) {
                            console.log('✅ Vote submitted - check server logs for SSE broadcasting!');
                        } else {
                            console.log('❌ Vote submission failed:', voteResponse.status);
                            const errorText = await voteResponse.text();
                            console.log('Error:', errorText);
                        }
                    }
                } else {
                    console.log('❌ Failed to join session:', joinResponse.status);
                }
            }
        } else {
            console.log('❌ Failed to create session:', createResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testVoteFlow();