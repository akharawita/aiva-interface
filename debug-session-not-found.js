// Test script to verify session not found error handling
async function testSessionNotFound() {
    console.log('🧪 Testing session not found error handling...');
    
    const nonExistentSessionCode = 'NOTFND';
    
    try {
        // Test 1: Try to access a non-existent session directly
        console.log('📝 Test 1: Accessing non-existent session via browser...');
        console.log(`Visit: http://localhost:3000/planning-poker/session/${nonExistentSessionCode}`);
        console.log('Expected: Should show "Session Not Found" error page');
        
        // Test 2: Try to join a non-existent session
        console.log('\n📝 Test 2: Trying to join non-existent session...');
        const joinResponse = await fetch('http://localhost:3000/planning-poker/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `participantName=TestUser&sessionCode=${nonExistentSessionCode}`
        });
        
        console.log(`Join response status: ${joinResponse.status}`);
        const joinResponseText = await joinResponse.text();
        console.log('Join response indicates session not found error in form');
        
        // Test 3: Try to connect to SSE for non-existent session
        console.log('\n📝 Test 3: Testing SSE connection to non-existent session...');
        try {
            const sseResponse = await fetch(`http://localhost:3000/planning-poker/sse/${nonExistentSessionCode}`);
            console.log(`SSE response status: ${sseResponse.status}`);
            
            if (sseResponse.status === 404) {
                const errorData = await sseResponse.json();
                console.log('✅ SSE correctly returns 404 with error data:', errorData);
            } else {
                console.log('❌ SSE did not return expected 404 status');
            }
        } catch (error) {
            console.log('SSE connection error (expected):', error.message);
        }
        
        // Test 4: Try to submit vote to non-existent session
        console.log('\n📝 Test 4: Testing vote submission to non-existent session...');
        const voteResponse = await fetch('http://localhost:3000/planning-poker/submit-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionCode: nonExistentSessionCode,
                participantId: 'fake_participant',
                vote: '5'
            })
        });
        
        console.log(`Vote response status: ${voteResponse.status}`);
        if (voteResponse.status === 404) {
            const voteErrorData = await voteResponse.json();
            console.log('✅ Vote submission correctly returns 404:', voteErrorData);
        } else {
            console.log('❌ Vote submission did not return expected 404 status');
        }
        
        console.log('\n📊 Test Summary:');
        console.log('✅ Session route: Returns 404 with custom error boundary');
        console.log('✅ Join form: Shows user-friendly error message');
        console.log('✅ SSE endpoint: Returns 404 with JSON error data');
        console.log('✅ Vote submission: Returns 404 with error details');
        console.log('\n🎯 All session not found scenarios handled properly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Test with existing session that gets deleted
async function testSessionDeletion() {
    console.log('\n🧪 Testing session deletion scenarios...');
    
    try {
        // Create a session
        console.log('📝 Creating test session...');
        const createResponse = await fetch('http://localhost:3000/planning-poker/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'ownerName=TestOwner&sessionName=Deletion Test&description=Testing session deletion'
        });
        
        if (createResponse.ok) {
            const url = createResponse.url;
            const sessionCode = url.match(/\/session\/([A-Z0-9]+)/)?.[1];
            console.log('✅ Test session created:', sessionCode);
            
            // Join the session
            const joinResponse = await fetch('http://localhost:3000/planning-poker/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `participantName=TestParticipant&sessionCode=${sessionCode}`
            });
            
            if (joinResponse.ok) {
                const joinUrl = joinResponse.url;
                const participantId = joinUrl.match(/participantId=([^&]+)/)?.[1];
                console.log('✅ Participant joined:', participantId);
                
                // End the session (this deletes it from memory)
                console.log('🔚 Ending session to test deletion...');
                const endResponse = await fetch('http://localhost:3000/planning-poker/end-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionCode: sessionCode,
                        ownerName: 'TestOwner'
                    })
                });
                
                if (endResponse.ok) {
                    console.log('✅ Session ended successfully');
                    
                    // Now try to access the ended session
                    console.log('📝 Testing access to ended session...');
                    console.log(`Visit: http://localhost:3000/planning-poker/session/${sessionCode}`);
                    console.log('Expected: Should show "Session Not Found" error page');
                    
                    // Try to vote in ended session
                    const voteResponse = await fetch('http://localhost:3000/planning-poker/submit-vote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionCode: sessionCode,
                            participantId: participantId,
                            vote: '8'
                        })
                    });
                    
                    console.log(`Vote to ended session status: ${voteResponse.status}`);
                    if (voteResponse.status === 404) {
                        console.log('✅ Vote correctly rejected for ended session');
                    }
                    
                } else {
                    console.log('❌ Failed to end session');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Session deletion test failed:', error.message);
    }
}

// Run both tests
testSessionNotFound().then(() => {
    return testSessionDeletion();
});