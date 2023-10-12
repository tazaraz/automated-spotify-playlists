declare namespace Express {
    interface Request {
        user: {
            name: string
            id: string
        }
    }
}