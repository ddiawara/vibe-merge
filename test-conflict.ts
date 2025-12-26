// Example file with merge conflicts for testing Git Merge Wizard

interface User {
    id: number;
    name: string;
    email?: string;
    role: 'administrator' | 'member' | 'visitor';
    createdAt: Date;
}


function greetUser(user: User): string {
}








// Main export
export { User, greetUser, validateEmail, getUserById, createUser, deleteUser, updateUser, listUsers };