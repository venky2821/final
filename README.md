# Merchandise Inventory Management

![Python](https://img.shields.io/badge/Python-3.8%2B-blue) ![React](https://img.shields.io/badge/React-17%2B-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 📋 Table of Contents
- [Overview](#overview)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [Notes](#notes)
- [Contributions](#contributions)
- [License](#license)
- [Testing](#testing)

## Overview
This project is a Merchandise Inventory Management application that includes a FastAPI backend and a React frontend. The application allows users to register, log in, and manage their passwords.

## Backend Setup

### Requirements
- Python 3.8+
- SQLite

### Installation
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## Frontend Setup

### Requirements
- Node.js
- npm

### Installation
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install the required npm packages:
   ```bash
   npm install
   ```
3. Run the React application:
   ```bash
   npm start
   ```

## Usage
- Access the application at `http://localhost:3000`.
- Use the application to register new users, log in, and change passwords.

## Notes
- Ensure the backend server is running before accessing the frontend application.
- The backend uses SQLite for data storage, with tables created automatically on startup.

## Contributions
Feel free to fork this repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## Testing

### Running Tests
To run the unit tests for the backend functionalities, navigate to the root directory and execute:

```bash
pytest Testing/test_login.py
```

### Test Coverage
The tests cover the following functionalities:
- **Login**: Tests for successful login and login failure with incorrect credentials.
- **Registration**: Tests for successful user registration and failure when using an existing email.
- **Change Password**: Tests for successful password change using a valid reset token and failure with an invalid token.

Ensure that the backend server is not running while executing these tests to avoid conflicts with the test database setup.

## License
This project is licensed under the MIT License.
