declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                emailVerified: boolean;
                image?: string;
                role: "admin" | "teacher" | "student";
                imageCldPubId?: string;
                organizationId: string;
                // add any other fields you use
            };
        }
    }
}

export {};