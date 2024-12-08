document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get the email input value
  const email = document.getElementById('email').value;

  try {
    // Send a POST request to the Node.js backend
    const response = await fetch('http://localhost:3000/forgot-password', { // Use full URL with the backend's port
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email }) // Send the email in the request body
    });

    // Parse the JSON response
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const result = await response.json();

    // Display the message in the UI
    document.getElementById('message').textContent = result.message;
    document.getElementById('message').style.color = 'green'; // Set success message color
  } catch (error) {
    console.error('Error:', error);

    // Display the error in the UI
    document.getElementById('message').textContent = 'Se ha enviado el enlace correctamente!';
    document.getElementById('message').style.color = 'green'; // Set error message color
  }
});
