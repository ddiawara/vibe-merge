// Example file with merge conflicts for testing Git Merge Wizard

interface User {
    id: number;
    name: string;
    email?: string;
    role: 'administrator' | 'member' | 'visitor';
    createdAt: Date;
}

<<<<<<< HEAD
const API_VERSION = '1.0.0';
const BASE_URL = 'https://api.example.com';
=======
const API_VERSION = '2.0.0';
const BASE_URL = 'https://api.example.com/v2';
const TIMEOUT = 5000;
>>>>>>> feature/user-updates

function greetUser(user: User): string {
<<<<<<< HEAD
    return `Hello, ${user.name}! You are logged in as ${user.role}.`;
=======
    const roleLabel = {
        administrator: 'Admin',
        member: 'Member',
        visitor: 'Guest'
    };
    return `Welcome back, ${user.name}! Role: ${roleLabel[user.role]}`;
>>>>>>> feature/user-updates
}

<<<<<<< HEAD
function validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
=======
function validateEmail(email: string | undefined): boolean {
    if (!email) return true; // Optional email is valid
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
function getUserById(id: number): User | null {
    // Simple lookup
    return users.find(u => u.id === id) || null;
}
=======
async function getUserById(id: number): Promise<User | null> {
    try {
        const response = await fetch(`${BASE_URL}/users/${id}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
function createUser(name: string, email: string): User {
    return {
        id: Date.now(),
        name,
        email,
        role: 'member',
        createdAt: new Date()
    };
}
=======
async function createUser(data: Partial<User>): Promise<User> {
    const response = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            role: data.role || 'visitor',
            createdAt: new Date()
        })
    });
    return await response.json();
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
function deleteUser(id: number): boolean {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users.splice(index, 1);
    return true;
}
=======
async function deleteUser(id: number): Promise<boolean> {
    try {
        const response = await fetch(`${BASE_URL}/users/${id}`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch {
        return false;
    }
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
function updateUser(id: number, updates: Partial<User>): User | null {
    const user = getUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
}
=======
async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    try {
        const response = await fetch(`${BASE_URL}/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
function listUsers(): User[] {
    return [...users];
}
=======
async function listUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const response = await fetch(`${BASE_URL}/users?page=${page}&limit=${limit}`);
    return await response.json();
}
>>>>>>> feature/user-updates

<<<<<<< HEAD
const users: User[] = [];
=======
// Cache for user data
const userCache = new Map<number, User>();
const CACHE_TTL = 60000; // 1 minute
>>>>>>> feature/user-updates

// Main export
export { User, greetUser, validateEmail, getUserById, createUser, deleteUser, updateUser, listUsers };
