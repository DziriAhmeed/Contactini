# Contactini - Real-Time Chat Application

A modern, feature-rich chat application built with React Native and Supabase. Contactini provides a seamless messaging experience with real-time updates, user presence tracking, and multimedia support.

## Key Features

- 💬 Real-time messaging
- 👥 Individual and group chats
- 🟢 Online/offline user status
- ✔️ Message read receipts
- 📷 Image and file sharing
- ⌨️ Typing indicators
- 🔒 Secure authentication
- 🌓 Dark/Light theme support

## Technology Stack

- React Native with Expo
- Supabase (Backend + Real-time)
- TypeScript
- Zustand (State Management)

## Getting Started

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/contactini.git
   cd contactini
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory:

   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server
   ```bash
   npx expo start
   ```

## Project Structure

```
contactini/
├── app/                   # Main application screens
│   ├── (auth)/           # Authentication screens
│   └── (tabs)/           # Main app tabs
├── components/           # Reusable components
├── constants/           # App constants and themes
├── lib/                # External service configurations
├── store/              # State management
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

## Features in Detail

### Authentication

- Email/Password signup and login
- Profile management
- Secure session handling

### Messaging

- Real-time message delivery
- Support for text, images, and files
- Message read receipts
- Typing indicators
- Online/offline status

### User Experience

- Smooth navigation
- Dark/Light theme support
- Responsive design
- Native platform features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
