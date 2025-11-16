import React, { useState } from 'react';
import { ChatVerseIcon } from './Icons';

interface SignInProps {
    onSignIn: (username: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
    const [username, setUsername] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSignIn(username);
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-800 text-white p-4">
            <div className="w-full max-w-sm p-8 space-y-8 bg-gray-900 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-500">
                <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-800 rounded-full">
                        <ChatVerseIcon className="w-12 h-12 text-blue-500" />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold text-gray-100">Welcome to ChatVerse</h1>
                    <p className="mt-2 text-gray-400">Sign in to continue to your conversations.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="sr-only">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter your username"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!username.trim()}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-transform duration-200 ease-in-out active:scale-95"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};
