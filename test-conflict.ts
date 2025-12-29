// Example file with merge conflicts for testing VibeMerge

interface User {
    id: number;
    name: string;
    email?: string;
    role: 'administrator' | 'member' | 'visitor';
    createdAt: Date;
}

const API_VERSION = '2.0.0';
const BASE_URL = 'https://api.example.com/v2';
const TIMEOUT = 5000;

function greetUser(user: User): string {
    const roleLabel = {
        administrator: 'Admin',
        member: 'Member',
        visitor: 'Guest'
    };
    return `Welcome back, ${user.name}! Role: ${roleLabel[user.role]}`;
}

function validateEmail(email: string | undefined): boolean {
    if (!email) return true; // Optional email is valid
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
}

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

async function listUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const response = await fetch(`${BASE_URL}/users?page=${page}&limit=${limit}`);
    return await response.json();
}

// Cache for user data
const userCache = new Map<number, User>();
const CACHE_TTL = 60000; // 1 minute

// Main export
export { User, greetUser, validateEmail, getUserById, createUser, deleteUser, updateUser, listUsers };