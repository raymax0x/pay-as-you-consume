# Coding Rules for Our DeFi Backend (Node.js + Express + TypeScript)

## 1. Keep files small and focused
- **1 file = 1 clear responsibility**
- Example: `session/controller.ts` only handles request/response, no business logic
- **Aim for ~50–100 lines per file**

## 2. Use controllers, but keep them thin
Controllers = glue between route and service.
They never calculate anything, only:
- Validate request (using Zod)
- Call the right service function
- Send response with proper HTTP status

**Example:**
```typescript
export const startSession = async (req: Request, res: Response) => {
  const params = startSessionSchema.parse(req.body);
  const result = await sessionService.startSession(params);

  if (!result.success) {
    return sendError(res, result.error!, result.statusCode || 400);
  }

  sendSuccess(res, result.data, 201);
}
```

## 3. Services do the real work
Business logic lives here:
- Start/stop sessions
- Calculate costs
- Manage blockchain interactions
- Database operations

Should be functional, no classes unless necessary.
Each function does 1 thing only.

## 4. Pure functions for calculations
No side effects, no logging in calculation functions.

Example: `calculateCost(fullPrice, totalDuration, activeDuration) → string`

This makes them easy to test in isolation.

## 5. Validation at the edge (Zod)
Validate once in controller using Zod schemas.
Don't validate again in service.
Keep invalid requests out early.

Example:
```typescript
const startSessionSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  contentId: z.string().min(1).max(100)
});
```

## 6. Config from .env only
No magic numbers in code.
Use a single `config.ts` file to read `process.env`.

Example: `PORT`, `RPC_URL`, `NETWORK_ID`

## 7. Types everywhere
Define types/interfaces in `types.ts`.
Use them consistently:
- `SessionData`
- `ServiceResult<T>`
- `UserBalance`

Avoid `any`.

## 8. Error handling = simple + JSON
Don't overcomplicate error classes.
Just return `{ success: false, error: "message" }` with proper status code.

Example:
```typescript
res.status(400).json({
  error: "Validation Error",
  message: "Invalid address format",
  timestamp: new Date().toISOString()
})
```

## 9. Logs = useful, not noisy
Log only key lifecycle events:
- "Server started on port …"
- "Session started successfully"
- "Payment processed"

Don't log every single function call.

## 10. 🧹 Group by feature, not by layer
Instead of `/routes`, `/controllers`, `/services` folders…
👉 Use feature folders:

```
src/
├─ server.ts
├─ config.ts
├─ types.ts
└─ session/
    ├─ routes.ts
    ├─ controller.ts
    └─ service.ts
└─ user/
    ├─ routes.ts
    ├─ controller.ts
    └─ service.ts
```

When new features (vault management, analytics) come, they get their own folder.
That way, files stay small and scoped.

## 11. ⚡ Use functional style over classes
Instead of class-based services, just export functions:

```typescript
export const startSession = (...) => { ... }
export const getUserBalance = (...) => { ... }
```

Simple, stateless functions are easier to read + test.

## 12. 🗂 Keep the structure shallow at first
Don't over-engineer with too many folders.

Use this document as a reference every time we add or code new features to maintain consistency and code quality.

## Applied Rules Summary:

✅ **Small focused files** - Each file has one clear responsibility
✅ **Thin controllers** - Only handle request/response, use Zod for validation
✅ **Functional services** - Pure functions, no classes
✅ **Validation at edge** - Zod schemas in controllers
✅ **Centralized config** - Single config.ts with all environment variables
✅ **Feature-based structure** - session/, user/, content/ folders
✅ **Simple error handling** - JSON responses with proper status codes
✅ **Useful logging** - Key events only, not noisy
✅ **TypeScript everywhere** - Strong typing with shared types.ts
✅ **Functional style** - Functions over classes where possible