import * as authSchema from "./auth.schema";
import * as apiSchema from "./api.schema";

// Combine all schemas here for migrations
export const schema = {
    ...authSchema,
    ...apiSchema,
} as const;
