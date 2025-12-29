// ===========================================
// VibeMerge Demo - Fichier de test pour screenshots
// ===========================================

import { UserService } from './services';

// Nouvelle configuration améliorée
const config = {
    apiUrl: 'https://api.example.com/v2',
    timeout: 10000,
    retries: 5,
    debug: true,
    cache: true
};

export async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`${config.apiUrl}/users/${id}`);
    return response.json();
}

// Simple logger
function log(message: string) {
    console.log(`[App] ${message}`);
}
// Advanced logger with levels
function log(level: 'info' | 'warn' | 'error', message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// Le reste du code sans conflit
export class Application {
    private userService: UserService;

    constructor() {
        this.userService = new UserService(config);
    }

    async start() {
        log('info', 'Application starting...');
        await this.userService.initialize();
        log('info', 'Application ready!');
    }
}