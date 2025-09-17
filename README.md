# College Chat Application

A full-stack MERN application for college students to connect and chat with their peers.

## Features

- User authentication with college email validation
- Real-time messaging with Socket.io
- User search and connection system
- Group chat functionality
- File sharing capabilities
- Responsive design

## Project Structure

\`\`\`
college-chat-app/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API and socket services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── config/            # Configuration files
│   ├── socket/            # Socket.io handlers
│   └── server.js          # Entry point
└── README.md
\`\`\`

## Setup Instructions

### Backend Setup
1. Navigate to server directory: `cd server`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your values
4. Start the server: `npm run dev`

### Frontend Setup
1. Navigate to client directory: `cd client`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Environment Variables

See `server/.env.example` for required environment variables.

## Technologies Used

### Frontend
- React 18
- Redux Toolkit
- React Router
- Socket.io Client
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io
- JWT Authentication
- Cloudinary (file uploads)
- bcryptjs (password hashing)
