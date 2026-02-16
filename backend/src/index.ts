import { User, UserRole } from '@samverka/shared';

export const handler = async (event: any) => {
    console.log("Hello from backend!");
    const u: User = {
        id: "1",
        email: "test@example.com",
        displayName: "Test User",
        role: UserRole.ADMIN,
        createdAt: new Date().toISOString()
    };
    return {
        statusCode: 200,
        body: JSON.stringify(u)
    };
};
